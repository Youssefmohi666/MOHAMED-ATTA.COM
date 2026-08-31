using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class Testimonial
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string UserName { get; set; }

        [MaxLength(100)]
        public string? Role { get; set; }

        public string? AvatarUrl { get; set; }

        [Required]
        public string Text { get; set; }

        public int Rating { get; set; } = 5;
        public bool IsActive { get; set; } = true;
        public bool? IsApproved { get; set; }
        
        public Guid? UserId { get; set; }
        [MaxLength(255)]
        public string? StudentName { get; set; }
        [MaxLength(100)]
        public string? JobTitle { get; set; }
        public string? Content { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
