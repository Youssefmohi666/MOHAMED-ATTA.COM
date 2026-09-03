using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    public class LoginDTO
    {
        [Required(ErrorMessage = "Email is required")]
        public string Email { get; set; }

        [StringLength(255)]
        public string? Password { get; set; }

        // Center code (per-student) — allows login without password if it matches.
        public string? Code { get; set; }
    }
}
