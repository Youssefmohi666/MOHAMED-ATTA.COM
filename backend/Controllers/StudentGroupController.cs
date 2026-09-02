using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/teacher/groups")]
    [Authorize(Roles = "teacher")]
    public class StudentGroupController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<StudentGroupController> _logger;

        public StudentGroupController(AppDbContext db, ILogger<StudentGroupController> logger)
        {
            _db = db;
            _logger = logger;
        }

        private Guid GetTeacherId()
        {
            return Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
        }

        /// <summary>List all groups owned by the teacher, with member counts and details.</summary>
        [HttpGet]
        public async Task<IActionResult> GetGroups()
        {
            try
            {
                var teacherId = GetTeacherId();

                var groups = await _db.StudentGroups
                    .Where(g => g.TeacherId == teacherId)
                    .Include(g => g.Subject)
                    .Include(g => g.Members).ThenInclude(m => m.Student)
                    .OrderByDescending(g => g.CreatedAt)
                    .ToListAsync();

                var result = groups.Select(g => new StudentGroupDto
                {
                    Id = g.Id,
                    Name = g.Name,
                    Description = g.Description,
                    SubjectId = g.SubjectId,
                    SubjectName = g.Subject?.Name,
                    Color = g.Color,
                    MemberCount = g.Members.Count,
                    CreatedAt = g.CreatedAt,
                    Members = g.Members
                        .OrderBy(m => m.Student.Name)
                        .Select(m => new StudentGroupMemberDto
                        {
                            Id = m.Id,
                            StudentId = m.StudentId,
                            StudentName = m.Student.Name,
                            StudentEmail = m.Student.Email,
                            PhoneNumber = m.Student.PhoneNumber,
                            JoinedAt = m.JoinedAt
                        }).ToList()
                }).ToList();

                return Ok(new { data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching student groups");
                return StatusCode(500, new { message = "حدث خطأ أثناء جلب المجموعات" });
            }
        }

        /// <summary>Create a new group.</summary>
        [HttpPost]
        public async Task<IActionResult> CreateGroup([FromBody] CreateStudentGroupDto model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Name))
                    return BadRequest(new { message = "اسم المجموعة مطلوب" });

                var teacherId = GetTeacherId();

                if (model.SubjectId.HasValue &&
                    !await _db.Subjects.AnyAsync(s => s.Id == model.SubjectId && s.TeacherId == teacherId))
                    return BadRequest(new { message = "المادة غير موجودة" });

                var group = new StudentGroup
                {
                    Id = Guid.NewGuid(),
                    TeacherId = teacherId,
                    Name = model.Name.Trim(),
                    Description = model.Description,
                    SubjectId = model.SubjectId,
                    Color = string.IsNullOrWhiteSpace(model.Color) ? "#6366f1" : model.Color
                };

                _db.StudentGroups.Add(group);
                await _db.SaveChangesAsync();
                return Ok(new { data = new StudentGroupDto { Id = group.Id, Name = group.Name, Description = group.Description, SubjectId = group.SubjectId, Color = group.Color, MemberCount = 0, CreatedAt = group.CreatedAt } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating student group");
                return StatusCode(500, new { message = "حدث خطأ أثناء إنشاء المجموعة" });
            }
        }

        /// <summary>Update group details.</summary>
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateGroup(Guid id, [FromBody] UpdateStudentGroupDto model)
        {
            try
            {
                var teacherId = GetTeacherId();
                var group = await _db.StudentGroups.FirstOrDefaultAsync(g => g.Id == id && g.TeacherId == teacherId);
                if (group == null)
                    return NotFound(new { message = "المجموعة غير موجودة" });

                if (model.Name != null)
                {
                    if (string.IsNullOrWhiteSpace(model.Name))
                        return BadRequest(new { message = "اسم المجموعة مطلوب" });
                    group.Name = model.Name.Trim();
                }
                if (model.Description != null) group.Description = model.Description;
                if (model.Color != null) group.Color = model.Color;
                if (model.SubjectId.HasValue)
                {
                    if (!await _db.Subjects.AnyAsync(s => s.Id == model.SubjectId && s.TeacherId == teacherId))
                        return BadRequest(new { message = "المادة غير موجودة" });
                    group.SubjectId = model.SubjectId;
                }

                group.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return Ok(new { message = "تم تحديث المجموعة بنجاح", data = new { group.Id, group.Name } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating student group {Id}", id);
                return StatusCode(500, new { message = "حدث خطأ أثناء تحديث المجموعة" });
            }
        }

        /// <summary>Delete a group (and its memberships).</summary>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteGroup(Guid id)
        {
            try
            {
                var teacherId = GetTeacherId();
                var group = await _db.StudentGroups.FirstOrDefaultAsync(g => g.Id == id && g.TeacherId == teacherId);
                if (group == null)
                    return NotFound(new { message = "المجموعة غير موجودة" });

                _db.StudentGroups.Remove(group);
                await _db.SaveChangesAsync();
                return Ok(new { message = "تم حذف المجموعة بنجاح" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting student group {Id}", id);
                return StatusCode(500, new { message = "حدث خطأ أثناء حذف المجموعة" });
            }
        }

        /// <summary>Add students to a group.</summary>
        [HttpPost("{id:guid}/members")]
        public async Task<IActionResult> AddMembers(Guid id, [FromBody] AddGroupMembersDto model)
        {
            try
            {
                var teacherId = GetTeacherId();
                var group = await _db.StudentGroups.FirstOrDefaultAsync(g => g.Id == id && g.TeacherId == teacherId);
                if (group == null)
                    return NotFound(new { message = "المجموعة غير موجودة" });

                if (model.StudentIds == null || model.StudentIds.Count == 0)
                    return BadRequest(new { message = "لا توجد طلاب للتسجيل" });

                var existing = (await _db.StudentGroupMembers
                    .Where(m => m.StudentGroupId == id)
                    .Select(m => m.StudentId)
                    .ToListAsync())
                    .ToHashSet();

                int added = 0;
                var errors = new List<string>();
                foreach (var studentId in model.StudentIds.Distinct())
                {
                    if (existing.Contains(studentId))
                    {
                        errors.Add($"الطالب {studentId} مسجل بالفعل");
                        continue;
                    }
                    if (!await _db.Users.AnyAsync(u => u.Id == studentId && u.Role == "student"))
                    {
                        errors.Add($"الطالب {studentId} غير موجود");
                        continue;
                    }

                    _db.StudentGroupMembers.Add(new StudentGroupMember
                    {
                        StudentGroupId = id,
                        StudentId = studentId
                    });
                    added++;
                }

                await _db.SaveChangesAsync();
                return Ok(new { added, errors });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding members to group {Id}", id);
                return StatusCode(500, new { message = "حدث خطأ أثناء إضافة الطلاب" });
            }
        }

        /// <summary>Remove a student from a group.</summary>
        [HttpDelete("{id:guid}/members/{studentId:guid}")]
        public async Task<IActionResult> RemoveMember(Guid id, Guid studentId)
        {
            try
            {
                var teacherId = GetTeacherId();
                var group = await _db.StudentGroups.AnyAsync(g => g.Id == id && g.TeacherId == teacherId);
                if (!group)
                    return NotFound(new { message = "المجموعة غير موجودة" });

                var member = await _db.StudentGroupMembers
                    .FirstOrDefaultAsync(m => m.StudentGroupId == id && m.StudentId == studentId);
                if (member == null)
                    return NotFound(new { message = "الطالب غير موجود في المجموعة" });

                _db.StudentGroupMembers.Remove(member);
                await _db.SaveChangesAsync();
                return Ok(new { message = "تم إزالة الطالب من المجموعة" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing member from group {Id}", id);
                return StatusCode(500, new { message = "حدث خطأ أثناء إزالة الطالب" });
            }
        }

        /// <summary>Get all students (role=student) the teacher could add to a group.</summary>
        [HttpGet("available-students")]
        public async Task<IActionResult> GetAvailableStudents([FromQuery] string? search)
        {
            try
            {
                var teacherId = GetTeacherId();

                var query = _db.Users.Where(u => u.Role == "student" && u.IsActive);

                // Prefer students already linked to the teacher's subjects/enrollments,
                // but include all students for flexibility.
                var teacherSubjectIds = _db.Subjects
                    .Where(s => s.TeacherId == teacherId)
                    .Select(s => s.Id);
                var teacherStudentIds = _db.Enrollments
                    .Where(e => e.SubjectId != null && teacherSubjectIds.Contains(e.SubjectId.Value))
                    .Select(e => e.UserId)
                    .Distinct();

                query = query.Where(u => teacherStudentIds.Contains(u.Id));

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var term = search.Trim();
                    query = query.Where(u =>
                        u.Name.Contains(term) || u.Email.Contains(term) ||
                        (u.PhoneNumber != null && u.PhoneNumber.Contains(term)));
                }

                var result = await query
                    .OrderBy(u => u.Name)
                    .Take(200)
                    .Select(u => new StudentGroupMemberDto
                    {
                        StudentId = u.Id,
                        StudentName = u.Name,
                        StudentEmail = u.Email,
                        PhoneNumber = u.PhoneNumber
                    })
                    .ToListAsync();

                return Ok(new { data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching available students");
                return StatusCode(500, new { message = "حدث خطأ أثناء جلب الطلاب" });
            }
        }
    }
}