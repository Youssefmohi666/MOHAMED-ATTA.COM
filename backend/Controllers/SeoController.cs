using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace elmanassa.Controllers
{
    /// <summary>
    /// Public SEO metadata endpoint powering sitemap generation on the frontend.
    /// </summary>
    [ApiController]
    [Route("api/v1/seo")]
    public class SeoController : ControllerBase
    {
        private readonly ICourseService _courseService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SeoController> _logger;

        public SeoController(ICourseService courseService, IConfiguration configuration, ILogger<SeoController> logger)
        {
            _courseService = courseService;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Get a compact sitemap-shaped list of all published subjects (public, no auth).
        /// </summary>
        [HttpGet("sitemap")]
        public async Task<ActionResult<ApiResponse<SeoSitemapDTO>>> GetSitemap()
        {
            try
            {
                var baseUrl = _configuration["App:FrontendUrl"]
                              ?? $"{HttpContext.Request.Scheme}://{HttpContext.Request.Host}";
                baseUrl = baseUrl.TrimEnd('/');

                var courses = await _courseService.GetSeoSubjectsAsync();

                foreach (var c in courses)
                {
                    if (!c.Url.StartsWith("http"))
                        c.Url = baseUrl + c.Url;
                }

                var data = new SeoSitemapDTO
                {
                    SiteName = _configuration["Branding:SiteName"] ?? "منصة تعليمية",
                    BaseUrl = baseUrl,
                    StaticRouteCount = 10,
                    Courses = courses
                };

                return Ok(new ApiResponse<SeoSitemapDTO>(data));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching SEO sitemap data");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred while fetching sitemap data", "SERVER_ERROR", false));
            }
        }
    }
}
