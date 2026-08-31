using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    public class RefreshTokenDTO
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }
}
