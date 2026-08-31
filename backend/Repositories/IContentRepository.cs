using elmanassa.DTOs;
using elmanassa.Models;

namespace elmanassa.Repositories
{
    public interface IContentRepository
    {
        Task<List<BlogPost>> GetPublishedBlogPostsAsync(int page = 1, int perPage = 10);
        Task<BlogPost?> GetBlogPostByIdAsync(int id);
        Task<int> CountPublishedBlogPostsAsync();
        Task<List<SubscriptionPlan>> GetActivePlansAsync();
        Task<List<Testimonial>> GetApprovedTestimonialsAsync(int page = 1, int perPage = 10);
        Task<StatisticsDTO> GetStatisticsAsync();
        Task SaveChangesAsync();
    }
}