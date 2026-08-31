using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace elmanassa.Services
{
    public interface ITeacherService
    {
        Task<UserDTO?> GetProfileAsync(Guid teacherId);
        Task<UserDTO?> UpdateProfileAsync(Guid teacherId, UserUpdateDTO dto);
        Task<List<SubjectDTO>> GetTeacherSubjectsAsync(Guid teacherId);
        Task<SubjectDTO?> CreateSubjectAsync(Guid teacherId, SubjectCreateDTO dto);
        Task<SubjectDTO?> UpdateSubjectAsync(Guid subjectId, Guid teacherId, SubjectUpdateDTO dto);
        Task<bool> DeleteSubjectAsync(Guid subjectId, Guid teacherId);
        Task<bool> PublishSubjectAsync(Guid subjectId, Guid teacherId, string status);
        Task<TeacherStatsDTO?> GetTeacherStatsAsync(Guid teacherId);
        Task<List<StudentDTO>> GetTeacherStudentsAsync(Guid teacherId, string? search = null, int page = 1, int perPage = 20);
    }

    public class TeacherService : ITeacherService
    {
        private readonly AppDbContext _context;

        public TeacherService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<UserDTO?> GetProfileAsync(Guid teacherId)
        {
            var user = await _context.Users.FindAsync(teacherId);
            if (user == null) return null;

            return new UserDTO
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                NationalId = user.NationalId,
                AvatarUrl = user.AvatarUrl,
                Bio = user.Bio,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }

        public async Task<UserDTO?> UpdateProfileAsync(Guid teacherId, UserUpdateDTO dto)
        {
            var user = await _context.Users.FindAsync(teacherId);
            if (user == null) return null;

            if (!string.IsNullOrWhiteSpace(dto.Name))
                user.Name = dto.Name;
            if (dto.PhoneNumber != null)
                user.PhoneNumber = dto.PhoneNumber;
            if (dto.AvatarUrl != null)
                user.AvatarUrl = dto.AvatarUrl;
            if (dto.Bio != null)
                user.Bio = dto.Bio;

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new UserDTO
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                NationalId = user.NationalId,
                AvatarUrl = user.AvatarUrl,
                Bio = user.Bio,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }

        public async Task<List<SubjectDTO>> GetTeacherSubjectsAsync(Guid teacherId)
        {
            return await _context.Subjects
                .Where(s => s.TeacherId == teacherId)
                .Include(s => s.Levels)
                .ThenInclude(l => l.Lectures)
                .Select(s => new SubjectDTO
                {
                    Id = s.Id,
                    Name = s.Name,
                    Description = s.Description,
                    Icon = s.Icon,
                    StudentsCount = s.StudentsCount,
                    Status = s.Status,
                    CreatedAt = s.CreatedAt,
                    Levels = s.Levels.Select(l => new LevelDTO
                    {
                        Id = l.Id,
                        Name = l.Name,
                        SortOrder = l.SortOrder,
                        Lectures = l.Lectures.Select(lec => new LectureDTO
                        {
                            Id = lec.Id,
                            Title = lec.Title,
                            Duration = lec.Duration,
                            VideoUrl = lec.VideoUrl,
                            SortOrder = lec.SortOrder
                        }).ToList()
                    }).ToList()
                })
                .ToListAsync();
        }

        public async Task<SubjectDTO?> CreateSubjectAsync(Guid teacherId, SubjectCreateDTO dto)
        {
            var subject = new Subject
            {
                TeacherId = teacherId,
                Name = dto.Name,
                Description = dto.Description,
                Icon = dto.Icon,
                Status = "draft",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Subjects.Add(subject);

            if (dto.Levels != null && dto.Levels.Count > 0)
            {
                foreach (var levelDto in dto.Levels)
                {
                    var level = new Level
                    {
                        SubjectId = subject.Id,
                        Name = levelDto.Name,
                        SortOrder = levelDto.SortOrder,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Levels.Add(level);

                    if (levelDto.Lectures != null && levelDto.Lectures.Count > 0)
                    {
                        foreach (var lectureDto in levelDto.Lectures)
                        {
                            var lecture = new Lecture
                            {
                                LevelId = level.Id,
                                Title = lectureDto.Title,
                                Duration = lectureDto.Duration ?? "00:00",
                                VideoUrl = lectureDto.VideoUrl,
                                SortOrder = lectureDto.SortOrder,
                                CreatedAt = DateTime.UtcNow
                            };

                            _context.Lectures.Add(lecture);
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();

            return await GetSubjectDTOAsync(subject.Id);
        }

        public async Task<SubjectDTO?> UpdateSubjectAsync(Guid subjectId, Guid teacherId, SubjectUpdateDTO dto)
        {
            var subject = await _context.Subjects.FirstOrDefaultAsync(s => s.Id == subjectId && s.TeacherId == teacherId);

            if (subject == null)
                return null;

            if (!string.IsNullOrEmpty(dto.Name))
                subject.Name = dto.Name;

            if (!string.IsNullOrEmpty(dto.Description))
                subject.Description = dto.Description;

            if (!string.IsNullOrEmpty(dto.Icon))
                subject.Icon = dto.Icon;

            subject.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetSubjectDTOAsync(subjectId);
        }

        public async Task<bool> DeleteSubjectAsync(Guid subjectId, Guid teacherId)
        {
            var subject = await _context.Subjects.FirstOrDefaultAsync(s => s.Id == subjectId && s.TeacherId == teacherId);

            if (subject == null)
                return false;

            _context.Subjects.Remove(subject);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> PublishSubjectAsync(Guid subjectId, Guid teacherId, string status)
        {
            var subject = await _context.Subjects.FirstOrDefaultAsync(s => s.Id == subjectId && s.TeacherId == teacherId);

            if (subject == null)
                return false;

            subject.Status = status;
            subject.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<TeacherStatsDTO?> GetTeacherStatsAsync(Guid teacherId)
        {
            var subjects = await _context.Subjects.Where(s => s.TeacherId == teacherId).ToListAsync();
            var levels = await _context.Levels.Where(l => l.Subject.TeacherId == teacherId).ToListAsync();
            var lectures = await _context.Lectures.Where(l => l.Level.Subject.TeacherId == teacherId).ToListAsync();
            var totalStudents = await _context.Enrollments
                .Where(e => e.Subject != null && e.Subject.TeacherId == teacherId)
                .Select(e => e.UserId)
                .Distinct()
                .CountAsync();

            return new TeacherStatsDTO
            {
                TotalSubjects = subjects.Count,
                TotalStudents = totalStudents,
                TotalLectures = lectures.Count,
                PublishedCount = subjects.Count(s => s.Status == "published"),
                RecentActivities = new List<ActivityDTO>()
            };
        }

        public async Task<List<StudentDTO>> GetTeacherStudentsAsync(Guid teacherId, string? search = null, int page = 1, int perPage = 20)
        {
            var query = _context.Enrollments
                .Where(e => e.Subject != null && e.Subject.TeacherId == teacherId)
                .Select(e => e.User)
                .Distinct();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(u => u.Name.Contains(search));

            return await query
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .Select(u => new StudentDTO
                {
                    Id = u.Id,
                    Name = u.Name,
                    Email = u.Email,
                    AvatarUrl = u.AvatarUrl
                })
                .ToListAsync();
        }

        private async Task<SubjectDTO?> GetSubjectDTOAsync(Guid subjectId)
        {
            return await _context.Subjects
                .Where(s => s.Id == subjectId)
                .Include(s => s.Levels)
                .ThenInclude(l => l.Lectures)
                .Select(s => new SubjectDTO
                {
                    Id = s.Id,
                    Name = s.Name,
                    Description = s.Description,
                    Icon = s.Icon,
                    StudentsCount = s.StudentsCount,
                    Status = s.Status,
                    CreatedAt = s.CreatedAt,
                    Levels = s.Levels.Select(l => new LevelDTO
                    {
                        Id = l.Id,
                        Name = l.Name,
                        SortOrder = l.SortOrder,
                        Lectures = l.Lectures.Select(lec => new LectureDTO
                        {
                            Id = lec.Id,
                            Title = lec.Title,
                            Duration = lec.Duration,
                            VideoUrl = lec.VideoUrl,
                            SortOrder = lec.SortOrder
                        }).ToList()
                    }).ToList()
                })
                .FirstOrDefaultAsync();
        }
    }

    public class TeacherStatsDTO
    {
        public int TotalSubjects { get; set; }
        public int TotalStudents { get; set; }
        public int TotalLectures { get; set; }
        public int PublishedCount { get; set; }
        public List<ActivityDTO> RecentActivities { get; set; } = new();
    }

    public class ActivityDTO
    {
        public string Type { get; set; }
        public string StudentName { get; set; }
        public string SubjectName { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class StudentDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string? AvatarUrl { get; set; }
    }
}
