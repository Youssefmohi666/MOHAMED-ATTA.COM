using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    [Table("StudentGroupMembers")]
    public class StudentGroupMember
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public Guid StudentGroupId { get; set; }
        public StudentGroup StudentGroup { get; set; }

        [Required]
        public Guid StudentId { get; set; }
        public User Student { get; set; }

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}