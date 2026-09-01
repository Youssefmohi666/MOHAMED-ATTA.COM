using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    [Table("AttendanceLogs")]
    public class AttendanceLog
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid StudentId { get; set; }
        public User? Student { get; set; }

        public Guid? SubjectId { get; set; }
        public Subject? Subject { get; set; }

        public Guid? ClassRoomId { get; set; }
        public ClassRoom? ClassRoom { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Present";

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime Date { get; set; } = DateTime.UtcNow;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}