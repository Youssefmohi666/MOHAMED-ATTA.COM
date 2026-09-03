using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/teacher")]
    [Authorize(Roles = "teacher")]
    public class TeacherController : ControllerBase
    {
        private readonly ITeacherService _teacherService;
        private readonly AppDbContext _context;
        private readonly ILogger<TeacherController> _logger;

        public TeacherController(ITeacherService teacherService, AppDbContext context, ILogger<TeacherController> logger)
        {
            _teacherService = teacherService;
            _context = context;
            _logger = logger;
        }

        private Guid GetTeacherId()
        {
            return Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
        }


        [HttpGet]
        public async Task<ActionResult<ApiResponse<UserDTO>>> GetTeacherInfo()
        {
            try
            {
                var teacherId = GetTeacherId();
                var profile = await _teacherService.GetProfileAsync(teacherId);
                return Ok(new ApiResponse<UserDTO>(profile));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching profile");
                return StatusCode(500, new ApiResponse<object>("An error occurred", "SERVER_ERROR", false));
            }
        }

        [HttpGet("profile")]
        public async Task<ActionResult<ApiResponse<UserDTO>>> GetProfile()
        {
            try
            {
                var teacherId = GetTeacherId();
                var profile = await _teacherService.GetProfileAsync(teacherId);
                return Ok(new ApiResponse<UserDTO>(profile));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching profile");
                return StatusCode(500, new ApiResponse<object>("An error occurred", "SERVER_ERROR", false));
            }
        }

        [HttpPut("profile")]
        public async Task<ActionResult<ApiResponse<UserDTO>>> UpdateProfile([FromBody] UserUpdateDTO model)
        {
            try
            {
                var teacherId = GetTeacherId();
                var profile = await _teacherService.UpdateProfileAsync(teacherId, model);
                if (profile == null)
                    return NotFound(new ApiResponse<object>("User not found", "NOT_FOUND", false));
                return Ok(new ApiResponse<UserDTO>(profile));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile");
                return StatusCode(500, new ApiResponse<object>("An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get all subjects for teacher
        /// </summary>
        [HttpGet("subjects")]
        public async Task<ActionResult<ApiResponse<List<SubjectDTO>>>> GetSubjects()
        {
            try
            {
                var teacherId = GetTeacherId();
                var subjects = await _teacherService.GetTeacherSubjectsAsync(teacherId);

                return Ok(new ApiResponse<List<SubjectDTO>>(subjects));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching teacher subjects");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Create new subject with levels and lectures
        /// </summary>
        [HttpPost("subjects")]
        public async Task<ActionResult<ApiResponse<SubjectDTO>>> CreateSubject([FromBody] SubjectCreateDTO model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse<object>(
                        "Invalid subject data", "VALIDATION_ERROR", false));

                var teacherId = GetTeacherId();
                var subject = await _teacherService.CreateSubjectAsync(teacherId, model);

                return CreatedAtAction(nameof(GetSubjects), 
                    new ApiResponse<SubjectDTO>(subject!));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating subject");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Update subject
        /// </summary>
        [HttpPut("subjects/{id}")]
        public async Task<ActionResult<ApiResponse<SubjectDTO>>> UpdateSubject(Guid id, [FromBody] SubjectUpdateDTO model)
        {
            try
            {
                var teacherId = GetTeacherId();
                var subject = await _teacherService.UpdateSubjectAsync(id, teacherId, model);

                if (subject == null)
                    return NotFound(new ApiResponse<object>(
                        "Subject not found", "NOT_FOUND", false));

                return Ok(new ApiResponse<SubjectDTO>(subject));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating subject");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Delete subject
        /// </summary>
        [HttpDelete("subjects/{id}")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteSubject(Guid id)
        {
            try
            {
                var teacherId = GetTeacherId();
                var success = await _teacherService.DeleteSubjectAsync(id, teacherId);

                if (!success)
                    return NotFound(new ApiResponse<object>(
                        "Subject not found", "NOT_FOUND", false));

                return Ok(new ApiResponse<object>(new { message = "تم الحذف" }));
            }
            catch (BusinessRuleException ex)
            {
                _logger.LogWarning(ex, "Business rule prevented subject deletion");
                return StatusCode(409, new ApiResponse<object>(
                    ex.Message, "CONFLICT", false));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting subject");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Publish or unpublish subject
        /// </summary>
        [HttpPatch("subjects/{id}/publish")]
        public async Task<ActionResult<ApiResponse<SubjectDTO>>> PublishSubject(Guid id, [FromBody] PublishDTO model)
        {
            try
            {
                var teacherId = GetTeacherId();
                var success = await _teacherService.PublishSubjectAsync(id, teacherId, model.Status);

                if (!success)
                    return NotFound(new ApiResponse<object>(
                        "Subject not found", "NOT_FOUND", false));

                var subjects = await _teacherService.GetTeacherSubjectsAsync(teacherId);
                var subject = subjects.FirstOrDefault(s => s.Id == id);

                return Ok(new ApiResponse<SubjectDTO>(subject!));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing subject");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get teacher statistics
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult<ApiResponse<TeacherStatsDTO>>> GetStats()
        {
            try
            {
                var teacherId = GetTeacherId();
                var stats = await _teacherService.GetTeacherStatsAsync(teacherId);

                return Ok(new ApiResponse<TeacherStatsDTO>(stats!));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching teacher stats");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get students enrolled in teacher's subjects
        /// </summary>
        [HttpGet("students/{studentId}")]
        public async Task<ActionResult<ApiResponse<StudentDetailDTO>>> GetStudentDetail(Guid studentId)
        {
            try
            {
                var teacherId = GetTeacherId();
                var student = await _teacherService.GetStudentDetailAsync(teacherId, studentId);
                if (student == null)
                    return NotFound(new ApiResponse<object>("الطالب غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<StudentDetailDTO>(student));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching student detail");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        [HttpGet("students")]
        public async Task<ActionResult<ApiResponse<List<StudentDTO>>>> GetStudents(
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 20)
        {
            try
            {
                var teacherId = GetTeacherId();
                var students = await _teacherService.GetTeacherStudentsAsync(teacherId, search, page, per_page);

                return Ok(new ApiResponse<List<StudentDTO>>(students, true, students.Count));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching teacher students");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        // ── Attendance ────────────────────────────────────────────

        /// <summary>Attendance sheet for one of the teacher's subjects on a date.</summary>
        [HttpGet("attendance")]
        public async Task<IActionResult> GetAttendance([FromQuery] Guid subjectId, [FromQuery] string date)
        {
            try
            {
                if (!await OwnsSubject(subjectId))
                    return NotFound(new { message = "المادة غير موجودة" });

                var day = NormalizeDate(date);
                if (string.IsNullOrEmpty(day))
                    return BadRequest(new { message = "التاريخ غير صالح" });

                var records = await _context.AttendanceRecords
                    .Where(a => a.SubjectId == subjectId && a.Date == day)
                    .ToDictionaryAsync(a => a.StudentId);

                var students = await _context.Enrollments
                    .Where(e => e.SubjectId == subjectId)
                    .Select(e => new { e.UserId, e.User.Name, e.User.Email })
                    .Distinct()
                    .OrderBy(s => s.Name)
                    .ToListAsync();

                var result = students.Select(s => new AttendanceStudentDto
                {
                    StudentId = s.UserId,
                    StudentName = s.Name,
                    StudentEmail = s.Email,
                    Status = records.TryGetValue(s.UserId, out var r) ? r.Status : "unmarked"
                }).ToList();

                return Ok(new { data = result, date = day });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching teacher attendance");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        /// <summary>Marked attendance rows for a teacher's subject/date.</summary>
        [HttpGet("attendance/records")]
        public async Task<IActionResult> GetAttendanceRecords([FromQuery] Guid subjectId, [FromQuery] string date)
        {
            try
            {
                if (!await OwnsSubject(subjectId))
                    return NotFound(new { message = "المادة غير موجودة" });

                var day = NormalizeDate(date);
                if (string.IsNullOrEmpty(day))
                    return BadRequest(new { message = "التاريخ غير صالح" });

                var records = await _context.AttendanceRecords
                    .Where(a => a.SubjectId == subjectId && a.Date == day)
                    .Select(a => new AttendanceRecordDto
                    {
                        Id = a.Id,
                        StudentId = a.StudentId,
                        StudentName = a.Student.Name,
                        StudentEmail = a.Student.Email,
                        SubjectId = a.SubjectId,
                        Date = a.Date,
                        Status = a.Status,
                        Notes = a.Notes,
                        CreatedAt = a.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new { data = records });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching teacher attendance records");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        /// <summary>Bulk-mark attendance for the teacher's subject.</summary>
        [HttpPost("attendance/bulk")]
        public async Task<IActionResult> BulkUpsertAttendance([FromBody] List<AttendanceUpsertDto> items)
        {
            try
            {
                if (items == null || items.Count == 0)
                    return BadRequest(new { message = "لا توجد بيانات" });

                var teacherId = GetTeacherId();
                int created = 0, updated = 0;
                var errors = new List<string>();

                foreach (var item in items)
                {
                    var day = NormalizeDate(item.Date);
                    if (string.IsNullOrEmpty(day) || !IsValidStatus(item.Status))
                    {
                        errors.Add($"سجل غير صالح: {item.StudentId}");
                        continue;
                    }
                    if (!await _context.Subjects.AnyAsync(s => s.Id == item.SubjectId && s.TeacherId == teacherId))
                    {
                        errors.Add($"مادة غير مملوكة: {item.SubjectId}");
                        continue;
                    }
                    if (!await _context.Users.AnyAsync(u => u.Id == item.StudentId))
                    {
                        errors.Add($"طالب غير موجود: {item.StudentId}");
                        continue;
                    }

                    var existing = await _context.AttendanceRecords
                        .FirstOrDefaultAsync(a => a.StudentId == item.StudentId && a.SubjectId == item.SubjectId && a.Date == day);

                    if (existing != null)
                    {
                        existing.Status = item.Status;
                        existing.Notes = item.Notes;
                        existing.UpdatedAt = DateTime.UtcNow;
                        updated++;
                    }
                    else
                    {
                        _context.AttendanceRecords.Add(new elmanassa.Models.AttendanceRecord
                        {
                            StudentId = item.StudentId,
                            SubjectId = item.SubjectId,
                            Date = day,
                            Status = item.Status,
                            Notes = item.Notes
                        });
                        created++;
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(new { created, updated, errors });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk upserting teacher attendance");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        /// <summary>Attendance stats per student for a teacher's subject.</summary>
        [HttpGet("attendance/stats")]
        public async Task<IActionResult> GetAttendanceStats([FromQuery] Guid subjectId)
        {
            try
            {
                if (!await OwnsSubject(subjectId))
                    return NotFound(new { message = "المادة غير موجودة" });

                var records = await _context.AttendanceRecords
                    .Where(a => a.SubjectId == subjectId)
                    .Include(a => a.Student)
                    .ToListAsync();

                var stats = records
                    .GroupBy(a => new { a.StudentId, a.Student.Name })
                    .Select(g => new AttendanceStatsDto
                    {
                        StudentId = g.Key.StudentId,
                        StudentName = g.Key.Name,
                        Present = g.Count(x => x.Status == "present"),
                        Absent = g.Count(x => x.Status == "absent"),
                        Late = g.Count(x => x.Status == "late"),
                        Excused = g.Count(x => x.Status == "excused"),
                        Total = g.Count(),
                        AttendanceRate = g.Count() == 0 ? 0 :
                            Math.Round((decimal)g.Count(x => x.Status == "present" || x.Status == "late") * 100m / g.Count(), 1)
                    })
                    .OrderBy(s => s.StudentName)
                    .ToList();

                return Ok(new { data = stats });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching teacher attendance stats");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        private async Task<bool> OwnsSubject(Guid subjectId)
        {
            var teacherId = GetTeacherId();
            return await _context.Subjects.AnyAsync(s => s.Id == subjectId && s.TeacherId == teacherId);
        }

        private static string? NormalizeDate(string date)
        {
            if (string.IsNullOrWhiteSpace(date)) return null;
            if (DateTime.TryParse(date, out var dt))
                return dt.ToString("yyyy-MM-dd");
            return null;
        }

        private static bool IsValidStatus(string status)
        {
            return status == "present" || status == "absent" || status == "late" || status == "excused";
        }

        // ── Accounting ────────────────────────────────────────────

        [HttpGet("accounting/transactions")]
        public async Task<IActionResult> GetAccountingTransactions()
        {
            var teacherId = GetTeacherId();
            var items = await _context.AccountingTransactions
                .Where(t => t.TeacherId == teacherId)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new {
                    t.Id, t.StudentName, t.Date, t.Service, t.Amount, t.Currency,
                    t.Type, t.InvoiceNumber, t.PaymentMethod, t.ContactNumber, t.Notes, t.CreatedAt,
                    teacherId = t.TeacherId
                })
                .ToListAsync();
            return Ok(new { data = items });
        }

        [HttpPost("accounting/transactions")]
        public async Task<IActionResult> CreateAccountingTransaction([FromBody] AccountingTransactionDTO model)
        {
            if (string.IsNullOrWhiteSpace(model.StudentName) || string.IsNullOrWhiteSpace(model.Type))
                return BadRequest(new { message = "البيانات المطلوبة ناقصة" });

            var teacherId = GetTeacherId();
            var tx = new elmanassa.Models.AccountingTransaction
            {
                Id = model.Id ?? $"tx_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..5]}",
                StudentName = model.StudentName,
                Date = model.Date ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                Service = model.Service ?? "أخرى",
                Amount = model.Amount,
                Currency = model.Currency ?? "SAR",
                Type = model.Type,
                InvoiceNumber = model.InvoiceNumber,
                PaymentMethod = model.PaymentMethod,
                ContactNumber = model.ContactNumber,
                Notes = model.Notes,
                CreatedAt = DateTime.UtcNow,
                TeacherId = teacherId
            };

            _context.AccountingTransactions.Add(tx);
            await _context.SaveChangesAsync();
            return Ok(new { data = tx });
        }

        [HttpDelete("accounting/transactions/{id}")]
        public async Task<IActionResult> DeleteAccountingTransaction(string id)
        {
            var teacherId = GetTeacherId();
            var tx = await _context.AccountingTransactions
                .FirstOrDefaultAsync(t => t.Id == id && t.TeacherId == teacherId);
            if (tx == null) return NotFound(new { message = "المعاملة غير موجودة" });
            _context.AccountingTransactions.Remove(tx);
            await _context.SaveChangesAsync();
            return Ok(new { message = "تم الحذف بنجاح" });
        }
    }

    public class PublishDTO
    {
        public string Status { get; set; }
    }
}
