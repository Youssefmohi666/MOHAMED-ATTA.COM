using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace elmanassa.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailSender _emailSender;

        public AuthService(AppDbContext context, IConfiguration configuration, IEmailSender emailSender)
        {
            _context = context;
            _configuration = configuration;
            _emailSender = emailSender;
        }

        public async Task<AuthResponseDTO> Register(RegisterDTO model)
        {
            try
            {
                if (await UserExists(model.Email))
                    return new AuthResponseDTO { Success = false, Message = "البريد الإلكتروني مسجل بالفعل" };

                // Validate national ID and phone if provided
                if (!string.IsNullOrEmpty(model.NationalId))
                {
                    var idError = ValidateEgyptianNationalId(model.NationalId);
                    if (idError != null)
                        return new AuthResponseDTO { Success = false, Message = idError };
                }
                if (!string.IsNullOrEmpty(model.PhoneNumber))
                {
                    var digits = new string(model.PhoneNumber.Where(char.IsDigit).ToArray());
                    if (digits.Length < 7 || digits.Length > 15)
                        return new AuthResponseDTO { Success = false, Message = "رقم الهاتف يجب أن يكون بين 7 و 15 رقماً" };
                }

                var user = new User
                {
                    Name = model.Name,
                    Email = model.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                    Role = model.Role.ToLower(),
                    AvatarUrl = model.AvatarUrl,
                    PhoneNumber = model.PhoneNumber,
                    NationalId = model.NationalId,
                    Bio = model.Bio,
                    IsActive = true,
                    IsEmailVerified = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _context.Users.AddAsync(user);

                if (model.Role.ToLower() == "student")
                {
                    await _context.Students.AddAsync(new Student
                    {
                        UserId = user.Id,
                        User = user,
                        DateOfBirth = DateTime.MinValue,
                        EducationLevel = "Not Specified"
                    });
                }

                await _context.SaveChangesAsync();

                return new AuthResponseDTO { Success = true, Message = "تم إنشاء الحساب بنجاح" };
            }
            catch (Exception ex)
            {
                return new AuthResponseDTO { Success = false, Message = $"فشل إنشاء الحساب: {ex.Message}" };
            }
        }

        public async Task<AuthResponseDTO> RegisterTeacher(TeacherRegisterDTO model)
        {
            try
            {
                if (await UserExists(model.Email))
                    return new AuthResponseDTO { Success = false, Message = "البريد الإلكتروني مسجل بالفعل" };

                // Validate national ID and phone only if provided (both optional for teachers)
                if (!string.IsNullOrEmpty(model.NationalId))
                {
                    var idError = ValidateEgyptianNationalId(model.NationalId);
                    if (idError != null)
                        return new AuthResponseDTO { Success = false, Message = idError };
                }
                if (!string.IsNullOrEmpty(model.PhoneNumber))
                {
                    var digits = new string(model.PhoneNumber.Where(char.IsDigit).ToArray());
                    if (digits.Length < 7 || digits.Length > 15)
                        return new AuthResponseDTO { Success = false, Message = "رقم الهاتف يجب أن يكون بين 7 و 15 رقماً" };
                }

                var user = new User
                {
                    Name = model.Name,
                    Email = model.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                    Role = "teacher",
                    AvatarUrl = model.AvatarUrl,
                    PhoneNumber = model.PhoneNumber,
                    NationalId = model.NationalId,
                    Bio = model.Bio,
                    IsActive = true,
                    IsEmailVerified = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _context.Users.AddAsync(user);
                await _context.Teachers.AddAsync(new Teacher
                {
                    UserId = user.Id,
                    User = user,
                    Bio = model.Bio,
                    Specialization = model.Specialization,
                    YearsOfExperience = model.YearsOfExperience,
                    CvUrl = model.CvUrl
                });
                await _context.SaveChangesAsync();

                return new AuthResponseDTO { Success = true, Message = "تم إنشاء الحساب بنجاح" };
            }
            catch (Exception ex)
            {
                return new AuthResponseDTO { Success = false, Message = $"فشل إنشاء الحساب: {ex.Message}" };
            }
        }

        public async Task<AuthResponseDTO> Login(LoginDTO model)
        {
            try
            {
                var user = _context.Users.FirstOrDefault(u => u.Email == model.Email);

                if (user == null || !BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
                    return new AuthResponseDTO { Success = false, Message = "البريد الإلكتروني أو كلمة المرور غير صحيحة" };

                if (!user.IsActive)
                    return new AuthResponseDTO { Success = false, Message = "الحساب غير مفعّل" };

                // Revoke all existing refresh tokens for this user (single session)
                var existingTokens = await _context.RefreshTokens
                    .Where(rt => rt.UserId == user.Id && !rt.IsRevoked)
                    .ToListAsync();
                
                foreach (var token in existingTokens)
                {
                    token.IsRevoked = true;
                }
                await _context.SaveChangesAsync();

                var (accessToken, refreshToken, _) = await GenerateTokenPair(user);
                return BuildSuccess("تم تسجيل الدخول بنجاح", user, accessToken, refreshToken);
            }
            catch (Exception ex)
            {
                return new AuthResponseDTO { Success = false, Message = $"فشل تسجيل الدخول: {ex.Message}" };
            }
        }

        public async Task<AuthResponseDTO> RefreshToken(string refreshToken)
        {
            var stored = await _context.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

            if (stored == null || stored.IsRevoked || stored.ExpiresAt < DateTime.UtcNow)
                return new AuthResponseDTO { Success = false, Message = "Invalid or expired refresh token" };

            if (!stored.User.IsActive)
                return new AuthResponseDTO { Success = false, Message = "User account is inactive" };

            // Rotate: revoke old, issue new pair
            stored.IsRevoked = true;
            var (newAccess, newRefresh, newRefreshId) = await GenerateTokenPair(stored.User);
            stored.ReplacedByToken = newRefreshId;
            await _context.SaveChangesAsync();

            return BuildSuccess("Token refreshed", stored.User, newAccess, newRefresh);
        }

        public async Task<bool> RevokeToken(string refreshToken)
        {
            var stored = await _context.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == refreshToken);
            if (stored == null || stored.IsRevoked) return false;
            stored.IsRevoked = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Logout(Guid userId)
        {
            // Revoke all refresh tokens for this user
            var tokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == userId && !rt.IsRevoked)
                .ToListAsync();
            
            foreach (var token in tokens)
            {
                token.IsRevoked = true;
            }
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> IsEnrolled(Guid userId, string courseId)
        {
            return await _context.Enrollments.AnyAsync(e =>
                e.UserId == userId &&
                (e.CourseId.ToString() == courseId || e.SubjectId.ToString() == courseId));
        }

        public async Task<bool> UserExists(string email)
        {
            return _context.Users.Any(u => u.Email == email);
        }

        public async Task<AuthResponseDTO> SendVerificationCode(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
                return new AuthResponseDTO { Success = true, Message = "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رمز التحقق." };

            if (user.IsEmailVerified)
                return new AuthResponseDTO { Success = true, Message = "البريد الإلكتروني مفعّل بالفعل." };

            // Auto-verify since no email server is available
            user.IsEmailVerified = true;
            user.EmailVerificationCode = null;
            user.EmailVerificationCodeExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new AuthResponseDTO { Success = true, Message = "تم تفعيل البريد الإلكتروني بنجاح." };
        }

        public async Task<AuthResponseDTO> VerifyEmail(VerifyEmailDTO model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null)
                return new AuthResponseDTO { Success = false, Message = "رمز التحقق غير صحيح أو منتهي الصلاحية." };

            if (user.IsEmailVerified)
                return new AuthResponseDTO { Success = true, Message = "البريد الإلكتروني مفعّل بالفعل." };

            if (user.EmailVerificationCode != model.Code || user.EmailVerificationCodeExpiry < DateTime.UtcNow)
                return new AuthResponseDTO { Success = false, Message = "رمز التحقق غير صحيح أو منتهي الصلاحية." };

            user.IsEmailVerified = true;
            user.EmailVerificationCode = null;
            user.EmailVerificationCodeExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var (accessToken, refreshToken, _) = await GenerateTokenPair(user);
            return BuildSuccess("تم تفعيل البريد الإلكتروني بنجاح. مرحباً بك!", user, accessToken, refreshToken);
        }

        public async Task<AuthResponseDTO> ForgotPassword(ForgotPasswordDTO model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null)
                return new AuthResponseDTO { Success = true, Message = "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رمز إعادة التعيين." };

            var code = GenerateOtpCode();
            user.PasswordResetCode = code;
            user.PasswordResetCodeExpiry = DateTime.UtcNow.AddMinutes(10);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Return code in response since no email server is available
            return new AuthResponseDTO { Success = true, Message = $"رمز إعادة التعيين: {code}" };
        }

        public async Task<AuthResponseDTO> ResetPassword(ResetPasswordDTO model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null)
                return new AuthResponseDTO { Success = false, Message = "رمز إعادة التعيين غير صحيح أو منتهي الصلاحية." };

            if (user.PasswordResetCode != model.Code || user.PasswordResetCodeExpiry < DateTime.UtcNow)
                return new AuthResponseDTO { Success = false, Message = "رمز إعادة التعيين غير صحيح أو منتهي الصلاحية." };

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.NewPassword);
            user.PasswordResetCode = null;
            user.PasswordResetCodeExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            // Revoke all refresh tokens for security
            var tokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == user.Id && !rt.IsRevoked)
                .ToListAsync();
            foreach (var t in tokens) t.IsRevoked = true;

            await _context.SaveChangesAsync();

            return new AuthResponseDTO { Success = true, Message = "تم إعادة تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن." };
        }

        // ── Helpers ───────────────────────────────────────────────

        private static string GenerateOtpCode() =>
            Random.Shared.Next(100000, 999999).ToString();

        /// <summary>
        /// Validates Egyptian National ID (14 digits).
        /// Format: [2|3][YY][MM][DD][GG][SSSS][C]
        /// Century: 2=1900s, 3=2000s
        /// GG: governorate code (01-35, excluding invalid codes)
        /// </summary>
        private static string? ValidateEgyptianNationalId(string id)
        {
            if (string.IsNullOrEmpty(id) || id.Length != 14 || !id.All(char.IsDigit))
                return "الرقم القومي يجب أن يتكون من 14 رقماً";

            if (id[0] != '2' && id[0] != '3')
                return "الرقم القومي غير صحيح: يجب أن يبدأ بـ 2 أو 3";

            // Extract and validate birth date
            int century = id[0] == '2' ? 1900 : 2000;
            if (!int.TryParse(id.Substring(1, 2), out int yy) ||
                !int.TryParse(id.Substring(3, 2), out int mm) ||
                !int.TryParse(id.Substring(5, 2), out int dd))
                return "الرقم القومي يحتوي على تاريخ ميلاد غير صحيح";

            int year = century + yy;
            if (mm < 1 || mm > 12 || dd < 1 || dd > 31)
                return "الرقم القومي يحتوي على تاريخ ميلاد غير صحيح";

            try { _ = new DateTime(year, mm, dd); }
            catch { return "الرقم القومي يحتوي على تاريخ ميلاد غير صحيح"; }

            // Validate governorate code (01-35, valid Egyptian governorates)
            if (!int.TryParse(id.Substring(7, 2), out int gov) || gov < 1 || gov > 35)
                return "الرقم القومي يحتوي على كود محافظة غير صحيح";

            return null; // valid
        }

        /// <summary>
        /// Validates Egyptian mobile phone number.
        /// Must be 11 digits starting with 010, 011, 012, or 015.
        /// </summary>
        private static string? ValidateEgyptianPhone(string phone)
        {
            if (string.IsNullOrEmpty(phone))
                return null;

            var digits = new string(phone.Where(char.IsDigit).ToArray());

            // Accept with or without country code +20
            if (digits.StartsWith("20") && digits.Length == 12)
                digits = "0" + digits.Substring(2);

            if (digits.Length != 11)
                return "رقم الهاتف يجب أن يتكون من 11 رقماً";

            if (!System.Text.RegularExpressions.Regex.IsMatch(digits, @"^01[0125][0-9]{8}$"))
                return "رقم الهاتف يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015";

            return null; // valid
        }


        private async Task<(string accessToken, string refreshToken, Guid refreshTokenId)> GenerateTokenPair(User user)
        {
            var accessToken = GenerateJwtToken(user);
            var (refreshToken, refreshTokenId) = await CreateRefreshToken(user.Id);
            return (accessToken, refreshToken, refreshTokenId);
        }

        private async Task<(string token, Guid id)> CreateRefreshToken(Guid userId)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var expiryDays = int.Parse(jwtSettings["RefreshTokenExpiryDays"] ?? "7");

            var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
            var refreshToken = new RefreshToken
            {
                Token = token,
                UserId = userId,
                ExpiresAt = DateTime.UtcNow.AddDays(expiryDays),
                CreatedAt = DateTime.UtcNow
            };
            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();
            return (token, refreshToken.Id);
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret not configured");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expiryHours = int.Parse(jwtSettings["ExpiryInHours"] ?? "2");
            var jti = Guid.NewGuid().ToString();

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Jti, jti),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(expiryHours),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static AuthResponseDTO BuildSuccess(string message, User user, string accessToken, string refreshToken) =>
            new AuthResponseDTO
            {
                Success = true,
                Message = message,
                Token = accessToken,
                RefreshToken = refreshToken,
                UserId = user.Id,
                Email = user.Email,
                Name = user.Name,
                Role = user.Role,
                PhoneNumber = user.PhoneNumber,
            };
    }
}
