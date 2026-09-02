using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    [Table("StudentGroups")]
    public class StudentGroup
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [ForeignKey("Teacher")]
        public Guid TeacherId { get; set; }
        public User Teacher { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public Guid? SubjectId { get; set; }
        public Subject? Subject { get; set; }

        public string Color { get; set; } = "#6366f1";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<StudentGroupMember> Members { get; set; } = new List<StudentGroupMember>();
    }
}