using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/subjects")]
    public class CoursesController : ControllerBase
    {
        private readonly ICourseService _courseService;
        private readonly ITeacherService _teacherService;
        private readonly ILogger<CoursesController> _logger;

        public CoursesController(ICourseService courseService, ITeacherService teacherService, ILogger<CoursesController> logger)
        {
            _courseService = courseService;
            _teacherService = teacherService;
            _logger = logger;
        }

        /// <summary>
        /// Create a new subject (teacher only)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<CourseDTO>>> CreateSubject([FromBody] SubjectCreateDTO model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse<object>(
                        "Invalid subject data", "VALIDATION_ERROR", false));

                var instructorId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "");
                var subject = await _courseService.CreateSubjectAsync(instructorId, model);

                return CreatedAtAction(nameof(GetCourseById), new { id = subject.Id },
                    new ApiResponse<CourseDTO>(subject));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating subject");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred while creating the subject", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get all published subjects with filters
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<CourseDTO>>>> GetCourses(
            [FromQuery] string? category = null,
            [FromQuery] string? level = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 12)
        {
            try
            {
                var courses = await _courseService.GetCoursesAsync(category, level, search, page, per_page);
                var total = await _courseService.GetCourseCountAsync();
                
                return Ok(new ApiResponse<List<CourseDTO>>(courses, true, total)
                {
                    Meta = new ApiMeta { Page = page, PerPage = per_page, Total = total }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching subjects");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred while fetching subjects", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get the most popular subjects (by enrollment/student count)
        /// </summary>
        [HttpGet("popular")]
        public async Task<ActionResult<ApiResponse<List<CourseDTO>>>> GetPopularCourses(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 12)
        {
            try
            {
                if (page < 1 || per_page < 1)
                {
                    return BadRequest(new ApiResponse<object>(
                        "Invalid pagination parameters", "VALIDATION_ERROR", false));
                }

                var courses = await _courseService.GetPopularCoursesAsync(page, per_page);
                var total = await _courseService.GetCourseCountAsync();

                return Ok(new ApiResponse<List<CourseDTO>>(courses, true, total)
                {
                    Meta = new ApiMeta { Page = page, PerPage = per_page, Total = total }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching popular subjects");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred while fetching popular subjects", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get subject detail by ID
        /// </summary>
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<ApiResponse<CourseDTO>>> GetCourseById(Guid id)
        {
            try
            {
                var course = await _courseService.GetCourseByIdAsync(id);
                
                if (course == null)
                    return NotFound(new ApiResponse<object>(
                        "Subject not found", "NOT_FOUND", false));

                return Ok(new ApiResponse<CourseDTO>(course));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching subject {SubjectId}", id);
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred while fetching the subject", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get WhatsApp inquiry details for a subject
        /// </summary>
        [HttpGet("{id:guid}/inquiry")]
        public async Task<ActionResult<ApiResponse<InquiryDTO>>> GetInquiry(Guid id)
        {
            try
            {
                var inquiry = await _courseService.GetInquiryAsync(id);

                if (inquiry == null)
                    return NotFound(new ApiResponse<object>(
                        "Subject not found", "NOT_FOUND", false));

                return Ok(new ApiResponse<InquiryDTO>(inquiry));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching inquiry details for subject {SubjectId}", id);
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred while fetching inquiry details", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get reviews for a subject
        /// </summary>
        [HttpGet("{id:guid}/reviews")]
        public async Task<ActionResult<ApiResponse<List<ReviewDTO>>>> GetCourseReviews(
            Guid id,
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 10)
        {
            try
            {
                var reviews = await _courseService.GetCourseReviewsAsync(id, page, per_page);
                
                return Ok(new ApiResponse<List<ReviewDTO>>(reviews, true, reviews.Count));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching reviews for subject {SubjectId}", id);
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred while fetching reviews", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Add review for a subject (student only, must be enrolled)
        /// </summary>
        [HttpPost("{id:guid}/reviews")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<ReviewDTO>>> AddReview(Guid id, [FromBody] ReviewCreateDTO model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse<object>(
                        "Invalid review data", "VALIDATION_ERROR", false));

                var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
                var review = await _courseService.AddReviewAsync(id, userId, model);

                if (review == null)
                    return Forbid();

                return CreatedAtAction(nameof(GetCourseReviews), new { id }, 
                    new ApiResponse<ReviewDTO>(review));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding review for subject {SubjectId}", id);
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred while adding the review", "SERVER_ERROR", false));
            }
        }
    }
}
