using elmanassa.DTOs;
using elmanassa.Models;
using elmanassa.Repositories;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace elmanassa.Services
{
    public interface ICourseService
    {
        Task<List<CourseDTO>> GetCoursesAsync(string? category = null, string? level = null, string? search = null, int page = 1, int perPage = 12);
        Task<List<CourseDTO>> GetPopularCoursesAsync(int page = 1, int perPage = 12);
        Task<CourseDTO?> GetCourseByIdAsync(Guid id);
        Task<List<ReviewDTO>> GetCourseReviewsAsync(Guid subjectId, int page = 1, int perPage = 10);
        Task<ReviewDTO?> AddReviewAsync(Guid subjectId, Guid userId, ReviewCreateDTO dto);
        Task<CourseDTO> CreateSubjectAsync(Guid teacherId, SubjectCreateDTO dto);
        Task<int> GetCourseCountAsync();
        Task<InquiryDTO?> GetInquiryAsync(Guid id);
        Task<List<SeoSubjectDTO>> GetSeoSubjectsAsync();
    }

    public class CourseService : ICourseService
    {
        private readonly ICourseRepository _repo;

        public CourseService(ICourseRepository repo)
        {
            _repo = repo;
        }

        private static CourseDTO ToDto(Subject s)
        {
            return new CourseDTO
            {
                Id = s.Id,
                Title = s.Name,
                Name = s.Name,
                Description = s.Description,
                Category = s.Category,
                TeacherId = s.TeacherId,
                TeacherName = s.Teacher?.Name,
                Rating = 5,
                Duration = s.Duration,
                Level = s.Level,
                Language = s.Language,
                StudentsCount = s.StudentsCount,
                Price = s.Price,
                ImageUrl = s.ImageUrl,
                Icon = s.Icon,
                Status = s.Status,
                CreatedAt = s.CreatedAt,
                Levels = (s.Levels ?? new List<Level>()).Select(l => new LevelDTO
                {
                    Id = l.Id,
                    Name = l.Name,
                    SortOrder = l.SortOrder,
                    Lectures = (l.Lectures ?? new List<Lecture>()).Select(lec => new LectureDTO
                    {
                        Id = lec.Id,
                        Title = lec.Title,
                        Duration = lec.Duration,
                        VideoUrl = lec.VideoUrl,
                        SortOrder = lec.SortOrder
                    }).ToList()
                }).ToList()
            };
        }

        public async Task<List<CourseDTO>> GetCoursesAsync(string? category = null, string? level = null, string? search = null, int page = 1, int perPage = 12)
        {
            var query = _repo.QueryPublished().AsQueryable();

            if (!string.IsNullOrEmpty(category))
                query = query.Where(c => c.Category == category);

            if (!string.IsNullOrEmpty(level))
                query = query.Where(c => c.Level == level);

            if (!string.IsNullOrEmpty(search))
                query = query.Where(c => c.Name.Contains(search) || (c.Description != null && c.Description.Contains(search)));

            var subjects = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync();

            return subjects.Select(ToDto).ToList();
        }

        public async Task<List<CourseDTO>> GetPopularCoursesAsync(int page = 1, int perPage = 12)
        {
            var subjects = await _repo.QueryPublished()
                .OrderByDescending(c => c.StudentsCount)
                .ThenByDescending(c => c.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync();

            return subjects.Select(ToDto).ToList();
        }

        public async Task<CourseDTO?> GetCourseByIdAsync(Guid id)
        {
            var s = await _repo.GetByIdAsync(id);
            if (s == null || s.Status != "published") return null;

            return ToDto(s);
        }

        public async Task<InquiryDTO?> GetInquiryAsync(Guid id)
        {
            var s = await _repo.GetByIdAsync(id);
            if (s == null) return null;

            const string whatsAppNumber = "+966597750868";
            return new InquiryDTO
            {
                SubjectId = s.Id,
                SubjectTitle = s.Name,
                TeacherId = s.TeacherId,
                TeacherName = s.Teacher?.Name ?? "Teacher",
                WhatsAppNumber = whatsAppNumber,
                PreFormattedMessage =
                    $"Hello, I am interested in inquiring about the course: {s.Name}. How can I proceed with payment?"
            };
        }

        public async Task<List<ReviewDTO>> GetCourseReviewsAsync(Guid subjectId, int page = 1, int perPage = 10)
        {
            var reviews = await _repo.GetReviewsAsync(subjectId, page, perPage);
            return reviews.Select(r => new ReviewDTO
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.User?.Name ?? "Unknown",
                Rating = r.Rating,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt
            }).ToList();
        }

        public async Task<ReviewDTO?> AddReviewAsync(Guid subjectId, Guid userId, ReviewCreateDTO dto)
        {
            var enrollment = await _repo.GetEnrollmentAsync(userId, subjectId);
            if (enrollment == null)
                return null;

            var existing = (await _repo.GetReviewsAsync(subjectId)).FirstOrDefault(r => r.UserId == userId);
            if (existing != null)
                return null;

            var review = new Review
            {
                UserId = userId,
                SubjectId = subjectId,
                Rating = dto.Rating,
                Comment = dto.Comment,
                CreatedAt = DateTime.UtcNow
            };

            await _repo.AddReviewAsync(review);
            await _repo.SaveChangesAsync();

            var userName = enrollment.User?.Name ?? "Unknown";

            return new ReviewDTO
            {
                Id = review.Id,
                UserId = review.UserId,
                UserName = userName,
                Rating = review.Rating,
                Comment = review.Comment,
                CreatedAt = review.CreatedAt
            };
        }

        public async Task<CourseDTO> CreateSubjectAsync(Guid teacherId, SubjectCreateDTO dto)
        {
            var subject = new Subject
            {
                Id = Guid.NewGuid(),
                TeacherId = teacherId,
                Name = dto.Name ?? dto.Description ?? "Untitled",
                Description = dto.Description,
                Icon = dto.Icon ?? "📚",
                Status = "draft",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _repo.AddSubjectAsync(subject);
            await _repo.SaveChangesAsync();

            return ToDto(subject);
        }

        public async Task<int> GetCourseCountAsync()
        {
            return await _repo.CountPublishedAsync();
        }

        public async Task<List<SeoSubjectDTO>> GetSeoSubjectsAsync()
        {
            var subjects = await _repo.QueryPublished()
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return subjects.Select(s => new SeoSubjectDTO
            {
                Id = s.Id,
                Title = s.Name,
                Url = $"/subject/{s.Id}",
                LastMod = s.UpdatedAt.ToString("yyyy-MM-dd")
            }).ToList();
        }
    }
}
