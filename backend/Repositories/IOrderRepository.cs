using elmanassa.Models;

namespace elmanassa.Repositories
{
    public interface IOrderRepository
    {
        Task<Course?> GetCourseAsync(int courseId);
        Task<Coupon?> GetCouponAsync(string code);
        Task AddOrderAsync(Order order);
        Task AddEnrollmentAsync(Enrollment enrollment);
        Task<Order?> GetOrderAsync(Guid orderId, Guid userId);
        Task<List<Order>> GetUserOrdersAsync(Guid userId, int page = 1, int perPage = 10);
        Task SaveChangesAsync();
    }
}