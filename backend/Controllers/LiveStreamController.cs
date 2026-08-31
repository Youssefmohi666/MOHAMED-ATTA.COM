using elmanassa.DTOs;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/streams")]
    public class LiveStreamController : ControllerBase
    {
        private readonly ILiveStreamService _liveStreamService;
        private readonly ILogger<LiveStreamController> _logger;

        public LiveStreamController(ILiveStreamService liveStreamService, ILogger<LiveStreamController> logger)
        {
            _liveStreamService = liveStreamService;
            _logger = logger;
        }

        private Guid GetUserId()
        {
            return Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
        }

        /// <summary>
        /// Get active live streams
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<List<LiveStreamDTO>>>> GetActiveStreams(
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 10)
        {
            try
            {
                var streams = await _liveStreamService.GetActiveStreamsAsync(page, per_page);

                return Ok(new ApiResponse<List<LiveStreamDTO>>(streams));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching active streams");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get stream details
        /// </summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<LiveStreamDTO>>> GetStream(int id)
        {
            try
            {
                var stream = await _liveStreamService.GetStreamByIdAsync(id);

                if (stream == null)
                    return NotFound(new ApiResponse<object>(
                        "Stream not found", "STREAM_NOT_FOUND", false));

                return Ok(new ApiResponse<LiveStreamDTO>(stream));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching stream");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Start a new live stream
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<LiveStreamDTO>>> StartStream([FromBody] LiveStreamCreateDTO model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse<object>(
                        "Invalid stream data", "VALIDATION_ERROR", false));

                var teacherId = GetUserId();
                var stream = await _liveStreamService.CreateStreamAsync(teacherId, model.Title, model.Description);

                if (stream == null)
                    return BadRequest(new ApiResponse<object>(
                        "Failed to create stream", "STREAM_CREATION_FAILED", false));

                return CreatedAtAction(nameof(GetStream), new { id = stream.Id },
                    new ApiResponse<LiveStreamDTO>(stream));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating stream");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// End a live stream
        /// </summary>
        [HttpPatch("{id}/end")]
        [Authorize(Roles = "teacher")]
        public async Task<ActionResult<ApiResponse<object>>> EndStream(int id)
        {
            try
            {
                var teacherId = GetUserId();
                var success = await _liveStreamService.EndStreamAsync(id, teacherId);

                if (!success)
                    return NotFound(new ApiResponse<object>(
                        "Stream not found or unauthorized", "STREAM_NOT_FOUND", false));

                return Ok(new ApiResponse<object>("Stream ended successfully"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ending stream");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Get stream chat messages
        /// </summary>
        [HttpGet("{id}/chat")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<List<ChatMessageDTO>>>> GetChatMessages(
            int id,
            [FromQuery] int page = 1,
            [FromQuery] int per_page = 20)
        {
            try
            {
                var messages = await _liveStreamService.GetStreamChatAsync(id, page, per_page);

                return Ok(new ApiResponse<List<ChatMessageDTO>>(messages));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching chat messages");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }

        /// <summary>
        /// Send chat message to stream
        /// </summary>
        [HttpPost("{id}/chat")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<ChatMessageDTO>>> SendChatMessage(
            int id,
            [FromBody] ChatMessageCreateDTO model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse<object>(
                        "Invalid message data", "VALIDATION_ERROR", false));

                var userId = GetUserId();
                var message = await _liveStreamService.SendChatMessageAsync(id, userId, model.Message);

                if (message == null)
                    return BadRequest(new ApiResponse<object>(
                        "Failed to send message", "MESSAGE_SEND_FAILED", false));

                return CreatedAtAction(nameof(GetChatMessages), new { id = id },
                    new ApiResponse<ChatMessageDTO>(message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending chat message");
                return StatusCode(500, new ApiResponse<object>(
                    "An error occurred", "SERVER_ERROR", false));
            }
        }
    }
}
