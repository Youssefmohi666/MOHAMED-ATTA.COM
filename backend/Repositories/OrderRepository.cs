using elmanassa.ApplicationDbContext;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Repositories
{
    public class OrderRepository : IOrderRepository
    {
        private readonly AppDbContext _context;

        public OrderRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Course?> GetCourseAsync(int courseId)
        {
            return await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
        }

        public async Task<Coupon?> GetCouponAsync(string code)
        {
            return await _context.Coupons.FirstOrDefaultAsync(c => c.Code == code && c.IsActive);
        }

        public async Task AddOrderAsync(Order order)
        {
            await _context.Orders.AddAsync(order);
        }

        public async Task AddEnrollmentAsync(Enrollment enrollment)
        {
            await _context.Enrollments.AddAsync(enrollment);
        }

        public async Task<Order?> GetOrderAsync(Guid orderId, Guid userId)
        {
            return await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);
        }

        public async Task<List<Order>> GetUserOrdersAsync(Guid userId, int page = 1, int perPage = 10)
        {
            return await _context.Orders
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}