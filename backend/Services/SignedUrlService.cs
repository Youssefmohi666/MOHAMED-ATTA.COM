using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace elmanassa.Services
{
    /// <summary>
    /// Generates and validates short-lived HMAC-signed tokens for media access.
    /// Token format: base64url(fileId:userId:expiry:hmac)
    /// </summary>
    public interface ISignedUrlService
    {
        string GenerateToken(Guid fileId, Guid userId, int ttlSeconds = 300);
        bool ValidateToken(string token, Guid fileId, Guid userId);
    }

    public class SignedUrlService : ISignedUrlService
    {
        private readonly byte[] _secret;
        private readonly ILogger<SignedUrlService> _logger;

        public SignedUrlService(IConfiguration config, ILogger<SignedUrlService> logger)
        {
            _logger = logger;
            var secret = config["MediaSigning:Secret"]
                ?? config["JwtSettings:Secret"]
                ?? throw new InvalidOperationException("No signing secret configured");
            _secret = Encoding.UTF8.GetBytes(secret);
        }

        public string GenerateToken(Guid fileId, Guid userId, int ttlSeconds = 300)
        {
            var expiry = DateTimeOffset.UtcNow.AddSeconds(ttlSeconds).ToUnixTimeSeconds();
            var payload = $"{fileId}:{userId}:{expiry}";
            var sig = ComputeHmac(payload);
            var raw = $"{payload}:{sig}";
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(raw))
                .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        }

        public bool ValidateToken(string token, Guid fileId, Guid userId)
        {
            try
            {
                // Restore base64url padding
                var padded = token.Replace('-', '+').Replace('_', '/');
                var mod = padded.Length % 4;
                if (mod != 0) padded += new string('=', 4 - mod);

                var raw = Encoding.UTF8.GetString(Convert.FromBase64String(padded));
                var parts = raw.Split(':');
                if (parts.Length != 4) return false;

                var tokenFileId = parts[0];
                var tokenUserId = parts[1];
                var expiry = long.Parse(parts[2]);
                var sig = parts[3];

                // Check expiry
                if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiry)
                {
                    _logger.LogWarning("Expired media token for file {FileId}", fileId);
                    return false;
                }

                // Check file + user match
                if (tokenFileId != fileId.ToString() || tokenUserId != userId.ToString())
                    return false;

                // Verify HMAC
                var payload = $"{tokenFileId}:{tokenUserId}:{expiry}";
                var expected = ComputeHmac(payload);
                return CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(sig),
                    Encoding.UTF8.GetBytes(expected));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Token validation error");
                return false;
            }
        }

        private string ComputeHmac(string payload)
        {
            using var hmac = new HMACSHA256(_secret);
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            return Convert.ToBase64String(hash).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        }
    }
}
