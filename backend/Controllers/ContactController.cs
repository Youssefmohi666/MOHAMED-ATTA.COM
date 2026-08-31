using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/contact")]
    [AllowAnonymous]
    public class ContactController : ControllerBase
    {
        private readonly IContactService _contactService;
        private readonly ILogger<ContactController> _logger;

        public ContactController(IContactService contactService, ILogger<ContactController> logger)
        {
            _contactService = contactService;
            _logger = logger;
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Submit([FromBody] ContactMessageCreateDTO model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse<object>(
                        "Invalid contact data", "VALIDATION_ERROR", false));

                var success = await _contactService.CreateMessageAsync(model);
                if (!success)
                    return StatusCode(500, new ApiResponse<object>(
                        "Failed to save message", "SERVER_ERROR", false));

                return Ok(new ApiResponse<object>("Message received"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting contact message");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }
    }
}