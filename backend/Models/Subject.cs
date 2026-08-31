using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class Subject
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid TeacherId { get; set; }
        public User Teacher { get; set; }

        [Required]
        [MaxLength(255)]
        public string Name { get; set; }

        public string? Description { get; set; }
        public string Icon { get; set; } = "📚";
        public int StudentsCount { get; set; }
        public string Status { get; set; } = "draft"; // draft, published, archived, pending

        // Admin-required fields
        public decimal Price { get; set; }
        [MaxLength(100)]
        public string? Category { get; set; }
        [MaxLength(50)]
        public string? Level { get; set; }
        [MaxLength(50)]
        public string? Language { get; set; }
        public int Duration { get; set; } // hours
        public string? ImageUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Level> Levels { get; set; }
    }
}
