using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/ai")]
    [Authorize]
    public class AiController : ControllerBase
    {
        private readonly IAiService _aiService;
        private readonly ILogger<AiController> _logger;
        private readonly IConfiguration _config;

        public AiController(IAiService aiService, ILogger<AiController> logger, IConfiguration config)
        {
            _aiService = aiService;
            _logger = logger;
            _config = config;
        }

        private Guid GetUserId()
        {
            return Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
        }

        /// <summary>
        /// Create a new AI conversation
        /// </summary>
        [HttpPost("conversations")]
        public async Task<ActionResult<ApiResponse<AiConversationDTO>>> CreateConversation(
            [FromBody] AiConversationCreateDTO model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse<object>(
                        "Invalid conversation data", "VALIDATION_ERROR", false));

                var userId = GetUserId();
                var conversation = await _aiService.CreateConversationAsync(userId, model.Title);

                if (conversation == null)
                    return BadRequest(new ApiResponse<object>(
                        "Failed to create conversation", "CONVERSATION_CREATION_FAILED", false));

                return CreatedAtAction(nameof(GetConversation), new { id = conversation.Id },
                    new ApiResponse<AiConversationDTO>(conversation));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating conversation");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get conversation by ID
        /// </summary>
        [HttpGet("conversations/{id}")]
        public async Task<ActionResult<ApiResponse<AiConversationDTO>>> GetConversation(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var conversation = await _aiService.GetConversationAsync(id, userId);

                if (conversation == null)
                    return NotFound(new ApiResponse<object>(
                        "Conversation not found", "CONVERSATION_NOT_FOUND", false));

                return Ok(new ApiResponse<AiConversationDTO>(conversation));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching conversation");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get all user conversations
        /// </summary>
        [HttpGet("conversations")]
        public async Task<ActionResult<ApiResponse<List<AiConversationDTO>>>> GetConversations()
        {
            try
            {
                var userId = GetUserId();
                var conversations = await _aiService.GetUserConversationsAsync(userId);

                return Ok(new ApiResponse<List<AiConversationDTO>>(conversations));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching conversations");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Send message to AI conversation
        /// </summary>
        [HttpPost("conversations/{id}/messages")]
        public async Task<ActionResult<ApiResponse<AiMessageDTO>>> SendMessage(
            Guid id,
            [FromBody] AiMessageCreateDTO model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse<object>(
                        "Invalid message data", "VALIDATION_ERROR", false));

                var userId = GetUserId();
                var message = await _aiService.SendMessageAsync(id, userId, model.Message);

                if (message == null)
                    return BadRequest(new ApiResponse<object>(
                        "Failed to send message", "MESSAGE_SEND_FAILED", false));

                return CreatedAtAction(nameof(GetConversation), new { id = id },
                    new ApiResponse<AiMessageDTO>(message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Delete conversation
        /// </summary>
        [HttpDelete("conversations/{id}")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteConversation(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var success = await _aiService.DeleteConversationAsync(id, userId);

                if (!success)
                    return NotFound(new ApiResponse<object>(
                        "Conversation not found", "CONVERSATION_NOT_FOUND", false));

                return Ok(new ApiResponse<object>("Conversation deleted successfully"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting conversation");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Generate an AI report (student / subject / class) — requires authentication.
        /// </summary>
        [Authorize]
        [HttpPost("generate-report")]
        public async Task<ActionResult<ApiResponse<ReportResponseDTO>>> GenerateReport([FromBody] GenerateReportDTO model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.ReportType))
                    return BadRequest(new ApiResponse<object>("نوع التقرير مطلوب", "VALIDATION_ERROR", false));

                var report = await _aiService.GenerateReportAsync(model);
                return Ok(new ApiResponse<ReportResponseDTO>(new ReportResponseDTO { Report = report }));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating report");
                return StatusCode(500, new ApiResponse<object>(
                    "حدث خطأ أثناء توليد التقرير", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Analyze an uploaded file (PDF/image/text) — requires authentication.
        /// </summary>
        [Authorize]
        [HttpPost("analyze-file")]
        [RequestSizeLimit(15_000_000)]
        public async Task<ActionResult<ApiResponse<FileAnalysisDTO>>> AnalyzeFile(IFormFile file, string? context)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest(new ApiResponse<object>("يرجى اختيار ملف", "VALIDATION_ERROR", false));

                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                var contentBytes = ms.ToArray();

                var analysis = await _aiService.AnalyzeFileAsync(file.FileName, contentBytes, context);
                return Ok(new ApiResponse<FileAnalysisDTO>(new FileAnalysisDTO
                {
                    Analysis = analysis,
                    FileName = file.FileName
                }));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing file");
                return StatusCode(500, new ApiResponse<object>(
                    "حدث خطأ أثناء تحليل الملف", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Chat with Gemini AI — requires authentication.
        /// </summary>
        [AllowAnonymous]
        [HttpPost("public-chat")]
        public async Task<IActionResult> PublicChat([FromBody] PublicChatDTO model)
        {
            var origin = Request.Headers["Origin"].FirstOrDefault()
                      ?? Request.Headers["Referer"].FirstOrDefault();
            var allowedHost = _config["App:FrontendUrl"]?.Replace("https://", "").Replace("http://", "").TrimEnd('/');
            if (!string.IsNullOrEmpty(origin))
            {
                var originHost = new Uri(origin).Host;
                if (originHost != "demo.dev-core.site" && originHost != "localhost" && originHost != allowedHost)
                    return BadRequest(new { message = "الوصول غير مسموح من هذا المصدر" });
            }

            if (string.IsNullOrWhiteSpace(model.Message))
                return BadRequest(new { message = "الرسالة فارغة" });

            var history = (model.History ?? new List<PublicChatMessage>())
                .Select(h => (h.Role, h.Text))
                .ToList();

            var reply = await _aiService.PublicChatAsync(model.Message, history);
            return Ok(new { reply });
        }
    }
}

// ── Public chat DTOs ──────────────────────────────────────────
namespace elmanassa.DTOs
{
    public class PublicChatMessage
    {
        public string Role { get; set; } = "user";
        public string Text { get; set; } = string.Empty;
    }

    public class PublicChatDTO
    {
        public string Message { get; set; } = string.Empty;
        public List<PublicChatMessage>? History { get; set; }
    }

    public class GenerateReportDTO
    {
        public string ReportType { get; set; } = "student";
        public string? StudentName { get; set; }
        public string? SubjectName { get; set; }
        public string ContextJson { get; set; } = "{}";
        public string? CustomPrompt { get; set; }
    }

    public class ReportResponseDTO
    {
        public string Report { get; set; } = string.Empty;
    }

    public class FileAnalysisDTO
    {
        public string Analysis { get; set; } = string.Empty;
        public string? Summary { get; set; }
        public string? FileName { get; set; }
    }
}
