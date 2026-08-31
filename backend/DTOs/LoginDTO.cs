using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    public class LoginDTO
    {
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; }

        [Required(ErrorMessage = "Password is required")]
        [StringLength(255)]
        public string Password { get; set; }
    }
}
