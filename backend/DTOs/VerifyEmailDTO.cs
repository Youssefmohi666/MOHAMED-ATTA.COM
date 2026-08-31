using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    public class VerifyEmailDTO
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [StringLength(6, MinimumLength = 6)]
        public string Code { get; set; }
    }

    public class ResendVerificationDTO
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }
    }
}
