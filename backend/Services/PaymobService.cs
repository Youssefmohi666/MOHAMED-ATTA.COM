using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace elmanassa.Services
{
    public class PaymobService : IPaymobService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PaymobService> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        // Paymob Unified Checkout base URL
        private const string PaymobIntentionUrl = "https://accept.paymob.com/v1/intention/";
        private const string PaymobCheckoutUrl = "https://accept.paymob.com/unifiedcheckout/";

        public PaymobService(
            AppDbContext context,
            IConfiguration configuration,
            ILogger<PaymobService> logger,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<PaymobPaymentResponseDTO> CreatePaymentAsync(Guid userId, PaymobCreatePaymentDTO dto)
        {
            // ── 1. Validate subject ──────────────────────────────────────────
            var subject = await _context.Subjects.FirstOrDefaultAsync(s => s.Id == dto.SubjectId)
                ?? throw new InvalidOperationException("SUBJECT_NOT_FOUND");

            // ── 2. Prevent duplicate enrollment ─────────────────────────────
            var alreadyEnrolled = await _context.Enrollments
                .AnyAsync(e => e.UserId == userId && e.SubjectId == dto.SubjectId);
            if (alreadyEnrolled)
                throw new InvalidOperationException("ALREADY_ENROLLED");

            // ── 3. Resolve user ──────────────────────────────────────────────
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw new InvalidOperationException("USER_NOT_FOUND");

            // ── 4. Apply coupon if provided ──────────────────────────────────
            decimal subtotal = subject.Price;
            decimal discount = 0;
            string? couponCode = null;

            if (!string.IsNullOrWhiteSpace(dto.CouponCode))
            {
                var coupon = await _context.Coupons
                    .FirstOrDefaultAsync(c => c.Code == dto.CouponCode && c.IsActive
                        && (c.ExpiresAt == null || c.ExpiresAt > DateTime.UtcNow));
                if (coupon != null)
                {
                    discount = subtotal * (coupon.DiscountPct / 100m);
                    couponCode = coupon.Code;
                }
            }

            decimal totalAmount = subtotal - discount;
            int amountCents = (int)(totalAmount * 100);

            // ── 5. Generate unique merchant reference ────────────────────────
            string merchantOrderId = $"ORD-{Guid.NewGuid():N}".Substring(0, 20).ToUpper();

            // ── 6. Persist Order (pending) ───────────────────────────────────
            var order = new Order
            {
                UserId = userId,
                SubjectId = dto.SubjectId,
                OrderNumber = merchantOrderId,
                Subtotal = subtotal,
                DiscountAmount = discount,
                TotalAmount = totalAmount,
                FinalPrice = totalAmount,
                OriginalPrice = subtotal,
                PaymentMethod = dto.PaymentMethod,
                PaymentStatus = "pending",
                BillingFullName = dto.BillingFullName,
                BillingEmail = dto.BillingEmail ?? user.Email,
                BillingPhone = dto.BillingPhone ?? user.PhoneNumber,
                CouponCode = couponCode,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Orders.Add(order);

            // ── 7. Persist PaymentTransaction (pending) ──────────────────────
            var transaction = new PaymentTransaction
            {
                MerchantOrderId = merchantOrderId,
                OrderId = order.Id,
                UserId = userId,
                Amount = totalAmount,
                Currency = "EGP",
                PaymentMethod = dto.PaymentMethod,
                Status = "pending",
                CreatedAt = DateTime.UtcNow
            };
            _context.PaymentTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            // ── 8. Read Paymob config ────────────────────────────────────────
            string secretKey = _configuration["Paymob:SecretKey"]
                ?? throw new InvalidOperationException("Paymob:SecretKey not configured");
            string publicKey = _configuration["Paymob:PublicKey"]
                ?? throw new InvalidOperationException("Paymob:PublicKey not configured");
            int integrationId = GetIntegrationId(dto.PaymentMethod);

            // ── 9. Split billing name ────────────────────────────────────────
            var nameParts = (dto.BillingFullName ?? user.Name ?? "Guest User").Split(' ', 2);
            string firstName = nameParts[0];
            string lastName = nameParts.Length > 1 ? nameParts[1] : "User";

            // ── 10. Build Paymob intention payload ───────────────────────────
            var intentionPayload = new
            {
                amount = amountCents,
                currency = "EGP",
                payment_methods = new[] { integrationId },
                billing_data = new
                {
                    apartment = "N/A",
                    first_name = firstName,
                    last_name = lastName,
                    street = "N/A",
                    building = "N/A",
                    phone_number = dto.BillingPhone ?? user.PhoneNumber ?? "N/A",
                    country = "EG",
                    email = dto.BillingEmail ?? user.Email,
                    floor = "N/A",
                    state = "N/A",
                    city = "Cairo"
                },
                items = new[]
                {
                    new
                    {
                        name = subject.Name,
                        amount = amountCents,
                        description = $"Enrollment in subject: {subject.Name}",
                        quantity = 1
                    }
                },
                customer = new
                {
                    first_name = firstName,
                    last_name = lastName,
                    email = dto.BillingEmail ?? user.Email
                },
                special_reference = merchantOrderId,
                merchant_order_id = merchantOrderId,
                expiration = 3600,
                notification_url = "https://mohamed-atta.com/api/v1/payment/webhook",
                redirect_url = "https://mohamed-atta.com/api/v1/payment/callback"
            };

            // ── 11. Call Paymob Intention API ────────────────────────────────
            var httpClient = _httpClientFactory.CreateClient("Paymob");
            var request = new HttpRequestMessage(HttpMethod.Post, PaymobIntentionUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Token", secretKey);
            request.Content = JsonContent.Create(intentionPayload);

            HttpResponseMessage response;
            try
            {
                response = await httpClient.SendAsync(request);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Network error calling Paymob Intention API for order {OrderId}", order.Id);
                throw new InvalidOperationException("PAYMENT_GATEWAY_UNAVAILABLE");
            }

            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Paymob Intention API failed [{Status}]: {Body}", response.StatusCode, responseBody);
                throw new InvalidOperationException($"PAYMENT_GATEWAY_ERROR: {response.StatusCode}");
            }

            // ── 12. Extract client_secret ────────────────────────────────────
            using var doc = JsonDocument.Parse(responseBody);
            string clientSecret = doc.RootElement.GetProperty("client_secret").GetString()
                ?? throw new InvalidOperationException("Paymob response missing client_secret");

            string redirectUrl = $"{PaymobCheckoutUrl}?publicKey={publicKey}&clientSecret={clientSecret}";

            _logger.LogInformation("Payment intention created for order {OrderId}, merchant ref {Ref}",
                order.Id, merchantOrderId);

            return new PaymobPaymentResponseDTO
            {
                OrderId = order.Id,
                OrderNumber = order.OrderNumber,
                RedirectUrl = redirectUrl,
                Amount = totalAmount,
                Currency = "EGP"
            };
        }

        public async Task ProcessServerCallbackAsync(JsonElement payload, string receivedHmac)
        {
            string secret = _configuration["Paymob:HMAC"]
                ?? throw new InvalidOperationException("Paymob:HMAC not configured");

            // ── 1. Extract obj ───────────────────────────────────────────────
            if (!payload.TryGetProperty("obj", out var obj))
                throw new ArgumentException("Missing 'obj' in payload");

            // ── 2. Build HMAC string ─────────────────────────────────────────
            string[] fields =
            {
                "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction",
                "id", "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded",
                "is_standalone_payment", "is_voided", "order.id", "owner", "pending",
                "source_data.pan", "source_data.sub_type", "source_data.type", "success"
            };

            var sb = new StringBuilder();
            foreach (var field in fields)
            {
                var parts = field.Split('.');
                var current = obj;
                bool found = true;
                foreach (var part in parts)
                {
                    if (current.ValueKind == JsonValueKind.Object && current.TryGetProperty(part, out var next))
                        current = next;
                    else { found = false; break; }
                }

                if (!found || current.ValueKind == JsonValueKind.Null)
                    sb.Append("");
                else if (current.ValueKind is JsonValueKind.True or JsonValueKind.False)
                    sb.Append(current.GetBoolean() ? "true" : "false");
                else
                    sb.Append(current.ToString());
            }

            // ── 3. Verify HMAC ───────────────────────────────────────────────
            string calculated = ComputeHmacSHA512(sb.ToString(), secret);
            if (!receivedHmac.Equals(calculated, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Paymob server callback HMAC mismatch. Received: {R} Calculated: {C}",
                    receivedHmac, calculated);
                throw new UnauthorizedAccessException("HMAC_MISMATCH");
            }

            // ── 4. Extract fields ────────────────────────────────────────────
            string? merchantOrderId = null;
            if (obj.TryGetProperty("order", out var orderEl) &&
                orderEl.TryGetProperty("merchant_order_id", out var moid) &&
                moid.ValueKind != JsonValueKind.Null)
                merchantOrderId = moid.GetString();

            string? paymobTxId = obj.TryGetProperty("id", out var txId) ? txId.ToString() : null;
            bool isSuccess = obj.TryGetProperty("success", out var successEl) && successEl.GetBoolean();
            string rawPayload = payload.GetRawText();

            if (string.IsNullOrEmpty(merchantOrderId))
            {
                _logger.LogWarning("Paymob callback missing merchant_order_id, skipping DB update.");
                return;
            }

            // ── 5. Update DB ─────────────────────────────────────────────────
            var transaction = await _context.PaymentTransactions
                .FirstOrDefaultAsync(t => t.MerchantOrderId == merchantOrderId);

            if (transaction == null)
            {
                _logger.LogWarning("No PaymentTransaction found for merchant_order_id {Ref}", merchantOrderId);
                return;
            }

            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == transaction.OrderId);
            if (order == null)
            {
                _logger.LogWarning("No Order found for transaction {TxId}", transaction.Id);
                return;
            }

            transaction.PaymobTransactionId = paymobTxId;
            transaction.RawCallbackPayload = rawPayload;
            transaction.UpdatedAt = DateTime.UtcNow;

            if (isSuccess)
            {
                transaction.Status = "success";
                order.PaymentStatus = "completed";
                order.UpdatedAt = DateTime.UtcNow;

                // Create enrollment if not already exists
                bool enrolled = await _context.Enrollments
                    .AnyAsync(e => e.UserId == order.UserId && e.SubjectId == order.SubjectId);

                if (!enrolled && order.SubjectId.HasValue)
                {
                    _context.Enrollments.Add(new Enrollment
                    {
                        UserId = order.UserId,
                        SubjectId = order.SubjectId,
                        EnrolledAt = DateTime.UtcNow
                    });
                }

                // Auto-create AccountingTransaction for the teacher
                await CreateAccountingEntryAsync(order, transaction);

                _logger.LogInformation("Payment SUCCESS for order {OrderId}, ref {Ref}", order.Id, merchantOrderId);
            }
            else
            {
                transaction.Status = "failed";
                order.PaymentStatus = "failed";
                order.UpdatedAt = DateTime.UtcNow;
                _logger.LogWarning("Payment FAILED for order {OrderId}, ref {Ref}", order.Id, merchantOrderId);
            }

            await _context.SaveChangesAsync();
        }

        public string ComputeHmacSHA512(string data, string secret)
        {
            var keyBytes = Encoding.UTF8.GetBytes(secret);
            var dataBytes = Encoding.UTF8.GetBytes(data);
            using var hmac = new HMACSHA512(keyBytes);
            return BitConverter.ToString(hmac.ComputeHash(dataBytes)).Replace("-", "").ToLower();
        }

        // ── Auto-create accounting entry on successful payment ────────────────

        private async Task CreateAccountingEntryAsync(Order order, PaymentTransaction transaction)
        {
            try
            {
                // Avoid duplicate entries for the same order
                bool exists = await _context.AccountingTransactions
                    .AnyAsync(a => a.Id == $"pay_{order.Id}");
                if (exists) return;

                // Resolve subject + teacher
                var subject = order.SubjectId.HasValue
                    ? await _context.Subjects.FirstOrDefaultAsync(s => s.Id == order.SubjectId.Value)
                    : null;

                Guid? teacherId = subject?.TeacherId;

                // Resolve student name
                var student = await _context.Users.FirstOrDefaultAsync(u => u.Id == order.UserId);
                string studentName = student?.Name ?? order.BillingFullName ?? "طالب";

                // Detect currency from amount — Paymob is EGP, but check order currency
                string currency = transaction.Currency?.ToUpper() == "EGP" ? "EGP" : "SAR";

                // Detect service type from subject title
                string service = "أخرى";
                if (subject != null)
                {
                    var title = subject.Name?.ToLower() ?? "";
                    if (title.Contains("قدرات") && title.Contains("تحصيلي")) service = "قدرات + تحصيلي";
                    else if (title.Contains("قدرات")) service = "قدرات";
                    else if (title.Contains("تحصيلي")) service = "تحصيلي";
                    else if (title.Contains("اشتراك")) service = "اشتراك شهري";
                }

                var entry = new AccountingTransaction
                {
                    Id = $"pay_{order.Id}",
                    StudentName = studentName,
                    Date = order.CreatedAt.ToString("yyyy-MM-dd"),
                    Service = service,
                    Amount = order.FinalPrice > 0 ? order.FinalPrice : order.TotalAmount,
                    Currency = currency,
                    Type = "income",
                    InvoiceNumber = order.OrderNumber,
                    PaymentMethod = MapPaymentMethod(order.PaymentMethod),
                    ContactNumber = student?.PhoneNumber ?? order.BillingPhone,
                    Notes = subject != null ? $"دفع تلقائي — {subject.Name}" : "دفع تلقائي",
                    CreatedAt = DateTime.UtcNow,
                    TeacherId = teacherId
                };

                _context.AccountingTransactions.Add(entry);
                // SaveChanges is called by the caller after this method
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create accounting entry for order {OrderId}", order.Id);
                // Non-fatal — don't throw, payment already succeeded
            }
        }

        private static string MapPaymentMethod(string method) => method?.ToLower() switch
        {
            "card"   => "فيزا",
            "wallet" => "STC Pay",
            "bank"   => "تحويل بنكي",
            _        => "كاش"
        };

        // ── Private helpers ──────────────────────────────────────────────────

        private int GetIntegrationId(string paymentMethod)
        {
            string key = paymentMethod.ToLower() switch
            {
                "card" => "Paymob:CardIntegrationId",
                "wallet" => "Paymob:MobileIntegrationId",
                _ => throw new ArgumentException($"Unsupported payment method: {paymentMethod}")
            };

            string? value = _configuration[key];
            if (string.IsNullOrEmpty(value) || !int.TryParse(value, out int id))
                throw new InvalidOperationException($"{key} not configured or invalid");

            return id;
        }
    }
}
