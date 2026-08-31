using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class ContactMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string Name { get; set; }

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; }

        [MaxLength(50)]
        public string? Type { get; set; } = "general";

        [MaxLength(500)]
        public string? Subject { get; set; }

        [Required]
        public string Message { get; set; }

        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
