using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    public class Course
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string Title { get; set; }

        public string? Description { get; set; }

        [Required]
        [MaxLength(100)]
        public string Category { get; set; }

        [Required]
        public Guid InstructorId { get; set; }
        public User Instructor { get; set; }

        public decimal Rating { get; set; } = 0;
        public int Duration { get; set; } // hours
        public int LecturesCount { get; set; }
        public string Level { get; set; } = "مبتدئ";
        public string Language { get; set; } = "العربية";
        public int StudentsCount { get; set; }
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public string Status { get; set; } = "draft"; // draft,published,archived
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<CurriculumSection> CurriculumSections { get; set; }
        public ICollection<Enrollment> Enrollments { get; set; }
    }
}
