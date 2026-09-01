using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/analytics")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _service;
        private readonly ILogger<AnalyticsController> _logger;

        public AnalyticsController(IAnalyticsService service, ILogger<AnalyticsController> logger)
        {
            _service = service;
            _logger = logger;
        }

        private Guid GetUserId()
        {
            return Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
        }

        [HttpGet("overview")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<AnalyticsOverviewDTO>>> GetOverview()
        {
            try
            {
                var teacherId = GetUserId();
                var result = await _service.GetOverviewAsync(teacherId);
                if (result == null)
                    return Ok(new ApiResponse<AnalyticsOverviewDTO>(new AnalyticsOverviewDTO()));
                return Ok(new ApiResponse<AnalyticsOverviewDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching analytics overview");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء جلب التحليلات", "SERVER_ERROR", false));
            }
        }

        [HttpGet("students/{studentId}")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<StudentAnalyticsDTO>>> GetStudentAnalytics(Guid studentId)
        {
            try
            {
                var teacherId = GetUserId();
                var result = await _service.GetStudentAnalyticsAsync(teacherId, studentId);
                if (result == null)
                    return NotFound(new ApiResponse<object>("الطالب غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<StudentAnalyticsDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching student analytics");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء جلب تحليلات الطالب", "SERVER_ERROR", false));
            }
        }

        [HttpGet("classrooms")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<List<ClassroomDTO>>>> GetClassrooms([FromQuery] Guid? subjectId)
        {
            try
            {
                var teacherId = GetUserId();
                var result = await _service.GetClassroomsAsync(teacherId, subjectId);
                return Ok(new ApiResponse<List<ClassroomDTO>>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching classrooms");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء جلب الفصول", "SERVER_ERROR", false));
            }
        }

        [HttpPost("classrooms")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<ClassroomDTO>>> CreateClassroom([FromBody] ClassroomCreateDTO model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Name))
                    return BadRequest(new ApiResponse<object>("يرجى إدخال اسم الفصل", "VALIDATION_ERROR", false));

                var teacherId = GetUserId();
                var result = await _service.CreateClassroomAsync(teacherId, model);
                if (result == null)
                    return NotFound(new ApiResponse<object>("المادة غير موجودة", "NOT_FOUND", false));
                return Ok(new ApiResponse<ClassroomDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating classroom");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء إنشاء الفصل", "SERVER_ERROR", false));
            }
        }

        [HttpPost("assessments")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<AssessmentDTO>>> CreateAssessment([FromBody] AssessmentCreateDTO model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.Title))
                    return BadRequest(new ApiResponse<object>("يرجى إدخال عنوان التقويم", "VALIDATION_ERROR", false));

                var teacherId = GetUserId();
                var result = await _service.CreateAssessmentAsync(teacherId, model);
                if (result == null)
                    return NotFound(new ApiResponse<object>("المادة غير موجودة", "NOT_FOUND", false));
                return Ok(new ApiResponse<AssessmentDTO>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating assessment");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء إنشاء التقويم", "SERVER_ERROR", false));
            }
        }

        [HttpPost("assessments/{assessmentId}/grades")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<object>>> RecordGrade(Guid assessmentId, [FromBody] AssessmentGradeCreateDTO model)
        {
            try
            {
                var teacherId = GetUserId();
                var success = await _service.RecordAssessmentGradeAsync(teacherId, assessmentId, model);
                if (!success)
                    return NotFound(new ApiResponse<object>("الطالب أو التقويم غير موجود", "NOT_FOUND", false));
                return Ok(new ApiResponse<object>("تم تسجيل الدرجة بنجاح"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recording grade");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء تسجيل الدرجة", "SERVER_ERROR", false));
            }
        }

        [HttpGet("attendance")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<List<AttendanceLogDTO>>>> GetAttendance([FromQuery] Guid? subjectId)
        {
            try
            {
                var teacherId = GetUserId();
                var result = await _service.GetTeacherAttendanceAsync(teacherId, subjectId);
                return Ok(new ApiResponse<List<AttendanceLogDTO>>(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching attendance");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء جلب الحضور", "SERVER_ERROR", false));
            }
        }

        [HttpPost("attendance")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<object>>> RecordAttendance([FromBody] AttendanceLogCreateDTO model)
        {
            try
            {
                var teacherId = GetUserId();
                var success = await _service.RecordAttendanceAsync(teacherId, model);
                if (!success)
                    return NotFound(new ApiResponse<object>("الطالب أو المادة غير موجودة", "NOT_FOUND", false));
                return Ok(new ApiResponse<object>("تم تسجيل الحضور بنجاح"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recording attendance");
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء تسجيل الحضور", "SERVER_ERROR", false));
            }
        }
    }
}