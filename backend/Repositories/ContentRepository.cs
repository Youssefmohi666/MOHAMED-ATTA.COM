using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Repositories
{
    public class ContentRepository : IContentRepository
    {
        private readonly AppDbContext _context;

        public ContentRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<BlogPost>> GetPublishedBlogPostsAsync(int page = 1, int perPage = 10)
        {
            return await _context.BlogPosts
                .Where(p => p.Status == "published")
                .OrderByDescending(p => p.PublishedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync();
        }

        public async Task<BlogPost?> GetBlogPostByIdAsync(int id)
        {
            return await _context.BlogPosts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
        }

        public async Task<int> CountPublishedBlogPostsAsync()
        {
            return await _context.BlogPosts.CountAsync(p => p.Status == "published");
        }

        public async Task<List<SubscriptionPlan>> GetActivePlansAsync()
        {
            return await _context.SubscriptionPlans.Where(p => p.IsActive).OrderBy(p => p.PriceMonthly).ToListAsync();
        }

        public async Task<List<Testimonial>> GetApprovedTestimonialsAsync(int page = 1, int perPage = 10)
        {
            return await _context.Testimonials
                .Where(t => t.IsActive)
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync();
        }

        public async Task<StatisticsDTO> GetStatisticsAsync()
        {
            var totalTeachers = await _context.Users.CountAsync(u => u.Role == "teacher");
            var totalStudents = await _context.Users.CountAsync(u => u.Role == "student");
            var totalCourses = await _context.Courses.CountAsync(c => c.Status == "published");
            var totalEnrollments = await _context.Enrollments.CountAsync();
            var totalSubjects = await _context.Subjects.CountAsync(s => s.Status == "published");

            var recentCourses = await _context.Subjects
                .Where(c => c.Status == "published")
                .OrderByDescending(c => c.CreatedAt)
                .Take(5)
                .ToListAsync();

            return new StatisticsDTO
            {
                TotalTeachers = totalTeachers,
                TotalStudents = totalStudents,
                TotalCourses = totalCourses,
                TotalEnrollments = totalEnrollments,
                TotalSubjects = totalSubjects,
                RecentCourses = recentCourses.Select(c => new CourseDTO
                {
                    Id = c.Id,
                    Title = c.Name,
                    Name = c.Name,
                    Description = c.Description,
                    Category = c.Category,
                    Duration = c.Duration,
                    Level = c.Level,
                    Language = c.Language,
                    Price = c.Price,
                    StudentsCount = c.StudentsCount,
                    Status = c.Status,
                    CreatedAt = c.CreatedAt
                }).ToList()
            };
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

    }
}
