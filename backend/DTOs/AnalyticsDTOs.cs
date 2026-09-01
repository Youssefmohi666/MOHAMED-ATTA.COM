using System;
using System.Collections.Generic;

namespace elmanassa.DTOs
{
    public class AnalyticsOverviewDTO
    {
        public int TotalStudents { get; set; }
        public int TotalAssessments { get; set; }
        public int TotalClassrooms { get; set; }
        public decimal AverageGrade { get; set; }
        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
        public int LateCount { get; set; }
        public double AttendanceRate { get; set; }
        public List<AssessmentSummaryDTO> RecentAssessments { get; set; } = new();
    }

    public class AssessmentSummaryDTO
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public decimal MaxGrade { get; set; }
        public DateTime Date { get; set; }
        public string? SubjectName { get; set; }
        public int GradesCount { get; set; }
        public decimal AverageGrade { get; set; }
    }

    public class AssessmentDTO
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public Guid SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public Guid? ClassRoomId { get; set; }
        public string? ClassRoomName { get; set; }
        public decimal MaxGrade { get; set; }
        public DateTime Date { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<AssessmentGradeDTO> Grades { get; set; } = new();
    }

    public class AssessmentCreateDTO
    {
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = "Quiz";
        public decimal MaxGrade { get; set; } = 100;
        public Guid? ClassRoomId { get; set; }
        public Guid SubjectId { get; set; }
        public DateTime? Date { get; set; }
    }

    public class AssessmentGradeDTO
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public decimal Grade { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AssessmentGradeCreateDTO
    {
        public Guid StudentId { get; set; }
        public decimal Grade { get; set; }
    }

    public class ClassroomDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public Guid SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public DateTime CreatedAt { get; set; }
        public int StudentsCount { get; set; }
    }

    public class ClassroomCreateDTO
    {
        public string Name { get; set; } = string.Empty;
        public Guid SubjectId { get; set; }
    }

    public class AttendanceLogCreateDTO
    {
        public Guid StudentId { get; set; }
        public Guid? SubjectId { get; set; }
        public Guid? ClassRoomId { get; set; }
        public string Status { get; set; } = "Present";
        public DateTime? Date { get; set; }
        public string? Notes { get; set; }
    }

    public class AttendanceLogDTO
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string? Notes { get; set; }
    }

    public class StudentAnalyticsDTO
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public int TotalAssessments { get; set; }
        public decimal AverageGrade { get; set; }
        public double? AttendanceRate { get; set; }
        public List<AssessmentGradeDTO> Grades { get; set; } = new();
        public List<AttendanceLogDTO> Attendance { get; set; } = new();
    }
}