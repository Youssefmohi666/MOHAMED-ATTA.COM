using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class CurriculumLecture
    {
        [Key]
        public int Id { get; set; }

        public int SectionId { get; set; }
        public CurriculumSection Section { get; set; }

        [Required]
        [MaxLength(500)]
        public string Title { get; set; }

        public string? Duration { get; set; }
        public string? VideoUrl { get; set; }
        public bool IsPreview { get; set; } = false;
        public int SortOrder { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
