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
        Task<FreeEnrollResult> EnrollFreeAsync(Guid userId, FreeEnrollDTO dto);
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
    }
}
