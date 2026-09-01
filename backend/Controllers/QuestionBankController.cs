using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/question-bank")]
    public class QuestionBankController : ControllerBase
    {
        private readonly IQuestionBankService _service;
        private readonly ILogger<QuestionBankController> _logger;

        public QuestionBankController(IQuestionBankService service, ILogger<QuestionBankController> logger)
        {
            _service = service;
            _logger = logger;
        }

        private Guid GetUserId()
        {
            return Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
        }

        [HttpGet]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<List<BankQuestionDTO>>>> GetQuestions(
            [FromQuery] BankQueryDTO query)
        {
            try
            {
                var userId = GetUserId();
                var result = await _service.GetQuestionsAsync(userId, query);
                return Ok(new ApiResponse<List<BankQuestionDTO>>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching question bank");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء جلب بنك الأسئلة", "SERVER_ERROR", false));
            }
        }

        [HttpPost]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<BankQuestionDTO>>> Create([FromBody] BankQuestionCreateDTO model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Text))
                    return BadRequest(new ApiResponse<object>("نص السؤال مطلوب", "VALIDATION_ERROR", false));
                if (model.Options == null || model.Options.Count < 1)
                    return BadRequest(new ApiResponse<object>("يجب إضافة خيارات للسؤال", "VALIDATION_ERROR", false));

                var userId = GetUserId();
                var result = await _service.CreateQuestionAsync(userId, model);
                return Ok(new ApiResponse<BankQuestionDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating bank question");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء حفظ السؤال", "SERVER_ERROR", false));
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<BankQuestionDTO>>> Update(Guid id, [FromBody] BankQuestionUpdateDTO model)
        {
            try
            {
                var userId = GetUserId();
                var result = await _service.UpdateQuestionAsync(id, userId, model);
                if (result == null)
                    return NotFound(new ApiResponse<object>("السؤال غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<BankQuestionDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating bank question");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var success = await _service.DeleteQuestionAsync(id, userId);
                if (!success)
                    return NotFound(new ApiResponse<object>("السؤال غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<object>("تم حذف السؤال بنجاح"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting bank question");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }

        [HttpPost("build-exam")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<ExamDetailDTO>>> BuildExam([FromBody] BuildExamFromBankDTO model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Title))
                    return BadRequest(new ApiResponse<object>("يرجى إدخال عنوان الاختبار", "VALIDATION_ERROR", false));
                if (model.QuestionIds == null || model.QuestionIds.Count == 0)
                    return BadRequest(new ApiResponse<object>("يجب اختيار سؤال واحد على الأقل", "VALIDATION_ERROR", false));

                var userId = GetUserId();
                var result = await _service.BuildExamAsync(userId, model);
                if (result == null)
                    return BadRequest(new ApiResponse<object>("لم يتم العثور على أسئلة صالحة", "VALIDATION_ERROR", false));
                return Ok(new ApiResponse<ExamDetailDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error building exam from bank");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء إنشاء الاختبار", "SERVER_ERROR", false));
            }
        }

        [HttpPost("add-to-exam")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<object>>> AddToExam([FromBody] AddQuestionsToExamDTO model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.ExamId))
                    return BadRequest(new ApiResponse<object>("معرف الاختبار مطلوب", "VALIDATION_ERROR", false));
                if (model.QuestionIds == null || model.QuestionIds.Count == 0)
                    return BadRequest(new ApiResponse<object>("يجب اختيار سؤال واحد على الأقل", "VALIDATION_ERROR", false));

                var userId = GetUserId();
                var success = await _service.AddQuestionsToExamAsync(userId, model);
                if (!success)
                    return NotFound(new ApiResponse<object>("الاختبار غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<object>("تمت إضافة الأسئلة بنجاح"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding questions to exam");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ", "SERVER_ERROR", false));
            }
        }
    }
}
