using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/study-library")]
    public class StudyLibraryController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IStudyLibraryService _library;
        private readonly ILogger<StudyLibraryController> _logger;
        private readonly IConfiguration _config;

        public StudyLibraryController(AppDbContext context, IStudyLibraryService library, ILogger<StudyLibraryController> logger, IConfiguration config)
        {
            _context = context;
            _library = library;
            _logger = logger;
            _config = config;
        }

        private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
        private string GetRole() => User.FindFirst(ClaimTypes.Role)?.Value ?? "";

        /// <summary>
        /// Teacher: upload a study resource (multipart/form-data).
        /// </summary>
        [Authorize(Roles = "Teacher,Admin,Assistant")]
        [HttpPost("upload")]
        [RequestSizeLimit(100_000_000)]
        public async Task<ActionResult<ApiResponse<StudyResourceDTO>>> Upload(
            [FromForm] string title,
            [FromForm] string grade,
            [FromForm] string term,
            [FromForm] string? description,
            [FromForm] string? subjectId,
            [FromForm] string? subjectName,
            [FromForm] string? courseId,
            [FromForm] string? courseName,
            [FromForm] bool isPublic,
            IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest(new ApiResponse<object>("يرجى اختيار ملف للرفع", "VALIDATION_ERROR", false));
                if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(grade) || string.IsNullOrWhiteSpace(term))
                    return BadRequest(new ApiResponse<object>("العنوان والصّف والترم مطلوبان", "VALIDATION_ERROR", false));

                var teacherId = GetUserId();
                var userId = GetUserId();

                var model = new StudyResource
                {
                    Title = title.Trim(),
                    Grade = grade.Trim(),
                    Term = term.Trim(),
                    Description = description,
                    SubjectId = Guid.TryParse(subjectId, out var sid) ? sid : null,
                    SubjectName = subjectName,
                    CourseId = int.TryParse(courseId, out var cid) ? cid : null,
                    CourseName = courseName,
                    TeacherId = teacherId,
                    Public = isPublic
                };

                var result = await _library.UploadAsync(userId, model, file);
                if (result == null)
                    return StatusCode(502, new ApiResponse<object>(
                        "تعذّر رفع الملف، حاول مرة أخرى", "UPLOAD_FAILED", false));

                return CreatedAtAction(nameof(GetById), new { id = result.Id }, new ApiResponse<StudyResourceDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Study library upload failed");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء رفع الملف", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get a single resource by id.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<StudyResourceDTO>>> GetById(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var dto = await _library.GetAsync(id, userId, HasStaffRole());
                if (dto == null)
                    return NotFound(new ApiResponse<object>("الملف غير موجود أو غير متاح", "NOT_FOUND", false));
                return Ok(new ApiResponse<StudyResourceDTO>(dto));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Get study resource failed");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// List library with filters (visible to students are those they can access).
        /// </summary>
        [HttpGet]
        [Authorize]
        public async Task<ActionResult<ApiResponse<PagedResult<StudyResourceDTO>>>> List(
            [FromQuery] string? grade,
            [FromQuery] string? term,
            [FromQuery] string? subjectId,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int perPage = 50)
        {
            try
            {
                var userId = GetUserId();
                var result = await _library.ListAsync(userId, HasStaffRole(), grade, term, subjectId, search, page, perPage);
                return Ok(new ApiResponse<PagedResult<StudyResourceDTO>>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "List study library failed");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Teacher/staff: list all their uploads (management view).
        /// </summary>
        [Authorize(Roles = "Teacher,Admin,Assistant")]
        [HttpGet("mine")]
        public async Task<ActionResult<ApiResponse<List<StudyResourceDTO>>>> Mine()
        {
            try
            {
                var userId = GetUserId();
                var items = await _library.ListMineAsync(userId);
                return Ok(new ApiResponse<List<StudyResourceDTO>>(items));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "List my study resources failed");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get signed/accessible download URL for a resource.
        /// </summary>
        [Authorize]
        [HttpGet("{id}/download")]
        public async Task<IActionResult> Download(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var (content, fileName, contentType) = await _library.DownloadAsync(id, userId, HasStaffRole());
                if (content == null)
                    return NotFound(new ApiResponse<object>("الملف غير موجود أو غير متاح", "NOT_FOUND", false));
                return File(content, contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Download study resource failed");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Teacher/staff: delete a resource.
        /// </summary>
        [Authorize(Roles = "Teacher,Admin,Assistant")]
        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var ok = await _library.DeleteAsync(id, userId);
                if (!ok)
                    return NotFound(new ApiResponse<object>("الملف غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<object>("تم حذف الملف بنجاح"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Delete study resource failed");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        private bool HasStaffRole()
        {
            var role = GetRole();
            return role == "Teacher" || role == "Admin" || role == "Assistant";
        }
    }
}
