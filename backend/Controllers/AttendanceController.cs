using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/admin/attendance")]
    [Authorize(Roles = "admin")]
    public class AttendanceController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<AttendanceController> _logger;

        public AttendanceController(AppDbContext db, ILogger<AttendanceController> logger)
        {
            _db = db;
            _logger = logger;
        }

        /// <summary>
        /// List all enrolled students for a subject with their attendance status on a given date.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAttendance(
            [FromQuery] Guid subjectId,
            [FromQuery] string date)
        {
            try
            {
                var day = NormalizeDate(date);
                if (string.IsNullOrEmpty(day))
                    return BadRequest(new { message = "التاريخ غير صالح" });

                var records = await _db.AttendanceRecords
                    .Where(a => a.SubjectId == subjectId && a.Date == day)
                    .ToDictionaryAsync(a => a.StudentId);

                var students = await _db.Enrollments
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
                _logger.LogError(ex, "Error fetching attendance");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        /// <summary>Get recorded attendance rows for a date/subject (only marked students).</summary>
        [HttpGet("records")]
        public async Task<IActionResult> GetAttendanceRecords(
            [FromQuery] Guid subjectId,
            [FromQuery] string date)
        {
            try
            {
                var day = NormalizeDate(date);
                if (string.IsNullOrEmpty(day))
                    return BadRequest(new { message = "التاريخ غير صالح" });

                var records = await _db.AttendanceRecords
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
                _logger.LogError(ex, "Error fetching attendance records");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        /// <summary>Mark attendance for a single student (upsert by student+subject+date).</summary>
        [HttpPost]
        public async Task<IActionResult> UpsertAttendance([FromBody] AttendanceUpsertDto model)
        {
            try
            {
                var day = NormalizeDate(model.Date);
                if (string.IsNullOrEmpty(day))
                    return BadRequest(new { message = "التاريخ غير صالح" });
                if (!await _db.Users.AnyAsync(u => u.Id == model.StudentId))
                    return BadRequest(new { message = "الطالب غير موجود" });
                if (!await _db.Subjects.AnyAsync(s => s.Id == model.SubjectId))
                    return BadRequest(new { message = "المادة غير موجودة" });
                if (!IsValidStatus(model.Status))
                    return BadRequest(new { message = "الحالة غير صالحة" });

                var existing = await _db.AttendanceRecords
                    .FirstOrDefaultAsync(a => a.StudentId == model.StudentId && a.SubjectId == model.SubjectId && a.Date == day);

                if (existing != null)
                {
                    existing.Status = model.Status;
                    existing.Notes = model.Notes;
                    existing.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                    return Ok(new { data = existing, updated = true });
                }

                var record = new AttendanceRecord
                {
                    StudentId = model.StudentId,
                    SubjectId = model.SubjectId,
                    Date = day,
                    Status = model.Status,
                    Notes = model.Notes
                };
                _db.AttendanceRecords.Add(record);
                await _db.SaveChangesAsync();
                return Ok(new { data = record, created = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error upserting attendance");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        /// <summary>Bulk-mark attendance for many students on one date/subject.</summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> BulkUpsertAttendance([FromBody] List<AttendanceUpsertDto> items)
        {
            try
            {
                if (items == null || items.Count == 0)
                    return BadRequest(new { message = "لا توجد بيانات" });

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
                    if (!await _db.Users.AnyAsync(u => u.Id == item.StudentId) ||
                        !await _db.Subjects.AnyAsync(s => s.Id == item.SubjectId))
                    {
                        errors.Add($"طالب أو مادة غير موجودة: {item.StudentId}");
                        continue;
                    }

                    var existing = await _db.AttendanceRecords
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
                        _db.AttendanceRecords.Add(new AttendanceRecord
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

                await _db.SaveChangesAsync();
                return Ok(new { created, updated, errors });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk upserting attendance");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        /// <summary>Attendance stats per student for a subject.</summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetAttendanceStats([FromQuery] Guid subjectId)
        {
            try
            {
                var records = await _db.AttendanceRecords
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
                _logger.LogError(ex, "Error fetching attendance stats");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteAttendance(Guid id)
        {
            try
            {
                var record = await _db.AttendanceRecords.FindAsync(id);
                if (record == null) return NotFound(new { message = "السجل غير موجود" });
                _db.AttendanceRecords.Remove(record);
                await _db.SaveChangesAsync();
                return Ok(new { message = "تم الحذف بنجاح" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting attendance record {Id}", id);
                return StatusCode(500, new { message = "حدث خطأ" });
            }
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
    }
}
