using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    public class User
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(255)]
        public string Name { get; set; }

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; }

        [Required]
        [MaxLength(255)]
        public string PasswordHash { get; set; }

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "student"; // student, teacher, admin

        public string? AvatarUrl { get; set; }
        public string? PhoneNumber { get; set; }
        [MaxLength(50)]
        public string? NationalId { get; set; }
        public string? Bio { get; set; }

        public bool IsActive { get; set; } = true;
        public bool IsEmailVerified { get; set; } = false;

        public string? EmailVerificationCode { get; set; }
        public DateTime? EmailVerificationCodeExpiry { get; set; }

        public string? PasswordResetCode { get; set; }
        public DateTime? PasswordResetCodeExpiry { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
