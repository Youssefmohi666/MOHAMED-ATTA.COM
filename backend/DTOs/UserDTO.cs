namespace elmanassa.DTOs
{
    public class UserDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? NationalId { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Bio { get; set; }
        public string Role { get; set; } = "student";
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; }
    }

    public class UserUpdateDTO
    {
        public string? Name { get; set; }
        public string? PhoneNumber { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Bio { get; set; }
    }
}
