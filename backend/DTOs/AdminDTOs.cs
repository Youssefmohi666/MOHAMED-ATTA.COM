using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    // ── Stats ──────────────────────────────────────────────────────
    public class AdminStatsDto
    {
        public int Students { get; set; }
        public int Teachers { get; set; }
        public int Courses { get; set; }
        public int Orders { get; set; }
        public int Streams { get; set; }
        public decimal Revenue { get; set; }
    }

    // ── Students & Teachers (shared shape) ─────────────────────────
    public class AdminUserDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? AvatarUrl { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AdminListDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string? Email { get; set; }
    }

    // ── Courses (Subjects) ─────────────────────────────────────────
    public class AdminCourseDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string? Description { get; set; }
        public string TeacherName { get; set; }
        public string? Category { get; set; }
        public string? Level { get; set; }
        public string? Language { get; set; }
        public int Duration { get; set; }
        public string? ImageUrl { get; set; }
        public string? Icon { get; set; }
        public string Status { get; set; }
        public int StudentsCount { get; set; }
        public decimal Price { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AdminSubjectListDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string Status { get; set; }
    }

    public class CreateCourseDto
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; }

        [MaxLength(5000)]
        public string? Description { get; set; }

        [MaxLength(100)]
        public string? Category { get; set; }

        [MaxLength(50)]
        public string? Level { get; set; }

        [MaxLength(50)]
        public string? Language { get; set; }

        public decimal Price { get; set; }

        public int Duration { get; set; }

        [MaxLength(1000)]
        public string? ImageUrl { get; set; }

        [MaxLength(50)]
        public string? Icon { get; set; }

        public string Status { get; set; } = "draft";

        [Required]
        public Guid TeacherId { get; set; }
    }

    public class UpdateCourseDto
    {
        [MaxLength(200)]
        public string? Title { get; set; }

        [MaxLength(5000)]
        public string? Description { get; set; }

        [MaxLength(100)]
        public string? Category { get; set; }

        [MaxLength(50)]
        public string? Level { get; set; }

        [MaxLength(50)]
        public string? Language { get; set; }

        public decimal? Price { get; set; }

        public int? Duration { get; set; }

        [MaxLength(1000)]
        public string? ImageUrl { get; set; }

        [MaxLength(50)]
        public string? Icon { get; set; }

        public string? Status { get; set; }

        public Guid? TeacherId { get; set; }
    }

    public class PublishCourseDto
    {
        [Required]
        public string Status { get; set; }
    }

    // ── Enrollments ────────────────────────────────────────────────
    public class AdminEnrollmentDto
    {
        public int Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentName { get; set; }
        public string? StudentEmail { get; set; }
        public Guid? SubjectId { get; set; }
        public string? SubjectTitle { get; set; }
        public DateTime EnrolledAt { get; set; }
    }

    public class CreateEnrollmentDto
    {
        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }
    }

    // ── Orders ─────────────────────────────────────────────────────
    public class AdminOrderDto
    {
        public Guid Id { get; set; }
        public string OrderNumber { get; set; }
        public string UserName { get; set; }
        public string? UserEmail { get; set; }
        public string PaymentMethod { get; set; }
        public string PaymentStatus { get; set; }
        public decimal FinalPrice { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ── Streams ────────────────────────────────────────────────────
    public class AdminStreamDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string InstructorName { get; set; }
        public string Status { get; set; }
        public int ViewerCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ── Users (create) ─────────────────────────────────────────────
    public class CreateUserDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(8)]
        public string Password { get; set; }

        [Required]
        public string Role { get; set; }

        public string? PhoneNumber { get; set; }

        [MaxLength(2000)]
        public string? Bio { get; set; }
    }

    public class UpdateUserDto
    {
        [MaxLength(100)]
        public string? Name { get; set; }

        [EmailAddress]
        public string? Email { get; set; }

        [MinLength(8)]
        public string? Password { get; set; }

        public string? PhoneNumber { get; set; }

        [MaxLength(2000)]
        public string? Bio { get; set; }

        public bool? IsActive { get; set; }
    }
}
