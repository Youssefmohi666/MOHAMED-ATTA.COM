using elmanassa.ApplicationDbContext;
using elmanassa.Repositories;
using elmanassa.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using BCrypt.Net;

namespace elmanassa
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            // configure SQL Server connection
            var connString = builder.Configuration.GetConnectionString("DefaultConnection")
                             ?? throw new InvalidOperationException("Connection string not configured");
            builder.Services.AddDbContext<AppDbContext>(x => x.UseNpgsql(connString));

            // Configure JWT Authentication
            var jwtSettings = builder.Configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret not configured");
            var key = Encoding.ASCII.GetBytes(secretKey);

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = jwtSettings["Issuer"] ?? "elmanassa-api",
                    ValidateAudience = true,
                    ValidAudience = jwtSettings["Audience"] ?? "elmanassa-clients",
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });

            // Register services
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
            builder.Services.AddScoped<IUserRepository, UserRepository>();

            // repositories
            builder.Services.AddScoped<ICourseRepository, CourseRepository>();

            // application services
            builder.Services.AddScoped<ICourseService, CourseService>();
            builder.Services.AddScoped<ITeacherService, TeacherService>();
            builder.Services.AddScoped<IStudentService, StudentService>();
            builder.Services.AddScoped<IOrderService, OrderService>();
            builder.Services.AddScoped<IContentService, ContentService>();
            builder.Services.AddScoped<ILiveStreamService, LiveStreamService>();
            builder.Services.AddScoped<IAiService, AiService>();
            builder.Services.AddScoped<IContactService, ContactService>();

            // Presentation service
            builder.Services.AddScoped<IPresentationService, PresentationService>();

            // Exam service
            builder.Services.AddScoped<IExamService, ExamService>();

            // Media services
            builder.Services.AddScoped<IMediaService, MediaService>();
            builder.Services.AddScoped<IHlsService, HlsService>();
            builder.Services.AddSingleton<ISignedUrlService, SignedUrlService>();

            // Payment service
            builder.Services.AddScoped<IPaymobService, PaymobService>();

            builder.Services.AddHttpClient();
            builder.Services.AddHttpClient("Paymob", client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
            });

            // CORS — allow demo + production frontends
            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    var allowedOrigins = new[]
                    {
                        "https://mohamed-atta.com",
                        "https://www.mohamed-atta.com",
                        "http://localhost:5173",
                        "http://localhost:3000",
                    };
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            // Rate limiting — fixed window per client IP (mitigates brute-force/credential-stuffing)
            builder.Services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                options.AddPolicy("login-limit", httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 5,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0
                        }));
            });

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "JWT Authorization header using the Bearer scheme."
                });

                c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
                    {
                        new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                        {
                            Reference = new Microsoft.OpenApi.Models.OpenApiReference
                            {
                                Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        new string[] { }
                    }
                });
            });

            var app = builder.Build();

            // DB diagnostic endpoints — only available in Development (avoid info disclosure in prod)
            if (app.Environment.IsDevelopment())
            {
                app.MapGet("/api/v1/db-check", async (AppDbContext db) =>
                {
                    try
                    {
                        var canConnect = await db.Database.CanConnectAsync();
                        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
                        var applied = (await db.Database.GetAppliedMigrationsAsync()).ToList();
                        return Results.Ok(new { canConnect, pendingMigrations = pending, appliedMigrations = applied });
                    }
                    catch (Exception ex)
                    {
                        return Results.Ok(new { error = ex.Message, inner = ex.InnerException?.Message });
                    }
                });

                // One-time seed endpoint
                app.MapGet("/api/v1/seed-admin", async (AppDbContext db, IConfiguration cfg) =>
                {
                    var adminEmail = cfg["AdminSeed:Email"];
                    var adminPassword = cfg["AdminSeed:Password"];
                    var adminName = cfg["AdminSeed:Name"] ?? "Admin";

                    if (string.IsNullOrEmpty(adminEmail) || string.IsNullOrEmpty(adminPassword))
                        return Results.BadRequest("AdminSeed config missing");

                    if (db.Users.Any(u => u.Email == adminEmail))
                        return Results.Ok(new { message = "Admin already exists", email = adminEmail });

                    db.Users.Add(new elmanassa.Models.User
                    {
                        Name = adminName,
                        Email = adminEmail,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                        Role = "admin",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    await db.SaveChangesAsync();
                    return Results.Ok(new { message = "Admin created", email = adminEmail });
                });
            }

            if(app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // global exception handler middleware
            app.UseMiddleware<ExceptionHandlerMiddleware>();

            // Configure the HTTP request pipeline.
            app.UseHttpsRedirection();

            app.UseCors();

            app.UseRateLimiter();

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
    }   
}
