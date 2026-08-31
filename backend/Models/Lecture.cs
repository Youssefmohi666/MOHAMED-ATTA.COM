using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class Lecture
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid LevelId { get; set; }
        public Level Level { get; set; }

        [Required]
        [MaxLength(500)]
        public string Title { get; set; }

        public string Duration { get; set; } = "00:00";
        public string? VideoUrl { get; set; }
        public int SortOrder { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
