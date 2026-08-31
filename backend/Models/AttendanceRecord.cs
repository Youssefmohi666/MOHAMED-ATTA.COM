using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class AttendanceRecord
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid StudentId { get; set; }
        public User Student { get; set; }

        [Required]
        public Guid SubjectId { get; set; }
        public Subject Subject { get; set; }

        /// <summary>yyyy-MM-dd</summary>
        [Required]
        [MaxLength(10)]
        public string Date { get; set; } = string.Empty;

        /// <summary>present, absent, late, excused</summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "present";

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
