using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Services
{
    public interface IContentService
    {
        Task<List<BlogPostDTO>> GetBlogPostsAsync(int page = 1, int perPage = 10);
        Task<BlogPostDTO?> GetBlogPostByIdAsync(int id);
        Task<int> GetBlogPostCountAsync();
        Task<List<SubscriptionPlanDTO>> GetSubscriptionPlansAsync();
        Task<List<TestimonialDTO>> GetTestimonialsAsync(int page = 1, int perPage = 10);
        Task<TestimonialDTO?> AddTestimonialAsync(Guid? userId, string? name, string content);
        Task<StatisticsDTO> GetStatisticsAsync();
    }

    public class ContentService : IContentService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ContentService> _logger;

        public ContentService(AppDbContext context, ILogger<ContentService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<BlogPostDTO>> GetBlogPostsAsync(int page = 1, int perPage = 10)
        {
            try
            {
                var posts = await _context.BlogPosts
                    .Where(p => p.Status == "published")
                    .OrderByDescending(p => p.PublishedAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(p => new BlogPostDTO
                    {
                        Id = p.Id,
                        Title = p.Title,
                        Content = p.Content,
                        ImageUrl = p.ImageUrl,
                        Category = p.Category,
                        Status = p.Status,
                        Views = p.Views,
                        CreatedAt = p.CreatedAt,
                        PublishedAt = p.PublishedAt
                    })
                    .ToListAsync();

                return posts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching blog posts");
                return new List<BlogPostDTO>();
            }
        }

        public async Task<BlogPostDTO?> GetBlogPostByIdAsync(int id)
        {
            try
            {
                var post = await _context.BlogPosts
                    .FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");

                if (post == null)
                    return null;

                // Increment views
                post.Views++;
                _context.BlogPosts.Update(post);
                await _context.SaveChangesAsync();

                return new BlogPostDTO
                {
                    Id = post.Id,
                    Title = post.Title,
                    Content = post.Content,
                    ImageUrl = post.ImageUrl,
                    Category = post.Category,
                    Status = post.Status,
                    Views = post.Views,
                    CreatedAt = post.CreatedAt,
                    PublishedAt = post.PublishedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching blog post");
                return null;
            }
        }

        public async Task<int> GetBlogPostCountAsync()
        {
            try
            {
                return await _context.BlogPosts.CountAsync(p => p.Status == "published");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error counting blog posts");
                return 0;
            }
        }

        public async Task<List<SubscriptionPlanDTO>> GetSubscriptionPlansAsync()
        {
            try
            {
                var plans = await _context.SubscriptionPlans
                    .Where(p => p.IsActive)
                    .OrderBy(p => p.Price)
                    .Select(p => new SubscriptionPlanDTO
                    {
                        Id = p.Id,
                        Name = p.Name,
                        Description = p.Description,
                        Price = p.Price,
                        DurationMonths = p.DurationMonths,
                        Features = p.Features,
                        IsActive = p.IsActive,
                        CreatedAt = p.CreatedAt
                    })
                    .ToListAsync();

                return plans;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching subscription plans");
                return new List<SubscriptionPlanDTO>();
            }
        }

        public async Task<List<TestimonialDTO>> GetTestimonialsAsync(int page = 1, int perPage = 10)
        {
            try
            {
                var testimonials = await _context.Testimonials
                    .Where(t => t.IsActive)
                    .OrderByDescending(t => t.CreatedAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(t => new TestimonialDTO
                    {
                        Id = t.Id,
                        UserId = t.UserId,
                        StudentName = t.StudentName,
                        JobTitle = t.JobTitle,
                        AvatarUrl = t.AvatarUrl,
                        Content = t.Content,
                        Rating = t.Rating,
                        IsApproved = t.IsActive,
                        CreatedAt = t.CreatedAt
                    })
                    .ToListAsync();

                return testimonials;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching testimonials");
                return new List<TestimonialDTO>();
            }
        }

        public async Task<TestimonialDTO?> AddTestimonialAsync(Guid? userId, string? name, string content)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(content)) return null;

                var t = new Testimonial
                {
                    UserId = userId,
                    UserName = string.IsNullOrWhiteSpace(name) ? "طالب" : name.Trim(),
                    Text = content.Trim(),
                    Role = "طالب",
                    Rating = 5,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Testimonials.Add(t);
                await _context.SaveChangesAsync();

                return new TestimonialDTO
                {
                    Id = t.Id,
                    UserId = t.UserId,
                    UserName = t.UserName,
                    StudentName = t.StudentName,
                    JobTitle = t.JobTitle,
                    AvatarUrl = t.AvatarUrl,
                    Role = t.Role,
                    Text = t.Text,
                    Content = t.Content,
                    Rating = t.Rating,
                    IsApproved = t.IsApproved,
                    CreatedAt = t.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding testimonial");
                return null;
            }
        }

        public async Task<StatisticsDTO> GetStatisticsAsync()
        {
            try
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
                    .Select(c => new CourseDTO
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
                    })
                    .ToListAsync();

                return new StatisticsDTO
                {
                    TotalTeachers = totalTeachers,
                    TotalStudents = totalStudents,
                    TotalCourses = totalCourses,
                    TotalEnrollments = totalEnrollments,
                    TotalSubjects = totalSubjects,
                    RecentCourses = recentCourses
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching statistics");
                return new StatisticsDTO
                {
                    TotalTeachers = 0,
                    TotalStudents = 0,
                    TotalCourses = 0,
                    TotalEnrollments = 0,
                    TotalSubjects = 0,
                    RecentCourses = new List<CourseDTO>()
                };
            }
        }
    }
}
