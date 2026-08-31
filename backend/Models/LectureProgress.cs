using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class LectureProgress
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public Guid UserId { get; set; }
        public User User { get; set; }

        [Required]
        public Guid LectureId { get; set; }
        public Lecture Lecture { get; set; }

        public bool Completed { get; set; } = false;
        public int ProgressPct { get; set; } = 0;
        public DateTime LastWatchedAt { get; set; } = DateTime.UtcNow;
    }
}
