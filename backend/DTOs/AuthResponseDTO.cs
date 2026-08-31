namespace elmanassa.DTOs
{
    public class AuthResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string? Token { get; set; }
        public string? RefreshToken { get; set; }
        public Guid UserId { get; set; }
        public string? Email { get; set; }
        public string? Name { get; set; }
        public string? Role { get; set; }
        // Set to true when login fails because email is not verified
        public bool RequiresEmailVerification { get; set; }
        public string? PhoneNumber { get; set; }
    }
}
