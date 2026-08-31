using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/presentations")]
    [Authorize]
    public class PresentationController : ControllerBase
    {
        private readonly IPresentationService _presentationService;
        private readonly ILogger<PresentationController> _logger;

        public PresentationController(IPresentationService presentationService, ILogger<PresentationController> logger)
        {
            _presentationService = presentationService;
            _logger = logger;
        }

        private Guid GetUserId()
        {
            return Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
        }

        [HttpPost("generate")]
        public async Task<ActionResult<ApiResponse<PresentationDetailDTO>>> Generate(
            [FromBody] PresentationGenerateDTO model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Topic))
                    return BadRequest(new ApiResponse<object>("يرجى إدخال موضوع العرض التقديمي", "VALIDATION_ERROR", false));

                if (model.SlideCount < 1 || model.SlideCount > 50)
                    return BadRequest(new ApiResponse<object>("عدد الشرائح يجب أن يكون بين 1 و 50", "VALIDATION_ERROR", false));

                var userId = GetUserId();
                var result = await _presentationService.GeneratePresentationAsync(userId, model);
                return Ok(new ApiResponse<PresentationDetailDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating presentation");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء إنشاء العرض التقديمي", "SERVER_ERROR", false));
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<PresentationDetailDTO>>> GetPresentation(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var result = await _presentationService.GetPresentationAsync(id, userId);
                if (result == null)
                    return NotFound(new ApiResponse<object>("العرض التقديمي غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<PresentationDetailDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching presentation");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<PresentationListItemDTO>>>> GetPresentations()
        {
            try
            {
                var userId = GetUserId();
                var result = await _presentationService.GetUserPresentationsAsync(userId);
                return Ok(new ApiResponse<List<PresentationListItemDTO>>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching presentations");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<object>>> DeletePresentation(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var success = await _presentationService.DeletePresentationAsync(id, userId);
                if (!success)
                    return NotFound(new ApiResponse<object>("العرض التقديمي غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<object>("تم حذف العرض التقديمي بنجاح"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting presentation");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpGet("{id}/download")]
        public async Task<IActionResult> Download(Guid id, [FromQuery] string format = "html")
        {
            try
            {
                var userId = GetUserId();

                switch (format.ToLower())
                {
                    case "html":
                        var html = await _presentationService.GenerateHtmlAsync(id, userId);
                        return File(System.Text.Encoding.UTF8.GetBytes(html), "text/html", $"presentation-{id}.html");

                    case "pptx":
                        var pptxHtml = await _presentationService.GeneratePptxAsync(id, userId);
                        return File(System.Text.Encoding.UTF8.GetBytes(pptxHtml), "application/vnd.openxmlformats-officedocument.presentationml.presentation", $"presentation-{id}.pptx");

                    case "pdf":
                        var pdfHtml = await _presentationService.GenerateHtmlAsync(id, userId);
                        return File(System.Text.Encoding.UTF8.GetBytes(pdfHtml), "application/pdf", $"presentation-{id}.pdf");

                    default:
                        return BadRequest(new { message = "الصيغة غير مدعومة. استخدم html, pptx, أو pdf" });
                }
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "العرض التقديمي غير موجود" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading presentation");
                return StatusCode(500, new { message = "حدث خطأ أثناء التحميل" });
            }
        }
    }
}
