using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class BlogPost
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string Title { get; set; }

        public string? Excerpt { get; set; }

        [Required]
        public string Content { get; set; }

        public string? ImageUrl { get; set; }

        public Guid? AuthorId { get; set; }
        public User? Author { get; set; }

        public string? Tags { get; set; } // comma-separated
        public string? Category { get; set; }
        public int Views { get; set; } = 0;
        public string Status { get; set; } = "draft";
        public DateTime? PublishedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
