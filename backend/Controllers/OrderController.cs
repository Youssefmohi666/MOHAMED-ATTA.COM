using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/orders")]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly ILogger<OrderController> _logger;

        public OrderController(IOrderService orderService, ILogger<OrderController> logger)
        {
            _orderService = orderService;
            _logger = logger;
        }

        private Guid GetUserId()
        {
            return Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
        }

        /// <summary>
        /// Create a new order
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "student")]
        public async Task<ActionResult<ApiResponse<OrderDTO>>> CreateOrder([FromBody] OrderCreateDTO model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse<object>(
                        "Invalid order data", "VALIDATION_ERROR", false));

                var userId = GetUserId();
                var order = await _orderService.CreateOrderAsync(userId, model);

                if (order == null)
                    return BadRequest(new ApiResponse<object>(
                        "Failed to create order", "ORDER_CREATION_FAILED", false));

                return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, 
                    new ApiResponse<OrderDTO>(order));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating order");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get order details
        /// </summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "student")]
        public async Task<ActionResult<ApiResponse<OrderDTO>>> GetOrder(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var order = await _orderService.GetOrderAsync(id, userId);

                if (order == null)
                    return NotFound(new ApiResponse<object>(
                        "Order not found", "ORDER_NOT_FOUND", false));

                return Ok(new ApiResponse<OrderDTO>(order));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching order");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get user's order history
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "student")]
        public async Task<ActionResult<ApiResponse<List<OrderDTO>>>> GetUserOrders(
            [FromQuery] int page = 1, 
            [FromQuery] int per_page = 10)
        {
            try
            {
                var userId = GetUserId();
                var orders = await _orderService.GetUserOrdersAsync(userId, page, per_page);

                return Ok(new ApiResponse<List<OrderDTO>>(orders));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching orders");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Validate coupon code
        /// </summary>
        [HttpPost("validate-coupon")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<CouponValidateResponseDTO>>> ValidateCoupon(
            [FromBody] CouponValidateDTO model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse<object>(
                        "Invalid coupon data", "VALIDATION_ERROR", false));

                var result = await _orderService.ValidateCouponAsync(model.Code, model.CourseId);

                if (result == null)
                    return NotFound(new ApiResponse<object>(
                        "Coupon not found or expired", "COUPON_NOT_FOUND", false));

                return Ok(new ApiResponse<CouponValidateResponseDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating coupon");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }
    }
}
