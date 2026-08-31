using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class Review
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

        [Required]
        [Range(1, 5)]
        public int Rating { get; set; }

        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
