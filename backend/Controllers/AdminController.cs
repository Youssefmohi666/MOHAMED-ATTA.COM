using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/admin")]
    [Authorize(Roles = "admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<AdminController> _logger;

        public AdminController(AppDbContext db, ILogger<AdminController> logger)
        {
            _db = db;
            _logger = logger;
        }

        // ── Stats ──────────────────────────────────────────────────────
        [HttpGet("stats")]
        public async Task<ActionResult> GetStats()
        {
            try
            {
                var students = await _db.Users.CountAsync(u => u.Role == "student");
                var teachers = await _db.Users.CountAsync(u => u.Role == "teacher");
                var courses = await _db.Subjects.CountAsync();
                var orders = await _db.Orders.CountAsync();
                var streams = await _db.LiveStreams.CountAsync();
                var revenue = await _db.Orders
                    .Where(o => o.PaymentStatus == "completed")
                    .SumAsync(o => (decimal?)o.FinalPrice) ?? 0;

                return Ok(new
                {
                    Data = new AdminStatsDto
                    {
                        Students = students,
                        Teachers = teachers,
                        Courses = courses,
                        Orders = orders,
                        Streams = streams,
                        Revenue = revenue
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching admin stats");
                return StatusCode(500, new { Error = "Failed to load stats" });
            }
        }

        // ── Students ───────────────────────────────────────────────────
        [HttpGet("students")]
        public async Task<ActionResult> GetStudents(
            [FromQuery] int page = 1,
            [FromQuery] int perPage = 20,
            [FromQuery] string? search = null)
        {
            try
            {
                var query = _db.Users.Where(u => u.Role == "student");

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower();
                    query = query.Where(u => u.Name.ToLower().Contains(s) || u.Email.ToLower().Contains(s));
                }

                var total = await query.CountAsync();

                var items = await query
                    .OrderByDescending(u => u.CreatedAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(u => new AdminUserDto
                    {
                        Id = u.Id,
                        Name = u.Name,
                        Email = u.Email,
                        PhoneNumber = u.PhoneNumber,
                        AvatarUrl = u.AvatarUrl,
                        IsActive = u.IsActive,
                        CreatedAt = u.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new { Data = items, Total = total });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching students");
                return StatusCode(500, new { Error = "Failed to load students" });
            }
        }

        [HttpGet("students-list")]
        public async Task<ActionResult> GetStudentsList()
        {
            try
            {
                var items = await _db.Users
                    .Where(u => u.Role == "student")
                    .OrderBy(u => u.Name)
                    .Select(u => new AdminListDto
                    {
                        Id = u.Id,
                        Name = u.Name,
                        Email = u.Email
                    })
                    .ToListAsync();

                return Ok(new { Data = items });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching students list");
                return StatusCode(500, new { Error = "Failed to load students list" });
            }
        }

        [HttpPut("students/{id}")]
        public async Task<ActionResult> UpdateStudent(Guid id, [FromBody] UpdateUserDto model)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "student");
                if (user == null)
                    return NotFound(new { Error = "Student not found" });

                if (model.Name != null) user.Name = model.Name;
                if (model.Email != null) user.Email = model.Email;
                if (model.Password != null) user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password);
                if (model.PhoneNumber != null) user.PhoneNumber = model.PhoneNumber;
                if (model.Bio != null) user.Bio = model.Bio;
                if (model.IsActive.HasValue) user.IsActive = model.IsActive.Value;

                user.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating student {Id}", id);
                return StatusCode(500, new { Error = "Failed to update student" });
            }
        }

        [HttpDelete("students/{id}")]
        public async Task<ActionResult> DeleteStudent(Guid id)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "student");
                if (user == null)
                    return NotFound(new { Error = "Student not found" });

                _db.Users.Remove(user);
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting student {Id}", id);
                return StatusCode(500, new { Error = "Failed to delete student" });
            }
        }

        // ── Teachers ───────────────────────────────────────────────────
        [HttpGet("teachers")]
        public async Task<ActionResult> GetTeachers(
            [FromQuery] int page = 1,
            [FromQuery] int perPage = 20,
            [FromQuery] string? search = null)
        {
            try
            {
                var query = _db.Users.Where(u => u.Role == "teacher");

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower();
                    query = query.Where(u => u.Name.ToLower().Contains(s) || u.Email.ToLower().Contains(s));
                }

                var total = await query.CountAsync();

                var items = await query
                    .OrderByDescending(u => u.CreatedAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(u => new AdminUserDto
                    {
                        Id = u.Id,
                        Name = u.Name,
                        Email = u.Email,
                        PhoneNumber = u.PhoneNumber,
                        AvatarUrl = u.AvatarUrl,
                        IsActive = u.IsActive,
                        CreatedAt = u.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new { Data = items, Total = total });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching teachers");
                return StatusCode(500, new { Error = "Failed to load teachers" });
            }
        }

        [HttpGet("teachers-list")]
        public async Task<ActionResult> GetTeachersList()
        {
            try
            {
                var items = await _db.Users
                    .Where(u => u.Role == "teacher")
                    .OrderBy(u => u.Name)
                    .Select(u => new AdminListDto
                    {
                        Id = u.Id,
                        Name = u.Name,
                        Email = u.Email
                    })
                    .ToListAsync();

                return Ok(new { Data = items });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching teachers list");
                return StatusCode(500, new { Error = "Failed to load teachers list" });
            }
        }

        [HttpPut("teachers/{id}")]
        public async Task<ActionResult> UpdateTeacher(Guid id, [FromBody] UpdateUserDto model)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "teacher");
                if (user == null)
                    return NotFound(new { Error = "Teacher not found" });

                if (model.Name != null) user.Name = model.Name;
                if (model.Email != null) user.Email = model.Email;
                if (model.Password != null) user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password);
                if (model.PhoneNumber != null) user.PhoneNumber = model.PhoneNumber;
                if (model.Bio != null) user.Bio = model.Bio;
                if (model.IsActive.HasValue) user.IsActive = model.IsActive.Value;

                user.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating teacher {Id}", id);
                return StatusCode(500, new { Error = "Failed to update teacher" });
            }
        }

        [HttpDelete("teachers/{id}")]
        public async Task<ActionResult> DeleteTeacher(Guid id)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == "teacher");
                if (user == null)
                    return NotFound(new { Error = "Teacher not found" });

                _db.Users.Remove(user);
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting teacher {Id}", id);
                return StatusCode(500, new { Error = "Failed to delete teacher" });
            }
        }

        // ── Courses (Subjects) ─────────────────────────────────────────
        [HttpGet("courses")]
        public async Task<ActionResult> GetCourses(
            [FromQuery] int page = 1,
            [FromQuery] int perPage = 20,
            [FromQuery] string? search = null)
        {
            try
            {
                var query = _db.Subjects.Include(s => s.Teacher).AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower();
                    query = query.Where(u => u.Name.ToLower().Contains(s)
                        || u.Teacher.Name.ToLower().Contains(s));
                }

                var total = await query.CountAsync();

                var items = await query
                    .OrderByDescending(s => s.CreatedAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(s => new AdminCourseDto
                    {
                        Id = s.Id,
                        Title = s.Name,
                        Description = s.Description,
                        TeacherName = s.Teacher.Name,
                        Category = s.Category,
                        Level = s.Level,
                        Language = s.Language,
                        Duration = s.Duration,
                        ImageUrl = s.ImageUrl,
                        Icon = s.Icon,
                        Status = s.Status,
                        StudentsCount = s.StudentsCount,
                        Price = s.Price,
                        CreatedAt = s.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new { Data = items, Total = total });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching courses");
                return StatusCode(500, new { Error = "Failed to load courses" });
            }
        }

        [HttpGet("subjects-list")]
        public async Task<ActionResult> GetSubjectsList()
        {
            try
            {
                var items = await _db.Subjects
                    .OrderBy(s => s.Name)
                    .Select(s => new AdminSubjectListDto
                    {
                        Id = s.Id,
                        Title = s.Name,
                        Status = s.Status
                    })
                    .ToListAsync();

                return Ok(new { Data = items });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching subjects list");
                return StatusCode(500, new { Error = "Failed to load subjects list" });
            }
        }

        [HttpPost("courses")]
        public async Task<ActionResult> CreateCourse([FromBody] CreateCourseDto model)
        {
            try
            {
                var teacher = await _db.Users.FirstOrDefaultAsync(u => u.Id == model.TeacherId && u.Role == "teacher");
                if (teacher == null)
                    return BadRequest(new { Error = "Teacher not found" });

                var subject = new Subject
                {
                    Id = Guid.NewGuid(),
                    TeacherId = model.TeacherId,
                    Name = model.Title,
                    Description = model.Description,
                    Icon = model.Icon ?? "📚",
                    Price = model.Price,
                    Category = model.Category,
                    Level = model.Level,
                    Language = model.Language,
                    Duration = model.Duration,
                    ImageUrl = model.ImageUrl,
                    Status = model.Status,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _db.Subjects.Add(subject);
                await _db.SaveChangesAsync();

                var dto = new AdminCourseDto
                {
                    Id = subject.Id,
                    Title = subject.Name,
                    TeacherName = teacher.Name,
                    Category = subject.Category,
                    Level = subject.Level,
                    Language = subject.Language,
                    Duration = subject.Duration,
                    ImageUrl = subject.ImageUrl,
                    Icon = subject.Icon,
                    Status = subject.Status,
                    StudentsCount = subject.StudentsCount,
                    Price = subject.Price,
                    CreatedAt = subject.CreatedAt
                };

                return CreatedAtAction(nameof(GetCourses), new { id = subject.Id }, new { Data = dto });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating course");
                return StatusCode(500, new { Error = "Failed to create course" });
            }
        }

        [HttpPut("courses/{id}")]
        public async Task<ActionResult> UpdateCourse(Guid id, [FromBody] UpdateCourseDto model)
        {
            try
            {
                var subject = await _db.Subjects.Include(s => s.Teacher).FirstOrDefaultAsync(s => s.Id == id);
                if (subject == null)
                    return NotFound(new { Error = "Course not found" });

                if (model.Title != null) subject.Name = model.Title;
                if (model.Description != null) subject.Description = model.Description;
                if (model.Category != null) subject.Category = model.Category;
                if (model.Level != null) subject.Level = model.Level;
                if (model.Language != null) subject.Language = model.Language;
                if (model.Price.HasValue) subject.Price = model.Price.Value;
                if (model.Duration.HasValue) subject.Duration = model.Duration.Value;
                if (model.ImageUrl != null) subject.ImageUrl = model.ImageUrl;
                if (model.Icon != null) subject.Icon = model.Icon;
                if (model.Status != null) subject.Status = model.Status;
                if (model.TeacherId.HasValue)
                {
                    var teacher = await _db.Users.FirstOrDefaultAsync(u => u.Id == model.TeacherId.Value && u.Role == "teacher");
                    if (teacher == null)
                        return BadRequest(new { Error = "Teacher not found" });
                    subject.TeacherId = model.TeacherId.Value;
                }

                subject.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                // Reload teacher if it may have changed
                await _db.Entry(subject).Reference(s => s.Teacher).LoadAsync();

                var dto = new AdminCourseDto
                {
                    Id = subject.Id,
                    Title = subject.Name,
                    TeacherName = subject.Teacher.Name,
                    Category = subject.Category,
                    Level = subject.Level,
                    Language = subject.Language,
                    Duration = subject.Duration,
                    ImageUrl = subject.ImageUrl,
                    Icon = subject.Icon,
                    Status = subject.Status,
                    StudentsCount = subject.StudentsCount,
                    Price = subject.Price,
                    CreatedAt = subject.CreatedAt
                };

                return Ok(new { Data = dto });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating course {Id}", id);
                return StatusCode(500, new { Error = "Failed to update course" });
            }
        }

        [HttpPatch("courses/{id}/publish")]
        public async Task<ActionResult> PublishCourse(Guid id, [FromBody] PublishCourseDto model)
        {
            try
            {
                var subject = await _db.Subjects.FirstOrDefaultAsync(s => s.Id == id);
                if (subject == null)
                    return NotFound(new { Error = "Course not found" });

                subject.Status = model.Status;
                subject.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing course {Id}", id);
                return StatusCode(500, new { Error = "Failed to publish course" });
            }
        }

        [HttpDelete("courses/{id}")]
        public async Task<ActionResult> DeleteCourse(Guid id)
        {
            try
            {
                var subject = await _db.Subjects.Include(s => s.Levels).FirstOrDefaultAsync(s => s.Id == id);
                if (subject == null)
                    return NotFound(new { Error = "Course not found" });

                _db.Subjects.Remove(subject);
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting course {Id}", id);
                return StatusCode(500, new { Error = "Failed to delete course" });
            }
        }

        // ── Enrollments ───────────────────────────────────────────────
        [HttpGet("enrollments")]
        public async Task<ActionResult> GetEnrollments(
            [FromQuery] int page = 1,
            [FromQuery] int perPage = 20,
            [FromQuery] Guid? studentId = null,
            [FromQuery] Guid? subjectId = null)
        {
            try
            {
                var query = _db.Enrollments
                    .Include(e => e.User)
                    .Include(e => e.Subject)
                    .AsQueryable();

                if (studentId.HasValue)
                    query = query.Where(e => e.UserId == studentId.Value);

                if (subjectId.HasValue)
                    query = query.Where(e => e.SubjectId == subjectId.Value);

                var total = await query.CountAsync();

                var items = await query
                    .OrderByDescending(e => e.EnrolledAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(e => new AdminEnrollmentDto
                    {
                        Id = e.Id,
                        StudentId = e.UserId,
                        StudentName = e.User.Name,
                        StudentEmail = e.User.Email,
                        SubjectId = e.SubjectId,
                        SubjectTitle = e.Subject != null ? e.Subject.Name : null,
                        EnrolledAt = e.EnrolledAt
                    })
                    .ToListAsync();

                return Ok(new { Data = items, Total = total });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching enrollments");
                return StatusCode(500, new { Error = "Failed to load enrollments" });
            }
        }

        [HttpPost("enrollments")]
        public async Task<ActionResult> CreateEnrollment([FromBody] CreateEnrollmentDto model)
        {
            try
            {
                var student = await _db.Users.FirstOrDefaultAsync(u => u.Id == model.StudentId && u.Role == "student");
                if (student == null)
                    return BadRequest(new { Error = "Student not found" });

                var subject = await _db.Subjects.FirstOrDefaultAsync(s => s.Id == model.SubjectId);
                if (subject == null)
                    return BadRequest(new { Error = "Subject not found" });

                var exists = await _db.Enrollments.AnyAsync(e =>
                    e.UserId == model.StudentId && e.SubjectId == model.SubjectId);
                if (exists)
                    return Conflict(new { Error = "Enrollment already exists" });

                var enrollment = new Enrollment
                {
                    UserId = model.StudentId,
                    SubjectId = model.SubjectId,
                    EnrolledAt = DateTime.UtcNow
                };

                _db.Enrollments.Add(enrollment);
                await _db.SaveChangesAsync();

                return CreatedAtAction(nameof(GetEnrollments), new { id = enrollment.Id },
                    new { Data = new AdminEnrollmentDto
                    {
                        Id = enrollment.Id,
                        StudentId = enrollment.UserId,
                        StudentName = student.Name,
                        StudentEmail = student.Email,
                        SubjectId = enrollment.SubjectId,
                        SubjectTitle = subject.Name,
                        EnrolledAt = enrollment.EnrolledAt
                    }
                    });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating enrollment");
                return StatusCode(500, new { Error = "Failed to create enrollment" });
            }
        }

        [HttpDelete("enrollments/{id:int}")]
        public async Task<ActionResult> DeleteEnrollment(int id)
        {
            try
            {
                var enrollment = await _db.Enrollments.FirstOrDefaultAsync(e => e.Id == id);
                if (enrollment == null)
                    return NotFound(new { Error = "Enrollment not found" });

                _db.Enrollments.Remove(enrollment);
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting enrollment {Id}", id);
                return StatusCode(500, new { Error = "Failed to delete enrollment" });
            }
        }

        // ── Orders ────────────────────────────────────────────────────
        [HttpGet("orders")]
        public async Task<ActionResult> GetOrders(
            [FromQuery] int page = 1,
            [FromQuery] int perPage = 20,
            [FromQuery] string? search = null)
        {
            try
            {
                var query = _db.Orders.Include(o => o.User).AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower();
                    query = query.Where(o => o.User.Name.ToLower().Contains(s)
                        || o.User.Email.ToLower().Contains(s)
                        || o.OrderNumber.ToLower().Contains(s));
                }

                var total = await query.CountAsync();

                var items = await query
                    .OrderByDescending(o => o.CreatedAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(o => new AdminOrderDto
                    {
                        Id = o.Id,
                        OrderNumber = o.OrderNumber,
                        UserName = o.User.Name,
                        UserEmail = o.User.Email,
                        PaymentMethod = o.PaymentMethod,
                        PaymentStatus = o.PaymentStatus,
                        FinalPrice = o.FinalPrice,
                        CreatedAt = o.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new { Data = items, Total = total });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching orders");
                return StatusCode(500, new { Error = "Failed to load orders" });
            }
        }

        [HttpDelete("orders/{id}")]
        public async Task<ActionResult> DeleteOrder(Guid id)
        {
            try
            {
                var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id);
                if (order == null)
                    return NotFound(new { Error = "Order not found" });

                _db.Orders.Remove(order);
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting order {Id}", id);
                return StatusCode(500, new { Error = "Failed to delete order" });
            }
        }

        // ── Streams ────────────────────────────────────────────────────
        [HttpGet("streams")]
        public async Task<ActionResult> GetStreams(
            [FromQuery] int page = 1,
            [FromQuery] int perPage = 20,
            [FromQuery] string? search = null)
        {
            try
            {
                var query = _db.LiveStreams.Include(ls => ls.Instructor).AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower();
                    query = query.Where(ls => ls.Title.ToLower().Contains(s)
                        || ls.Instructor.Name.ToLower().Contains(s));
                }

                var total = await query.CountAsync();

                var items = await query
                    .OrderByDescending(ls => ls.CreatedAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(ls => new AdminStreamDto
                    {
                        Id = ls.Id,
                        Title = ls.Title,
                        InstructorName = ls.Instructor.Name,
                        Status = ls.Status,
                        ViewerCount = ls.ViewerCount,
                        CreatedAt = ls.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new { Data = items, Total = total });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching streams");
                return StatusCode(500, new { Error = "Failed to load streams" });
            }
        }

        [HttpDelete("streams/{id:int}")]
        public async Task<ActionResult> DeleteStream(int id)
        {
            try
            {
                var stream = await _db.LiveStreams.FirstOrDefaultAsync(ls => ls.Id == id);
                if (stream == null)
                    return NotFound(new { Error = "Stream not found" });

                _db.LiveStreams.Remove(stream);
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting stream {Id}", id);
                return StatusCode(500, new { Error = "Failed to delete stream" });
            }
        }

        // ── Users (create any role) ────────────────────────────────────
        [HttpPost("users")]
        public async Task<ActionResult> CreateUser([FromBody] CreateUserDto model)
        {
            try
            {
                var exists = await _db.Users.AnyAsync(u => u.Email == model.Email);
                if (exists)
                    return Conflict(new { Error = "Email already registered" });

                var user = new User
                {
                    Id = Guid.NewGuid(),
                    Name = model.Name,
                    Email = model.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                    Role = model.Role,
                    PhoneNumber = model.PhoneNumber,
                    Bio = model.Bio,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _db.Users.Add(user);
                await _db.SaveChangesAsync();

                return CreatedAtAction(nameof(GetStudents), new { id = user.Id },
                    new { Data = new AdminUserDto
                    {
                        Id = user.Id,
                        Name = user.Name,
                        Email = user.Email,
                        PhoneNumber = user.PhoneNumber,
                        IsActive = user.IsActive,
                        CreatedAt = user.CreatedAt
                    }
                    });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user");
                return StatusCode(500, new { Error = "Failed to create user" });
            }
        }

        [HttpPatch("users/{id}/toggle-active")]
        public async Task<ActionResult> ToggleUserActive(Guid id)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
                if (user == null)
                    return NotFound(new { Error = "User not found" });

                user.IsActive = !user.IsActive;
                user.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling user active {Id}", id);
                return StatusCode(500, new { Error = "Failed to toggle user status" });
            }
        }

        // ── Accounting ────────────────────────────────────────────
        [HttpGet("accounting/transactions")]
        public async Task<IActionResult> GetAccountingTransactions()
        {
            var items = await _db.AccountingTransactions
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new {
                    t.Id, t.StudentName, t.Date, t.Service, t.Amount, t.Currency,
                    t.Type, t.InvoiceNumber, t.PaymentMethod, t.ContactNumber, t.Notes, t.CreatedAt,
                    t.TeacherId,
                    teacherName = t.Teacher != null ? t.Teacher.Name : (string?)null
                })
                .ToListAsync();
            return Ok(new { data = items });
        }

        [HttpPost("accounting/transactions")]
        public async Task<IActionResult> CreateAccountingTransaction([FromBody] AccountingTransactionDTO model)
        {
            if (string.IsNullOrWhiteSpace(model.StudentName) || string.IsNullOrWhiteSpace(model.Type))
                return BadRequest(new { message = "البيانات المطلوبة ناقصة" });

            var tx = new Models.AccountingTransaction
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
                TeacherId = null
            };

            _db.AccountingTransactions.Add(tx);
            await _db.SaveChangesAsync();
            return Ok(new { data = tx });
        }

        [HttpPut("accounting/transactions/{id}")]
        public async Task<IActionResult> UpdateAccountingTransaction(string id, [FromBody] AccountingTransactionDTO model)
        {
            var tx = await _db.AccountingTransactions.FirstOrDefaultAsync(t => t.Id == id);
            if (tx == null) return NotFound(new { message = "المعاملة غير موجودة" });

            if (!string.IsNullOrEmpty(model.StudentName)) tx.StudentName = model.StudentName;
            if (!string.IsNullOrEmpty(model.Date)) tx.Date = model.Date;
            if (!string.IsNullOrEmpty(model.Service)) tx.Service = model.Service;
            if (model.Amount > 0) tx.Amount = model.Amount;
            if (!string.IsNullOrEmpty(model.Currency)) tx.Currency = model.Currency;
            if (!string.IsNullOrEmpty(model.Type)) tx.Type = model.Type;
            tx.InvoiceNumber = model.InvoiceNumber;
            tx.PaymentMethod = model.PaymentMethod;
            tx.ContactNumber = model.ContactNumber;
            tx.Notes = model.Notes;

            await _db.SaveChangesAsync();
            return Ok(new { data = tx });
        }

        [HttpDelete("accounting/transactions/{id}")]
        public async Task<IActionResult> DeleteAccountingTransaction(string id)
        {
            var tx = await _db.AccountingTransactions.FirstOrDefaultAsync(t => t.Id == id);
            if (tx == null) return NotFound(new { message = "المعاملة غير موجودة" });
            _db.AccountingTransactions.Remove(tx);
            await _db.SaveChangesAsync();
            return Ok(new { message = "تم الحذف بنجاح" });
        }
    }
}
