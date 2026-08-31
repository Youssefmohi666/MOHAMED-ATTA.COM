using elmanassa.ApplicationDbContext;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Repositories
{
    public class CourseRepository : ICourseRepository
    {
        private readonly AppDbContext _context;

        public CourseRepository(AppDbContext context)
        {
            _context = context;
        }

        public IQueryable<Subject> QueryPublished()
        {
            return _context.Subjects.Where(s => s.Status == "published");
        }

        public async Task<Subject?> GetByIdAsync(Guid id)
        {
            return await _context.Subjects
                .Include(s => s.Teacher)
                .Include(s => s.Levels)
                .ThenInclude(l => l.Lectures)
                .FirstOrDefaultAsync(s => s.Id == id && s.Status == "published");
        }

        public async Task<int> CountPublishedAsync()
        {
            return await _context.Subjects.Where(s => s.Status == "published").CountAsync();
        }

        public async Task<List<Review>> GetReviewsAsync(Guid subjectId, int page = 1, int perPage = 10)
        {
            return await _context.Reviews
                .Include(r => r.User)
                .Where(r => r.SubjectId == subjectId)
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync();
        }

        public async Task AddReviewAsync(Review review)
        {
            await _context.Reviews.AddAsync(review);
        }

        public async Task AddSubjectAsync(Subject subject)
        {
            await _context.Subjects.AddAsync(subject);
        }

        public async Task<Enrollment?> GetEnrollmentAsync(Guid userId, Guid subjectId)
        {
            return await _context.Enrollments
                .Include(e => e.User)
                .FirstOrDefaultAsync(e => e.UserId == userId && e.SubjectId == subjectId);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
