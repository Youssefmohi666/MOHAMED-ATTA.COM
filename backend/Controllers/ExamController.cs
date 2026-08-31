using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/exams")]
    public class ExamController : ControllerBase
    {
        private readonly IExamService _examService;
        private readonly ILogger<ExamController> _logger;

        public ExamController(IExamService examService, ILogger<ExamController> logger)
        {
            _examService = examService;
            _logger = logger;
        }

        private Guid GetUserId()
        {
            return Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
        }

        [HttpPost("generate")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<ExamDetailDTO>>> Generate(
            [FromBody] ExamGenerateDTO model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Topic))
                    return BadRequest(new ApiResponse<object>("يرجى إدخال موضوع الاختبار", "VALIDATION_ERROR", false));
                if (model.QuestionCount < 1 || model.QuestionCount > 20)
                    return BadRequest(new ApiResponse<object>("عدد الأسئلة يجب أن يكون بين 1 و 20", "VALIDATION_ERROR", false));

                var userId = GetUserId();
                var result = await _examService.GenerateExamAsync(userId, model);
                return Ok(new ApiResponse<ExamDetailDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating exam");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء إنشاء الاختبار", "SERVER_ERROR", false));
            }
        }

        [HttpPost]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<ExamDetailDTO>>> Create(
            [FromBody] ExamCreateDTO model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Title))
                    return BadRequest(new ApiResponse<object>("يرجى إدخال عنوان الاختبار", "VALIDATION_ERROR", false));
                if (model.Questions.Count == 0)
                    return BadRequest(new ApiResponse<object>("يجب إضافة سؤال واحد على الأقل", "VALIDATION_ERROR", false));

                var userId = GetUserId();
                var result = await _examService.CreateExamAsync(userId, model);
                return Ok(new ApiResponse<ExamDetailDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating exam");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء حفظ الاختبار", "SERVER_ERROR", false));
            }
        }

        [HttpGet]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<List<ExamListItemDTO>>>> GetExams()
        {
            try
            {
                var userId = GetUserId();
                var result = await _examService.GetTeacherExamsAsync(userId);
                return Ok(new ApiResponse<List<ExamListItemDTO>>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching exams");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<ExamDetailDTO>>> GetExam(Guid id)
        {
            try
            {
                var result = await _examService.GetExamAsync(id);
                if (result == null)
                    return NotFound(new ApiResponse<object>("الاختبار غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<ExamDetailDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching exam");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<ExamDetailDTO>>> UpdateExam(Guid id, [FromBody] ExamUpdateDTO model)
        {
            try
            {
                var userId = GetUserId();
                var result = await _examService.UpdateExamAsync(id, userId, model);
                if (result == null)
                    return NotFound(new ApiResponse<object>("الاختبار غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<ExamDetailDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating exam");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpPatch("{id}/publish")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<object>>> PublishExam(Guid id, [FromBody] ExamPublishDTO model)
        {
            try
            {
                var userId = GetUserId();
                var success = await _examService.PublishExamAsync(id, userId, model.Status);
                if (!success)
                    return NotFound(new ApiResponse<object>("الاختبار غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<object>(new { message = "تم تحديث حالة الاختبار" }));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing exam");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpGet("available")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<List<ExamListItemDTO>>>> GetAvailableExams()
        {
            try
            {
                var result = await _examService.GetAvailableExamsAsync();
                return Ok(new ApiResponse<List<ExamListItemDTO>>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching available exams");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteExam(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var success = await _examService.DeleteExamAsync(id, userId);
                if (!success)
                    return NotFound(new ApiResponse<object>("الاختبار غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<object>("تم حذف الاختبار بنجاح"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting exam");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpPost("{id}/submit")]
        [Authorize(Roles = "student")]
        public async Task<ActionResult<ApiResponse<ExamResultDTO>>> Submit(
            Guid id, [FromBody] ExamSubmitDTO model)
        {
            try
            {
                var userId = GetUserId();
                var result = await _examService.SubmitAttemptAsync(id, userId, model);
                if (result == null)
                    return NotFound(new ApiResponse<object>("الاختبار غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<ExamResultDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting exam");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء تسليم الاختبار", "SERVER_ERROR", false));
            }
        }

        [HttpGet("{id}/results")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<List<StudentExamResultDTO>>>> GetResults(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var result = await _examService.GetExamResultsAsync(id, userId);
                return Ok(new ApiResponse<List<StudentExamResultDTO>>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching results");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpGet("attempt/{attemptId}/result")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<ExamResultDTO>>> GetAttemptResult(Guid attemptId)
        {
            try
            {
                var userId = GetUserId();
                var result = await _examService.GetAttemptResultAsync(attemptId, userId);
                if (result == null)
                    return NotFound(new ApiResponse<object>("النتيجة غير موجودة", "NOT_FOUND", false));
                return Ok(new ApiResponse<ExamResultDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching attempt result");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }
    }
}
