using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Services
{
    public interface IOrderService
    {
        Task<OrderDTO?> CreateOrderAsync(Guid userId, OrderCreateDTO model);
        Task<OrderDTO?> GetOrderAsync(Guid orderId, Guid userId);
        Task<List<OrderDTO>> GetUserOrdersAsync(Guid userId, int page = 1, int perPage = 10);
        Task<CouponValidateResponseDTO?> ValidateCouponAsync(string code, decimal orderSubtotal);
        Task<CouponValidateResponseDTO?> ValidateCouponAsync(string code, int? courseId);
    }

    public class OrderService : IOrderService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<OrderService> _logger;

        public OrderService(AppDbContext context, ILogger<OrderService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<OrderDTO?> CreateOrderAsync(Guid userId, OrderCreateDTO model)
        {
            try
            {
                // Validate course exists
                var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == model.CourseId);
                if (course == null)
                {
                    _logger.LogWarning("Course {CourseId} not found", model.CourseId);
                    return null;
                }

                // Check if already enrolled
                var existingEnrollment = await _context.Enrollments
                    .FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == model.CourseId);
                if (existingEnrollment != null)
                {
                    _logger.LogWarning("User {UserId} already enrolled in course {CourseId}", userId, model.CourseId);
                    return null;
                }

                decimal subtotal = course.Price;
                decimal discount = 0;
                string? couponCode = null;

                // Validate coupon if provided
                if (!string.IsNullOrEmpty(model.CouponCode))
                {
                    var coupon = await _context.Coupons
                        .FirstOrDefaultAsync(c => c.Code == model.CouponCode && c.IsActive);
                    
                    if (coupon != null)
                    {
                        if (coupon.ExpiresAt == null || coupon.ExpiresAt > DateTime.UtcNow)
                        {
                            discount = subtotal * (coupon.DiscountPct / 100m);
                            couponCode = coupon.Code;
                        }
                    }
                }

                decimal totalAmount = subtotal - discount;

                // Create order
                var order = new Order
                {
                    UserId = userId,
                    CourseId = model.CourseId,
                    OrderNumber = "ORD-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper(),
                    Subtotal = subtotal,
                    DiscountAmount = discount,
                    TotalAmount = totalAmount,
                    PaymentMethod = model.PaymentMethod,
                    PaymentStatus = "pending",
                    BillingFullName = model.BillingFullName,
                    BillingEmail = model.BillingEmail,
                    BillingPhone = model.BillingPhone,
                    CouponCode = couponCode,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Orders.Add(order);

                // Create enrollment if payment method is not stripe (for immediate enrollment)
                if (model.PaymentMethod != "stripe")
                {
                    var enrollment = new Enrollment
                    {
                        UserId = userId,
                        CourseId = model.CourseId,
                        EnrolledAt = DateTime.UtcNow
                    };
                    _context.Enrollments.Add(enrollment);
                }

                await _context.SaveChangesAsync();

                return new OrderDTO
                {
                    Id = order.Id,
                    OrderNumber = order.OrderNumber,
                    CourseId = order.CourseId,
                    UserId = order.UserId,
                    Subtotal = order.Subtotal,
                    DiscountAmount = order.DiscountAmount,
                    TotalAmount = order.TotalAmount,
                    PaymentMethod = order.PaymentMethod,
                    PaymentStatus = order.PaymentStatus,
                    CreatedAt = order.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating order");
                return null;
            }
        }

        public async Task<OrderDTO?> GetOrderAsync(Guid orderId, Guid userId)
        {
            try
            {
                var order = await _context.Orders
                    .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);

                if (order == null)
                    return null;

                return new OrderDTO
                {
                    Id = order.Id,
                    OrderNumber = order.OrderNumber,
                    CourseId = order.CourseId,
                    UserId = order.UserId,
                    Subtotal = order.Subtotal,
                    DiscountAmount = order.DiscountAmount,
                    TotalAmount = order.TotalAmount,
                    PaymentMethod = order.PaymentMethod,
                    PaymentStatus = order.PaymentStatus,
                    CreatedAt = order.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching order");
                return null;
            }
        }

        public async Task<List<OrderDTO>> GetUserOrdersAsync(Guid userId, int page = 1, int perPage = 10)
        {
            try
            {
                var orders = await _context.Orders
                    .Where(o => o.UserId == userId)
                    .OrderByDescending(o => o.CreatedAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(o => new OrderDTO
                    {
                        Id = o.Id,
                        OrderNumber = o.OrderNumber,
                        CourseId = o.CourseId,
                        UserId = o.UserId,
                        Subtotal = o.Subtotal,
                        DiscountAmount = o.DiscountAmount,
                        TotalAmount = o.TotalAmount,
                        PaymentMethod = o.PaymentMethod,
                        PaymentStatus = o.PaymentStatus,
                        CreatedAt = o.CreatedAt
                    })
                    .ToListAsync();

                return orders;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user orders");
                return new List<OrderDTO>();
            }
        }

        public async Task<CouponValidateResponseDTO?> ValidateCouponAsync(string code, decimal orderSubtotal)
        {
            try
            {
                var coupon = await _context.Coupons
                    .FirstOrDefaultAsync(c => c.Code == code && c.IsActive);

                if (coupon == null || (coupon.ExpiresAt != null && coupon.ExpiresAt <= DateTime.UtcNow))
                    return null;

                decimal discount = orderSubtotal * (coupon.DiscountPct / 100m);

                return new CouponValidateResponseDTO
                {
                    Code = coupon.Code,
                    DiscountPercentage = coupon.DiscountPct,
                    DiscountAmount = discount,
                    FinalPrice = orderSubtotal - discount
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating coupon");
                return null;
            }
        }

        public async Task<CouponValidateResponseDTO?> ValidateCouponAsync(string code, int? courseId)
        {
            try
            {
                if (courseId == null)
                    return null;

                var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId.Value);
                if (course == null)
                    return null;

                return await ValidateCouponAsync(code, course.Price);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating coupon by course");
                return null;
            }
        }
    }
}
