using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;

namespace elmanassa
{
    /// <summary>
    /// Allows authorized media endpoints to be consumed by <img>/<video> tags that
    /// cannot send an Authorization header. When no Authorization header is present,
    /// the JWT is read from the ?token= query parameter and validated against the
    /// same TokenValidationParameters as the JwtBearer scheme.
    ///
    /// ONLY applies to /api/v1/media/* paths. Invalid/missing tokens leave the
    /// context unauthenticated so [Authorize] still protects the endpoints.
    /// </summary>
    public class MediaQueryTokenMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly TokenValidationParameters _validation;

        public MediaQueryTokenMiddleware(RequestDelegate next, TokenValidationParameters validation)
        {
            _next = next;
            _validation = validation;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value ?? string.Empty;
            if (path.StartsWith("/api/v1/media", StringComparison.OrdinalIgnoreCase)
                && context.User.Identity?.IsAuthenticated != true
                && string.IsNullOrEmpty(context.Request.Headers.Authorization))
            {
                var token = context.Request.Query["token"].FirstOrDefault();
                if (!string.IsNullOrEmpty(token))
                {
                    try
                    {
                        var handler = new JwtSecurityTokenHandler();
                        var principal = handler.ValidateToken(token, _validation, out _);
                        context.User = principal;
                    }
                    catch
                    {
                        // Invalid or expired token — leave unauthenticated so [Authorize] rejects.
                    }
                }
            }

            await _next(context);
        }
    }
}