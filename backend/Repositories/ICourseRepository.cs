using elmanassa.Models;

namespace elmanassa.Repositories
{
    public interface ICourseRepository
    {
        IQueryable<Subject> QueryPublished();
        Task<Subject?> GetByIdAsync(Guid id);
        Task<int> CountPublishedAsync();
        Task<List<Review>> GetReviewsAsync(Guid subjectId, int page = 1, int perPage = 10);
        Task AddReviewAsync(Review review);
        Task AddSubjectAsync(Subject subject);
        Task<Enrollment?> GetEnrollmentAsync(Guid userId, Guid subjectId);
        Task SaveChangesAsync();
    }
}
