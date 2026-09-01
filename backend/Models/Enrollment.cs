using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    public class Enrollment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public Guid UserId { get; set; }
        public User User { get; set; }

        public int? CourseId { get; set; }
        public Course Course { get; set; }

        public Guid? SubjectId { get; set; }
        public Subject Subject { get; set; }

        public Guid? ClassRoomId { get; set; }

        public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    }
}
