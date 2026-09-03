using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1")]
    [AllowAnonymous]
    public class ContentController : ControllerBase
    {
        private readonly IContentService _contentService;
        private readonly ILogger<ContentController> _logger;

        public ContentController(IContentService contentService, ILogger<ContentController> logger)
        {
            _contentService = contentService;
            _logger = logger;
        }

        /// <summary>
        /// Get published blog posts
        /// </summary>
        [HttpGet("blog")]
        public async Task<ActionResult<ApiResponse<List<BlogPostDTO>>>> GetBlogPosts(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 10)
        {
            try
            {
                var posts = await _contentService.GetBlogPostsAsync(page, per_page);
                var total = await _contentService.GetBlogPostCountAsync();

                return Ok(new ApiResponse<List<BlogPostDTO>>(posts, true, total)
                {
                    Meta = new ApiMeta { Page = page, PerPage = per_page, Total = total }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching blog posts");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get blog post by ID
        /// </summary>
        [HttpGet("blog/{id}")]
        public async Task<ActionResult<ApiResponse<BlogPostDTO>>> GetBlogPost(int id)
        {
            try
            {
                var post = await _contentService.GetBlogPostByIdAsync(id);

                if (post == null)
                    return NotFound(new ApiResponse<object>(
                        "Blog post not found", "BLOG_POST_NOT_FOUND", false));

                return Ok(new ApiResponse<BlogPostDTO>(post));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching blog post");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get subscription plans
        /// </summary>
        [HttpGet("plans")]
        public async Task<ActionResult<ApiResponse<List<SubscriptionPlanDTO>>>> GetPlans()
        {
            try
            {
                var plans = await _contentService.GetSubscriptionPlansAsync();

                return Ok(new ApiResponse<List<SubscriptionPlanDTO>>(plans));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching subscription plans");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get testimonials
        /// </summary>
        [HttpGet("testimonials")]
        public async Task<ActionResult<ApiResponse<List<TestimonialDTO>>>> GetTestimonials(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 10)
        {
            try
            {
                var testimonials = await _contentService.GetTestimonialsAsync(page, per_page);
                
                return Ok(new ApiResponse<List<TestimonialDTO>>(testimonials));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching testimonials");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get platform statistics
        /// </summary>
        [HttpGet("content/stats")]
        public async Task<ActionResult<ApiResponse<StatisticsDTO>>> GetStats()
        {
            try
            {
                var stats = await _contentService.GetStatisticsAsync();

                return Ok(new ApiResponse<StatisticsDTO>(stats));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching statistics");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Submit a user comment/testimonial (logged-in users)
        /// </summary>
        [Authorize]
        [HttpPost("content/comments")]
        public async Task<ActionResult<ApiResponse<TestimonialDTO>>> PostComment([FromBody] CommentCreateDTO model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Content))
                    return BadRequest(new ApiResponse<object>(
                        "التعليق لا يمكن أن يكون فارغاً", "VALIDATION_ERROR", false));

                Guid? userId = null;
                var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(idClaim, out var parsed)) userId = parsed;

                string? name = User.FindFirst("name")?.Value ?? User.FindFirst(ClaimTypes.Name)?.Value;

                var saved = await _contentService.AddTestimonialAsync(userId, name, model.Content);
                if (saved == null)
                    return StatusCode(500, new ApiResponse<object>(
                        "تعذر حفظ التعليق", "SERVER_ERROR", false));

                return Ok(new ApiResponse<TestimonialDTO>(saved));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error posting comment");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }
    }
}
