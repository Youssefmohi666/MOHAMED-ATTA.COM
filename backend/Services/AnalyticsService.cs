using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Services
{
    public interface IAnalyticsService
    {
        Task<AnalyticsOverviewDTO?> GetOverviewAsync(Guid teacherId);
        Task<StudentAnalyticsDTO?> GetStudentAnalyticsAsync(Guid teacherId, Guid studentId);
        Task<List<ClassroomDTO>> GetClassroomsAsync(Guid teacherId, Guid? subjectId);
        Task<ClassroomDTO?> CreateClassroomAsync(Guid teacherId, ClassroomCreateDTO dto);
        Task<AssessmentDTO?> CreateAssessmentAsync(Guid teacherId, AssessmentCreateDTO dto);
        Task<bool> RecordAssessmentGradeAsync(Guid teacherId, Guid assessmentId, AssessmentGradeCreateDTO dto);
        Task<List<AttendanceLogDTO>> GetTeacherAttendanceAsync(Guid teacherId, Guid? subjectId);
        Task<bool> RecordAttendanceAsync(Guid teacherId, AttendanceLogCreateDTO dto);
    }

    public class AnalyticsService : IAnalyticsService
    {
        private readonly AppDbContext _context;

        public AnalyticsService(AppDbContext context)
        {
            _context = context;
        }

        private IQueryable<Guid> TeacherSubjectIds(Guid teacherId)
        {
            return _context.Set<Subject>()
                .Where(s => s.TeacherId == teacherId)
                .Select(s => s.Id);
        }

        public async Task<AnalyticsOverviewDTO?> GetOverviewAsync(Guid teacherId)
        {
            var subjectIds = await TeacherSubjectIds(teacherId).ToListAsync();
            if (subjectIds.Count == 0) return null;

            var enrollments = await _context.Set<Enrollment>()
                .Where(e => e.SubjectId.HasValue && subjectIds.Contains(e.SubjectId.Value))
                .Select(e => e.UserId)
                .Distinct()
                .ToListAsync();

            var assessments = await _context.Set<Assessment>()
                .Where(a => subjectIds.Contains(a.SubjectId))
                .OrderByDescending(a => a.Date)
                .ToListAsync();

            var assessmentIds = assessments.Select(a => a.Id).ToList();
            var grades = await _context.Set<AssessmentGrade>()
                .Where(g => assessmentIds.Contains(g.AssessmentId))
                .ToListAsync();

            var attendance = await _context.Set<AttendanceLog>()
                .Where(a => a.SubjectId.HasValue && subjectIds.Contains(a.SubjectId.Value))
                .ToListAsync();

            var avg = grades.Count > 0 ? grades.Average(g => g.Grade) : 0;
            var present = attendance.Count(a => a.Status == "Present");
            var late = attendance.Count(a => a.Status == "Late");
            var absent = attendance.Count(a => a.Status == "Absent");
            var attendanceRate = attendance.Count > 0
                ? Math.Round((double)(present + late) / attendance.Count * 100, 1)
                : 0;

            var subjectNames = await _context.Set<Subject>()
                .Where(s => subjectIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.Name);

            return new AnalyticsOverviewDTO
            {
                TotalStudents = enrollments.Count,
                TotalAssessments = assessments.Count,
                TotalClassrooms = await _context.Set<ClassRoom>().CountAsync(c => subjectIds.Contains(c.SubjectId)),
                AverageGrade = Math.Round(avg, 1),
                PresentCount = present,
                AbsentCount = absent,
                LateCount = late,
                AttendanceRate = attendanceRate,
                RecentAssessments = assessments.Take(10).Select(a => new AssessmentSummaryDTO
                {
                    Id = a.Id,
                    Title = a.Title,
                    Type = a.Type,
                    MaxGrade = a.MaxGrade,
                    Date = a.Date,
                    SubjectName = subjectNames.TryGetValue(a.SubjectId, out var sn) ? sn : null,
                    GradesCount = grades.Count(g => g.AssessmentId == a.Id),
                    AverageGrade = (grades.Any(g => g.AssessmentId == a.Id))
                        ? Math.Round(grades.Where(g => g.AssessmentId == a.Id).Average(g => g.Grade), 1)
                        : 0
                }).ToList()
            };
        }

        public async Task<StudentAnalyticsDTO?> GetStudentAnalyticsAsync(Guid teacherId, Guid studentId)
        {
            var subjectIds = await TeacherSubjectIds(teacherId).ToListAsync();
            if (subjectIds.Count == 0) return null;

            var isEnrolled = await _context.Set<Enrollment>()
                .AnyAsync(e => e.UserId == studentId && e.SubjectId.HasValue && subjectIds.Contains(e.SubjectId.Value));
            if (!isEnrolled) return null;

            var student = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == studentId);
            if (student == null) return null;

            var assessmentIds = await _context.Set<Assessment>()
                .Where(a => subjectIds.Contains(a.SubjectId))
                .Select(a => a.Id)
                .ToListAsync();

            var grades = await _context.Set<AssessmentGrade>()
                .Where(g => g.UserId == studentId && assessmentIds.Contains(g.AssessmentId))
                .OrderByDescending(g => g.CreatedAt)
                .ToListAsync();

            var attendance = await _context.Set<AttendanceLog>()
                .Where(a => a.StudentId == studentId && a.SubjectId.HasValue && subjectIds.Contains(a.SubjectId.Value))
                .OrderByDescending(a => a.Date)
                .ToListAsync();

            var subjectNames = await _context.Set<Subject>()
                .Where(s => subjectIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.Name);
            var gradeUsers = await _context.Set<User>()
                .Where(u => grades.Select(g => g.UserId).Distinct().Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Name);

            double? rate = null;
            if (attendance.Count > 0)
                rate = Math.Round((double)attendance.Count(a => a.Status == "Present" || a.Status == "Late") / attendance.Count * 100, 1);

            return new StudentAnalyticsDTO
            {
                StudentId = studentId,
                StudentName = student.Name,
                Email = student.Email,
                AvatarUrl = student.AvatarUrl,
                TotalAssessments = grades.Count,
                AverageGrade = grades.Count > 0 ? Math.Round(grades.Average(g => g.Grade), 1) : 0,
                AttendanceRate = rate,
                Grades = grades.Select(g => new AssessmentGradeDTO
                {
                    Id = g.Id,
                    UserId = g.UserId,
                    StudentName = gradeUsers.TryGetValue(g.UserId, out var n) ? n : student.Name,
                    Grade = g.Grade,
                    CreatedAt = g.CreatedAt
                }).ToList(),
                Attendance = attendance.Select(a => new AttendanceLogDTO
                {
                    Id = a.Id,
                    StudentId = a.StudentId,
                    StudentName = student.Name,
                    SubjectName = a.SubjectId.HasValue && subjectNames.TryGetValue(a.SubjectId.Value, out var sn) ? sn : string.Empty,
                    Status = a.Status,
                    Date = a.Date,
                    Notes = a.Notes
                }).ToList()
            };
        }

        public async Task<List<ClassroomDTO>> GetClassroomsAsync(Guid teacherId, Guid? subjectId)
        {
            var subjectIds = await TeacherSubjectIds(teacherId).ToListAsync();
            if (subjectIds.Count == 0) return new();

            var query = _context.Set<ClassRoom>().Where(c => subjectIds.Contains(c.SubjectId));
            if (subjectId.HasValue) query = query.Where(c => c.SubjectId == subjectId.Value);

            var classrooms = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
            var subjectNames = await _context.Set<Subject>()
                .Where(s => subjectIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.Name);

            var studentCounts = await _context.Set<Enrollment>()
                .Where(e => e.ClassRoomId.HasValue && classrooms.Select(c => c.Id).Contains(e.ClassRoomId.Value))
                .GroupBy(e => e.ClassRoomId!.Value)
                .Select(g => new { ClassroomId = g.Key, Count = g.Select(x => x.UserId).Distinct().Count() })
                .ToDictionaryAsync(x => x.ClassroomId, x => x.Count);

            return classrooms.Select(c => new ClassroomDTO
            {
                Id = c.Id,
                Name = c.Name,
                SubjectId = c.SubjectId,
                SubjectName = subjectNames.TryGetValue(c.SubjectId, out var sn) ? sn : null,
                CreatedAt = c.CreatedAt,
                StudentsCount = studentCounts.TryGetValue(c.Id, out var cnt) ? cnt : 0
            }).ToList();
        }

        public async Task<ClassroomDTO?> CreateClassroomAsync(Guid teacherId, ClassroomCreateDTO dto)
        {
            var subject = await _context.Set<Subject>().FirstOrDefaultAsync(s => s.Id == dto.SubjectId && s.TeacherId == teacherId);
            if (subject == null) return null;

            var classroom = new ClassRoom
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                SubjectId = dto.SubjectId,
                CreatedAt = DateTime.UtcNow
            };
            _context.Set<ClassRoom>().Add(classroom);
            await _context.SaveChangesAsync();

            return new ClassroomDTO
            {
                Id = classroom.Id,
                Name = classroom.Name,
                SubjectId = classroom.SubjectId,
                SubjectName = subject.Name,
                CreatedAt = classroom.CreatedAt,
                StudentsCount = 0
            };
        }

        public async Task<AssessmentDTO?> CreateAssessmentAsync(Guid teacherId, AssessmentCreateDTO dto)
        {
            var subject = await _context.Set<Subject>().FirstOrDefaultAsync(s => s.Id == dto.SubjectId && s.TeacherId == teacherId);
            if (subject == null) return null;

            var assessment = new Assessment
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Type = string.IsNullOrWhiteSpace(dto.Type) ? "Quiz" : dto.Type,
                SubjectId = dto.SubjectId,
                ClassRoomId = dto.ClassRoomId,
                MaxGrade = dto.MaxGrade <= 0 ? 100 : dto.MaxGrade,
                Date = dto.Date ?? DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };
            _context.Set<Assessment>().Add(assessment);
            await _context.SaveChangesAsync();

            string? classroomName = null;
            if (dto.ClassRoomId.HasValue)
            {
                var cr = await _context.Set<ClassRoom>().FirstOrDefaultAsync(c => c.Id == dto.ClassRoomId.Value);
                classroomName = cr?.Name;
            }

            return new AssessmentDTO
            {
                Id = assessment.Id,
                Title = assessment.Title,
                Type = assessment.Type,
                SubjectId = assessment.SubjectId,
                SubjectName = subject.Name,
                ClassRoomId = assessment.ClassRoomId,
                ClassRoomName = classroomName,
                MaxGrade = assessment.MaxGrade,
                Date = assessment.Date,
                CreatedAt = assessment.CreatedAt
            };
        }

        public async Task<bool> RecordAssessmentGradeAsync(Guid teacherId, Guid assessmentId, AssessmentGradeCreateDTO dto)
        {
            var assessment = await _context.Set<Assessment>()
                .Include(a => a.Subject)
                .FirstOrDefaultAsync(a => a.Id == assessmentId && a.Subject != null && a.Subject.TeacherId == teacherId);
            if (assessment == null) return false;

            var student = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == dto.StudentId && u.Role == "student");
            if (student == null) return false;

            var existing = await _context.Set<AssessmentGrade>()
                .FirstOrDefaultAsync(g => g.AssessmentId == assessmentId && g.UserId == dto.StudentId);

            if (existing != null)
            {
                existing.Grade = dto.Grade;
            }
            else
            {
                _context.Set<AssessmentGrade>().Add(new AssessmentGrade
                {
                    Id = Guid.NewGuid(),
                    AssessmentId = assessmentId,
                    UserId = dto.StudentId,
                    Grade = dto.Grade,
                    CreatedAt = DateTime.UtcNow
                });
            }
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<AttendanceLogDTO>> GetTeacherAttendanceAsync(Guid teacherId, Guid? subjectId)
        {
            var subjectIds = await TeacherSubjectIds(teacherId).ToListAsync();
            if (subjectIds.Count == 0) return new();

            var query = _context.Set<AttendanceLog>().Where(a => a.SubjectId.HasValue && subjectIds.Contains(a.SubjectId.Value));
            if (subjectId.HasValue) query = query.Where(a => a.SubjectId == subjectId.Value);

            var logs = await query.OrderByDescending(a => a.Date).ToListAsync();
            var studentIds = logs.Select(l => l.StudentId).Distinct().ToList();
            var names = await _context.Set<User>().Where(u => studentIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Name);
            var subjectNames = await _context.Set<Subject>().Where(s => subjectIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Name);

            return logs.Select(l => new AttendanceLogDTO
            {
                Id = l.Id,
                StudentId = l.StudentId,
                StudentName = names.TryGetValue(l.StudentId, out var n) ? n : string.Empty,
                SubjectName = l.SubjectId.HasValue && subjectNames.TryGetValue(l.SubjectId.Value, out var sn) ? sn : string.Empty,
                Status = l.Status,
                Date = l.Date,
                Notes = l.Notes
            }).ToList();
        }

        public async Task<bool> RecordAttendanceAsync(Guid teacherId, AttendanceLogCreateDTO dto)
        {
            var student = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == dto.StudentId && u.Role == "student");
            if (student == null) return false;

            if (dto.SubjectId.HasValue)
            {
                var subjectOk = await _context.Set<Subject>().AnyAsync(s => s.Id == dto.SubjectId.Value && s.TeacherId == teacherId);
                if (!subjectOk) return false;
            }

            var date = dto.Date ?? DateTime.UtcNow;
            var status = dto.Status?.Trim();

            var existing = await _context.Set<AttendanceLog>()
                .FirstOrDefaultAsync(a => a.StudentId == dto.StudentId && a.SubjectId == dto.SubjectId && a.Date.Date == date.Date);

            if (existing != null)
            {
                existing.Status = status ?? existing.Status;
                existing.Notes = dto.Notes;
                return true;
            }

            _context.Set<AttendanceLog>().Add(new AttendanceLog
            {
                Id = Guid.NewGuid(),
                StudentId = dto.StudentId,
                SubjectId = dto.SubjectId,
                ClassRoomId = dto.ClassRoomId,
                Status = status ?? "Present",
                Notes = dto.Notes,
                Date = date,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            return true;
        }
    }
}