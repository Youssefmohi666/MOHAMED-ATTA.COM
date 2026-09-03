using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Services
{
    public interface IStudentService
    {
        Task<List<EnrollmentDTO>> GetEnrollmentsAsync(Guid userId);
        Task<StudentProgressDTO> GetProgressAsync(Guid userId);
        Task<bool> UpdateProgressAsync(Guid userId, LectureProgressUpdateDTO dto);
        Task<List<VideoViewDTO>> GetVideoViewsAsync(Guid userId);
        Task<FreeEnrollResult> EnrollFreeAsync(Guid userId, FreeEnrollDTO dto);
        Task<UserDTO?> GetProfileAsync(Guid userId);
        Task<UserDTO?> UpdateProfileAsync(Guid userId, UserUpdateDTO dto);
    }

    public class StudentService : IStudentService
    {
        private readonly AppDbContext _context;

        public StudentService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<EnrollmentDTO>> GetEnrollmentsAsync(Guid userId)
        {
            return await _context.Enrollments
                .Where(e => e.UserId == userId)
                .Select(e => new EnrollmentDTO
                {
                    Id = e.Id,
                    UserId = e.UserId,
                    CourseId = e.CourseId,
                    SubjectId = e.SubjectId,
                    EnrolledAt = e.EnrolledAt
                })
                .ToListAsync();
        }

        public async Task<StudentProgressDTO> GetProgressAsync(Guid userId)
        {
            var enrollments = await _context.Enrollments
                .Where(e => e.UserId == userId)
                .ToListAsync();

            var subjectIds = enrollments.Where(e => e.SubjectId.HasValue).Select(e => e.SubjectId!.Value).Distinct();

            var lecturesCount = await _context.Lectures
                .Where(l => subjectIds.Contains(l.Level.Subject.Id))
                .CountAsync();

            var completedLectures = await _context.LectureProgress
                .Where(lp => lp.UserId == userId && lp.Completed)
                .CountAsync();

            var subjectProgress = await _context.Subjects
                .Where(s => subjectIds.Contains(s.Id))
                .Select(s => new SubjectProgressDTO
                {
                    Id = s.Id,
                    Name = s.Name,
                    Progress = (_context.LectureProgress
                        .Where(lp => lp.UserId == userId && lp.Lecture.Level.Subject.Id == s.Id)
                        .Average(lp => (double?)lp.ProgressPct) ?? 0.0),
                    LastAccessed = _context.LectureProgress
                        .Where(lp => lp.UserId == userId && lp.Lecture.Level.Subject.Id == s.Id)
                        .Max(lp => lp.LastWatchedAt)
                })
                .ToListAsync();

            var overallProgress = lecturesCount > 0 ? (completedLectures * 100.0 / lecturesCount) : 0;

            return new StudentProgressDTO
            {
                TotalCourses = enrollments.Where(e => e.CourseId.HasValue).Count(),
                CompletedLectures = completedLectures,
                TotalLectures = lecturesCount,
                OverallProgress = overallProgress,
                Subjects = subjectProgress
            };
        }

        public async Task<bool> UpdateProgressAsync(Guid userId, LectureProgressUpdateDTO dto)
        {
            var existing = await _context.LectureProgress
                .FirstOrDefaultAsync(lp => lp.UserId == userId && lp.LectureId == dto.LectureId);

            if (existing == null)
            {
                var progress = new LectureProgress
                {
                    UserId = userId,
                    LectureId = dto.LectureId,
                    Completed = dto.Completed,
                    ProgressPct = dto.ProgressPct,
                    LastWatchedAt = DateTime.UtcNow
                };

                _context.LectureProgress.Add(progress);
            }
            else
            {
                existing.Completed = dto.Completed;
                existing.ProgressPct = dto.ProgressPct;
                existing.LastWatchedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<VideoViewDTO>> GetVideoViewsAsync(Guid userId)
        {
            var views = await _context.LectureProgress
                .Where(lp => lp.UserId == userId)
                .Select(lp => new VideoViewDTO
                {
                    LectureId = lp.LectureId,
                    LectureTitle = lp.Lecture.Title,
                    SubjectName = lp.Lecture.Level.Subject.Name,
                    ProgressPct = lp.ProgressPct,
                    Duration = lp.Lecture.Duration,
                    Completed = lp.Completed,
                    LastWatchedAt = lp.LastWatchedAt
                })
                .OrderByDescending(v => v.LastWatchedAt)
                .ToListAsync();

            return views;
        }

        public async Task<FreeEnrollResult> EnrollFreeAsync(Guid userId, FreeEnrollDTO dto)
        {
            if (!Guid.TryParse(dto.SubjectId, out var subjectId))
                return new FreeEnrollResult { Code = "INVALID_ID", Message = "معرف المادة غير صالح" };

            var subject = await _context.Subjects.FirstOrDefaultAsync(s => s.Id == subjectId);
            if (subject == null)
                return new FreeEnrollResult { Code = "NOT_FOUND", Message = "المادة غير موجودة" };

            if (subject.Price > 0 && subject.Status != "free")
                return new FreeEnrollResult { Code = "NOT_FREE", Message = "هذه المادة ليست مجانية" };

            var alreadyEnrolled = await _context.Enrollments
                .AnyAsync(e => e.UserId == userId && e.SubjectId == subjectId);
            if (alreadyEnrolled)
                return new FreeEnrollResult { Code = "ALREADY_ENROLLED", Message = "أنت مسجل بالفعل في هذه المادة" };

            _context.Enrollments.Add(new Enrollment
            {
                UserId = userId,
                SubjectId = subjectId,
                EnrolledAt = DateTime.UtcNow
            });

            subject.StudentsCount++;
            await _context.SaveChangesAsync();

            return new FreeEnrollResult { Code = "ENROLLED", Message = "تم التسجيل في المادة بنجاح" };
        }

        public async Task<UserDTO?> GetProfileAsync(Guid userId)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return null;
            return ToUserDTO(user);
        }

        public async Task<UserDTO?> UpdateProfileAsync(Guid userId, UserUpdateDTO dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return null;

            if (!string.IsNullOrWhiteSpace(dto.Name)) user.Name = dto.Name!.Trim();
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) user.PhoneNumber = new string(dto.PhoneNumber.Where(char.IsDigit).ToArray());
            if (dto.GuardianPhone != null) user.GuardianPhone = string.IsNullOrWhiteSpace(dto.GuardianPhone) ? null : new string(dto.GuardianPhone.Where(char.IsDigit).ToArray());
            if (dto.FatherName != null) user.FatherName = string.IsNullOrWhiteSpace(dto.FatherName) ? null : dto.FatherName.Trim();
            if (dto.MotherPhone != null) user.MotherPhone = string.IsNullOrWhiteSpace(dto.MotherPhone) ? null : new string(dto.MotherPhone.Where(char.IsDigit).ToArray());
            if (dto.PrimaryEmail != null) user.PrimaryEmail = string.IsNullOrWhiteSpace(dto.PrimaryEmail) ? null : dto.PrimaryEmail.Trim();
            if (dto.Bio != null) user.Bio = dto.Bio;

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return ToUserDTO(user);
        }

        private static UserDTO ToUserDTO(User user) => new UserDTO
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            GuardianPhone = user.GuardianPhone,
            FatherName = user.FatherName,
            MotherPhone = user.MotherPhone,
            PrimaryEmail = user.PrimaryEmail,
            NationalId = user.NationalId,
            AvatarUrl = user.AvatarUrl,
            Bio = user.Bio,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
        };
    }
}
