using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/admin/employees")]
    [Authorize(Roles = "admin")]
    public class EmployeeController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<EmployeeController> _logger;

        public EmployeeController(AppDbContext db, ILogger<EmployeeController> logger)
        {
            _db = db;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetEmployees(
            [FromQuery] int page = 1,
            [FromQuery] int perPage = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null)
        {
            try
            {
                var query = _db.Employees.AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.Trim().ToLower();
                    query = query.Where(e => e.Name.ToLower().Contains(s)
                        || e.Position.ToLower().Contains(s)
                        || (e.Email != null && e.Email.ToLower().Contains(s))
                        || (e.Department != null && e.Department.ToLower().Contains(s)));
                }

                if (!string.IsNullOrWhiteSpace(status))
                    query = query.Where(e => e.Status == status);

                var total = await query.CountAsync();

                var items = await query
                    .OrderByDescending(e => e.CreatedAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(e => new EmployeeDto
                    {
                        Id = e.Id,
                        Name = e.Name,
                        Position = e.Position,
                        Department = e.Department,
                        Email = e.Email,
                        PhoneNumber = e.PhoneNumber,
                        Salary = e.Salary,
                        HireDate = e.HireDate,
                        Status = e.Status,
                        Notes = e.Notes,
                        CreatedAt = e.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new { data = items, total });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching employees");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetEmployeeStats()
        {
            try
            {
                var employees = await _db.Employees.ToListAsync();

                var stats = new EmployeeStatsDto
                {
                    TotalEmployees = employees.Count,
                    ActiveEmployees = employees.Count(e => e.Status == "active"),
                    OnLeaveEmployees = employees.Count(e => e.Status == "on_leave"),
                    TotalMonthlySalary = employees.Where(e => e.Status != "terminated").Sum(e => e.Salary),
                    ByPosition = employees
                        .GroupBy(e => e.Position)
                        .Select(g => new PositionCountDto
                        {
                            Position = g.Key,
                            Count = g.Count(),
                            TotalSalary = g.Sum(e => e.Salary)
                        })
                        .OrderByDescending(p => p.Count)
                        .ToList()
                };

                return Ok(new { data = stats });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching employee stats");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateEmployee([FromBody] EmployeeCreateDto model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Name) || string.IsNullOrWhiteSpace(model.Position))
                    return BadRequest(new { message = "الاسم والوظيفة مطلوبان" });

                var employee = new Employee
                {
                    Name = model.Name.Trim(),
                    Position = model.Position.Trim(),
                    Department = model.Department,
                    Email = model.Email,
                    PhoneNumber = model.PhoneNumber,
                    Salary = model.Salary,
                    HireDate = NormalizeDate(model.HireDate),
                    Status = model.Status ?? "active",
                    Notes = model.Notes
                };

                _db.Employees.Add(employee);
                await _db.SaveChangesAsync();
                return Ok(new { data = employee });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating employee");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateEmployee(Guid id, [FromBody] EmployeeUpdateDto model)
        {
            try
            {
                var employee = await _db.Employees.FindAsync(id);
                if (employee == null) return NotFound(new { message = "الموظف غير موجود" });

                if (!string.IsNullOrWhiteSpace(model.Name)) employee.Name = model.Name.Trim();
                if (!string.IsNullOrWhiteSpace(model.Position)) employee.Position = model.Position.Trim();
                if (model.Department != null) employee.Department = model.Department;
                if (model.Email != null) employee.Email = model.Email;
                if (model.PhoneNumber != null) employee.PhoneNumber = model.PhoneNumber;
                if (model.Salary.HasValue) employee.Salary = model.Salary.Value;
                if (model.HireDate != null)
                {
                    var d = NormalizeDate(model.HireDate);
                    if (!string.IsNullOrEmpty(d)) employee.HireDate = d;
                }
                if (model.Status != null) employee.Status = model.Status;
                if (model.Notes != null) employee.Notes = model.Notes;

                employee.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return Ok(new { data = employee });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating employee {Id}", id);
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteEmployee(Guid id)
        {
            try
            {
                var employee = await _db.Employees.FindAsync(id);
                if (employee == null) return NotFound(new { message = "الموظف غير موجود" });
                _db.Employees.Remove(employee);
                await _db.SaveChangesAsync();
                return Ok(new { message = "تم الحذف بنجاح" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting employee {Id}", id);
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        private static string NormalizeDate(string? date)
        {
            if (string.IsNullOrWhiteSpace(date)) return DateTime.UtcNow.ToString("yyyy-MM-dd");
            return DateTime.TryParse(date, out var dt) ? dt.ToString("yyyy-MM-dd") : DateTime.UtcNow.ToString("yyyy-MM-dd");
        }
    }
}
