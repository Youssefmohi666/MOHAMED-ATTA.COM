using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class CurriculumSection
    {
        [Key]
        public int Id { get; set; }

        public int CourseId { get; set; }
        public Course Course { get; set; }

        [Required]
        [MaxLength(255)]
        public string Title { get; set; }

        public int SortOrder { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<CurriculumLecture> Lectures { get; set; }
    }
}
