using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        [HttpPost("signup")]
        public async Task<ActionResult<AuthResponseDTO>> Signup([FromBody] RegisterDTO model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var result = await _authService.Register(model);
                return result.Success ? Ok(result) : BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration");
                return StatusCode(500, new AuthResponseDTO { Success = false, Message = "An error occurred during registration" });
            }
        }

        [HttpPost("signup/teacher")]
        public async Task<ActionResult<AuthResponseDTO>> SignupTeacher([FromBody] TeacherRegisterDTO model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var result = await _authService.RegisterTeacher(model);
                return result.Success ? Ok(result) : BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during teacher registration");
                return StatusCode(500, new AuthResponseDTO { Success = false, Message = "An error occurred during teacher registration" });
            }
        }

        [HttpPost("login")]
        [EnableRateLimiting("login-limit")]
        public async Task<ActionResult<AuthResponseDTO>> Login([FromBody] LoginDTO model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var result = await _authService.Login(model);
                return result.Success ? Ok(result) : Unauthorized(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login");
                return StatusCode(500, new AuthResponseDTO { Success = false, Message = "An error occurred during login" });
            }
        }

        /// <summary>
        /// Exchange a valid refresh token for a new access + refresh token pair.
        /// </summary>
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenDTO model)
        {
            if (string.IsNullOrWhiteSpace(model?.RefreshToken))
                return BadRequest(new { message = "Refresh token is required" });

            var result = await _authService.RefreshToken(model.RefreshToken);
            return result.Success ? Ok(result) : Unauthorized(new { message = result.Message });
        }

        /// <summary>
        /// Revoke a refresh token (logout). Invalidates the token server-side.
        /// </summary>
        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenDTO model)
        {
            // Revoke all tokens for current user if JWT is available
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(userIdStr, out var userId))
            {
                await _authService.Logout(userId);
            }
            else if (!string.IsNullOrWhiteSpace(model?.RefreshToken))
            {
                // Fallback: revoke specific token
                await _authService.RevokeToken(model.RefreshToken);
            }

            return Ok(new { message = "تم تسجيل الخروج بنجاح" });
        }

        /// <summary>
        /// Validate that the authenticated user is enrolled in a course.
        /// Used by the video viewer before granting access.
        /// </summary>
        [HttpGet("session/validate")]
        [Authorize]
        public async Task<IActionResult> ValidateSession([FromQuery] string courseId)
        {
            if (string.IsNullOrWhiteSpace(courseId))
                return BadRequest(new { message = "courseId is required" });

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var role = User.FindFirstValue(ClaimTypes.Role);

            // Teachers and admins always have access
            if (role == "teacher" || role == "admin")
                return Ok(new { enrolled = true });

            var enrolled = await _authService.IsEnrolled(userId, courseId);
            return Ok(new { enrolled });
        }

        [HttpGet("check-email")]
        public async Task<IActionResult> CheckEmail([FromQuery] string email)
        {
            if (string.IsNullOrEmpty(email)) return BadRequest(new { message = "Email is required" });
            try
            {
                var exists = await _authService.UserExists(email);
                return Ok(new { exists });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking email");
                return StatusCode(500, new { message = "An error occurred while checking email" });
            }
        }

        [HttpPost("send-verification")]
        public async Task<IActionResult> SendVerification([FromBody] ResendVerificationDTO model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _authService.SendVerificationCode(model.Email);
            return Ok(result);
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDTO model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _authService.VerifyEmail(model);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDTO model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _authService.ForgotPassword(model);
            return Ok(result);
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDTO model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _authService.ResetPassword(model);
            return result.Success ? Ok(result) : BadRequest(result);
        }

    }
}
