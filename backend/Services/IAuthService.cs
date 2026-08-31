using elmanassa.DTOs;

namespace elmanassa.Services
{
    public interface IAuthService
    {
        Task<AuthResponseDTO> Register(RegisterDTO model);
        Task<AuthResponseDTO> RegisterTeacher(TeacherRegisterDTO model);
        Task<AuthResponseDTO> Login(LoginDTO model);
        Task<bool> UserExists(string email);
        Task<AuthResponseDTO> RefreshToken(string refreshToken);
        Task<bool> RevokeToken(string refreshToken);
        Task<bool> Logout(Guid userId);
        Task<bool> IsEnrolled(Guid userId, string courseId);

        // Email verification
        Task<AuthResponseDTO> SendVerificationCode(string email);
        Task<AuthResponseDTO> VerifyEmail(VerifyEmailDTO model);

        // Password reset
        Task<AuthResponseDTO> ForgotPassword(ForgotPasswordDTO model);
        Task<AuthResponseDTO> ResetPassword(ResetPasswordDTO model);
    }
}
