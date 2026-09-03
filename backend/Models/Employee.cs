using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class Employee
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string Position { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Department { get; set; }

        [MaxLength(255)]
        public string? Email { get; set; }

        [MaxLength(30)]
        public string? PhoneNumber { get; set; }

        /// <summary>Monthly salary</summary>
        public decimal Salary { get; set; }

        /// <summary>yyyy-MM-dd</summary>
        [MaxLength(10)]
        public string HireDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");

        [MaxLength(20)]
        public string Status { get; set; } = "active"; // active, on_leave, terminated

        [MaxLength(500)]
        public string? Notes { get; set; }

        /// <summary>Whether the current month's salary has been paid</summary>
        public bool SalaryPaid { get; set; } = false;

        /// <summary>yyyy-MM-dd of last salary payment</summary>
        [MaxLength(10)]
        public string? LastPaidDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
