using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace elmanassa.DTOs
{
    public class RegisterDTO
    {
        [Required(ErrorMessage = "Name is required")]
        [StringLength(255)]
        public string Name { get; set; }

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; }

        [Required(ErrorMessage = "Password is required")]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$",
            ErrorMessage = "Password must contain uppercase, lowercase, and number")]
        public string Password { get; set; }

        [Required(ErrorMessage = "Role is required")]
        [RegularExpression(@"^(student|teacher|admin)$",
            ErrorMessage = "Role must be 'student', 'teacher' or 'admin'")]
        public string Role { get; set; }

        // optional metadata
        public string? AvatarUrl { get; set; }
        public string? PhoneNumber { get; set; }
        public string? NationalId { get; set; }
        public string? Bio { get; set; }
    }
}
