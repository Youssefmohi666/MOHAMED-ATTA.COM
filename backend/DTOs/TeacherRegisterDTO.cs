using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    public class TeacherRegisterDTO
    {
        [Required(ErrorMessage = "Name is required")]
        [StringLength(255)]
        public string Name { get; set; }

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; }

        [Required(ErrorMessage = "Password is required")]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$", ErrorMessage = "Password must contain uppercase, lowercase, and number")]
        public string Password { get; set; }

        [Required(ErrorMessage = "National ID is required")]
        [StringLength(50)]
        public string NationalId { get; set; }

        [Required(ErrorMessage = "Phone number is required")]
        public string PhoneNumber { get; set; }

        [Required(ErrorMessage = "Years of experience is required")]
        [Range(0, 100, ErrorMessage = "Years of experience must be between 0 and 100")]
        public int YearsOfExperience { get; set; }

        [Required(ErrorMessage = "Specialization is required")]
        public string Specialization { get; set; }

        [Required(ErrorMessage = "Bio is required")]
        public string Bio { get; set; }

        [Required(ErrorMessage = "CV URL is required")]
        [Url(ErrorMessage = "CV URL must be a valid URL")]
        public string CvUrl { get; set; }

        public string? AvatarUrl { get; set; }
    }
}
