using System;
using System.Collections.Generic;

namespace elmanassa.DTOs
{
    // ── Attendance ────────────────────────────────────────────────
    public class AttendanceRecordDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string? StudentName { get; set; }
        public string? StudentEmail { get; set; }
        public Guid SubjectId { get; set; }
        public string Date { get; set; } = string.Empty;
        public string Status { get; set; } = "present";
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AttendanceUpsertDto
    {
        public Guid StudentId { get; set; }
        public Guid SubjectId { get; set; }
        public string Date { get; set; } = string.Empty;
        public string Status { get; set; } = "present";
        public string? Notes { get; set; }
    }

    public class AttendanceStudentDto
    {
        public Guid StudentId { get; set; }
        public string? StudentName { get; set; }
        public string? StudentEmail { get; set; }
        public string Status { get; set; } = "unmarked";
    }

    public class AttendanceStatsDto
    {
        public Guid StudentId { get; set; }
        public string? StudentName { get; set; }
        public int Present { get; set; }
        public int Absent { get; set; }
        public int Late { get; set; }
        public int Excused { get; set; }
        public int Total { get; set; }
        public decimal AttendanceRate { get; set; }
    }

    // ── Employees ─────────────────────────────────────────────────
    public class EmployeeDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public decimal Salary { get; set; }
        public string HireDate { get; set; } = string.Empty;
        public string Status { get; set; } = "active";
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class EmployeeCreateDto
    {
        public string Name { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public decimal Salary { get; set; }
        public string? HireDate { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
    }

    public class EmployeeUpdateDto
    {
        public string? Name { get; set; }
        public string? Position { get; set; }
        public string? Department { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public decimal? Salary { get; set; }
        public string? HireDate { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
    }

    public class EmployeeStatsDto
    {
        public int TotalEmployees { get; set; }
        public int ActiveEmployees { get; set; }
        public int OnLeaveEmployees { get; set; }
        public decimal TotalMonthlySalary { get; set; }
        public List<PositionCountDto> ByPosition { get; set; } = new();
    }

    public class PositionCountDto
    {
        public string Position { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal TotalSalary { get; set; }
    }
}
