using Microsoft.EntityFrameworkCore;
using elmanassa.Models;
using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/payment")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymobService _paymobService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PaymentController> _logger;
        private readonly AppDbContext _context;

        public PaymentController(
            IPaymobService paymobService,
            IConfiguration configuration,
            ILogger<PaymentController> logger,
            AppDbContext context)
        {
            _paymobService = paymobService;
            _configuration = configuration;
            _logger = logger;
            _context = context;
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new UnauthorizedAccessException("User not authenticated"));

        // ── Shared accounting helper ──────────────────────────────────────────

        private async Task CreateAccountingEntryAsync(Order order, PaymentTransaction transaction)
        {
            try
            {
                bool exists = await _context.AccountingTransactions
                    .AnyAsync(a => a.Id == $"pay_{order.Id}");
                if (exists) return;

                var subject = order.SubjectId.HasValue
                    ? await _context.Subjects.FirstOrDefaultAsync(s => s.Id == order.SubjectId.Value)
                    : null;

                Guid? teacherId = subject?.TeacherId;
                var student = await _context.Users.FirstOrDefaultAsync(u => u.Id == order.UserId);
                string studentName = student?.Name ?? order.BillingFullName ?? "طالب";
                string currency = transaction.Currency?.ToUpper() == "EGP" ? "EGP" : "SAR";

                string service = "أخرى";
                if (subject != null)
                {
                    var title = subject.Name?.ToLower() ?? "";
                    if (title.Contains("قدرات") && title.Contains("تحصيلي")) service = "قدرات + تحصيلي";
                    else if (title.Contains("قدرات")) service = "قدرات";
                    else if (title.Contains("تحصيلي")) service = "تحصيلي";
                    else if (title.Contains("اشتراك")) service = "اشتراك شهري";
                }

                _context.AccountingTransactions.Add(new Models.AccountingTransaction
                {
                    Id = $"pay_{order.Id}",
                    StudentName = studentName,
                    Date = order.CreatedAt.ToString("yyyy-MM-dd"),
                    Service = service,
                    Amount = order.FinalPrice > 0 ? order.FinalPrice : order.TotalAmount,
                    Currency = currency,
                    Type = "income",
                    InvoiceNumber = order.OrderNumber,
                    PaymentMethod = transaction.PaymentMethod?.ToLower() switch
                    {
                        "card"   => "فيزا",
                        "wallet" => "STC Pay",
                        "bank"   => "تحويل بنكي",
                        _        => "كاش"
                    },
                    ContactNumber = student?.PhoneNumber ?? order.BillingPhone,
                    Notes = subject != null ? $"دفع تلقائي — {subject.Name}" : "دفع تلقائي",
                    CreatedAt = DateTime.UtcNow,
                    TeacherId = teacherId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create accounting entry for order {OrderId}", order.Id);
            }
        }

        /// <summary>
        /// Step 1 – Student initiates payment for a subject.
        /// Returns a Paymob unified checkout URL to redirect the user to.
        /// </summary>
        [HttpPost("create")]
        [Authorize(Roles = "student")]
        public async Task<IActionResult> CreatePayment([FromBody] PaymobCreatePaymentDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Invalid request data" });

            if (!dto.PaymentMethod.Equals("card", StringComparison.OrdinalIgnoreCase) &&
                !dto.PaymentMethod.Equals("wallet", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { success = false, message = "Payment method must be 'card' or 'wallet'" });

            try
            {
                var userId = GetUserId();
                var result = await _paymobService.CreatePaymentAsync(userId, dto);
                return Ok(new { success = true, data = result });
            }
            catch (InvalidOperationException ex) when (ex.Message == "SUBJECT_NOT_FOUND")
            {
                return NotFound(new { success = false, message = "Subject not found" });
            }
            catch (InvalidOperationException ex) when (ex.Message == "ALREADY_ENROLLED")
            {
                return Conflict(new { success = false, message = "Already enrolled in this subject" });
            }
            catch (InvalidOperationException ex) when (ex.Message == "PAYMENT_GATEWAY_UNAVAILABLE")
            {
                return StatusCode(503, new { success = false, message = "Payment gateway unavailable, please try again" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payment");
                return StatusCode(500, new { success = false, message = "An error occurred processing your payment" });
            }
        }

        /// <summary>
        /// Step 5 – Paymob redirects the user here after payment (GET callback).
        /// Validates HMAC then redirects to the React frontend success/failure page.
        /// Public endpoint — Paymob redirects the browser here, no JWT available.
        /// </summary>
        [HttpGet("callback"), HttpPost("callback")]
        [AllowAnonymous]
        public IActionResult Callback()
        {
            var query = Request.Query;

            string[] fields =
            {
                "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction",
                "id", "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded",
                "is_standalone_payment", "is_voided", "order", "owner", "pending",
                "source_data.pan", "source_data.sub_type", "source_data.type", "success"
            };

            var sb = new StringBuilder();
            foreach (var field in fields)
            {
                sb.Append(query.TryGetValue(field, out var val) ? val.ToString() : "");
            }

            string? receivedHmac = query["hmac"];
            string? hmacSecret = _configuration["Paymob:HMAC"];
                    string frontendUrl = (_configuration["App:FrontendUrl"] ?? "https://elanmassa.com").TrimEnd('/');

            if (string.IsNullOrEmpty(receivedHmac) || string.IsNullOrEmpty(hmacSecret))
            {
                _logger.LogWarning("Paymob GET callback missing HMAC or secret");
                return Redirect($"{frontendUrl}/payment-failed");
            }

            string calculated = _paymobService.ComputeHmacSHA512(sb.ToString(), hmacSecret);

            if (!receivedHmac.Equals(calculated, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Paymob GET callback HMAC mismatch");
                return Redirect($"{frontendUrl}/payment-failed");
            }

            bool.TryParse(query["success"], out bool isSuccess);
            string merchantRef = Uri.EscapeDataString(query["merchant_order_id"].ToString() ?? "");

            return isSuccess
                ? Redirect($"{frontendUrl}/payment-success?ref={merchantRef}")
                : Redirect($"{frontendUrl}/payment-failed?ref={merchantRef}");
        }

        /// <summary>
        /// Step 6 – Paymob server-to-server webhook (POST).
        /// Verifies HMAC and updates order/enrollment status in DB.
        /// This fires even if the user closes the browser.
        /// Public endpoint — called by Paymob servers, not by authenticated users.
        /// Security is enforced via HMAC-SHA512 signature verification.
        /// </summary>
        [HttpGet("webhook"), HttpPost("webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> Webhook([FromBody] JsonElement? payload = null)
        {
            string? receivedHmac = Request.Query["hmac"];
            string? merchantOrderId = Request.Query["merchant_order_id"];

            if (string.IsNullOrEmpty(receivedHmac))
            {
                _logger.LogWarning("Paymob webhook received without HMAC");
                return Unauthorized(new { message = "Missing HMAC" });
            }

            try
            {
                // If POST with body — server-to-server callback
                if (payload.HasValue && Request.Method == "POST")
                {
                    await _paymobService.ProcessServerCallbackAsync(payload.Value, receivedHmac);
                    return Ok();
                }

                // If GET — browser redirect from Paymob, process from query params
                if (!string.IsNullOrEmpty(merchantOrderId))
                {
                    bool.TryParse(Request.Query["success"], out bool isSuccess);
                    string txnResponse = Request.Query["txn_response_code"].ToString() ?? "";

                    var transaction = await _context.PaymentTransactions
                        .FirstOrDefaultAsync(t => t.MerchantOrderId == merchantOrderId);

                    if (transaction != null)
                    {
                        transaction.Status = isSuccess ? "success" : "failed";
                        transaction.RawCallbackPayload = Request.QueryString.ToString();
                        transaction.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();

                        // Create enrollment on success
                        if (isSuccess)
                        {
                            var order = await _context.Orders.FindAsync(transaction.OrderId);
                            if (order != null)
                            {
                                order.PaymentStatus = "completed";
                                var exists = await _context.Enrollments
                                    .AnyAsync(e => e.UserId == transaction.UserId && e.SubjectId == order.SubjectId);
                                if (!exists && order.SubjectId.HasValue)
                                {
                                    _context.Enrollments.Add(new Models.Enrollment
                                    {
                                        UserId = transaction.UserId,
                                        SubjectId = order.SubjectId.Value,
                                        EnrolledAt = DateTime.UtcNow
                                    });
                                }

                                // Auto-create accounting entry for the teacher
                                await CreateAccountingEntryAsync(order, transaction);

                                await _context.SaveChangesAsync();
                            }
                        }

                        _logger.LogInformation("Payment {Status} via GET redirect for order {OrderId}", transaction.Status, merchantOrderId);
                    }

                    // Redirect to frontend
            string frontendUrl = (_configuration["App:FrontendUrl"] ?? "https://elanmassa.com").TrimEnd('/');
                    return isSuccess
                        ? Redirect($"{frontendUrl}/payment-success?ref={Uri.EscapeDataString(merchantOrderId)}")
                        : Redirect($"{frontendUrl}/payment-failed?ref={Uri.EscapeDataString(merchantOrderId)}");
                }

                return Ok();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Invalid HMAC signature" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Paymob webhook");
                return StatusCode(500);
            }
        }
    }
}
