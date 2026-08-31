using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Services
{
    public interface ILiveStreamService
    {
        Task<List<LiveStreamDTO>> GetActiveStreamsAsync(int page = 1, int perPage = 10);
        Task<LiveStreamDTO?> GetStreamByIdAsync(int id);
        Task<LiveStreamDTO?> CreateStreamAsync(Guid teacherId, string title, string description);
        Task<bool> EndStreamAsync(int streamId, Guid teacherId);
        Task<List<ChatMessageDTO>> GetStreamChatAsync(int streamId, int page = 1, int perPage = 20);
        Task<ChatMessageDTO?> SendChatMessageAsync(int streamId, Guid userId, string message);
    }

    public class LiveStreamService : ILiveStreamService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<LiveStreamService> _logger;

        public LiveStreamService(AppDbContext context, ILogger<LiveStreamService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<LiveStreamDTO>> GetActiveStreamsAsync(int page = 1, int perPage = 10)
        {
            try
            {
                var streams = await _context.LiveStreams
                    .Where(s => s.Status == "active")
                    .Include(s => s.Instructor)
                    .OrderByDescending(s => s.StartedAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(s => new LiveStreamDTO
                    {
                        Id = s.Id,
                        TeacherId = s.InstructorId,
                        TeacherName = s.Instructor != null ? s.Instructor.Name : "Unknown",
                        Title = s.Title,
                        Description = s.Description,
                        Status = s.Status,
                        ViewersCount = s.ViewersCount ?? s.ViewerCount,
                        StartedAt = s.StartedAt ?? DateTime.UtcNow,
                        StreamUrl = s.StreamUrl
                    })
                    .ToListAsync();

                return streams;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching active streams");
                return new List<LiveStreamDTO>();
            }
        }

        public async Task<LiveStreamDTO?> GetStreamByIdAsync(int id)
        {
            try
            {
                var stream = await _context.LiveStreams
                    .Include(s => s.Instructor)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (stream == null)
                    return null;

                // Increment viewers count
                stream.ViewerCount++;
                _context.LiveStreams.Update(stream);
                await _context.SaveChangesAsync();

                return new LiveStreamDTO
                {
                    Id = stream.Id,
                    TeacherId = stream.InstructorId,
                    TeacherName = stream.Instructor != null ? stream.Instructor.Name : "Unknown",
                    Title = stream.Title,
                    Description = stream.Description,
                    Status = stream.Status,
                    ViewersCount = stream.ViewerCount,
                    StartedAt = stream.StartedAt ?? DateTime.UtcNow,
                    StreamUrl = stream.StreamUrl
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching stream");
                return null;
            }
        }

        public async Task<LiveStreamDTO?> CreateStreamAsync(Guid teacherId, string title, string description)
        {
            try
            {
                var stream = new LiveStream
                {
                    InstructorId = teacherId,
                    Title = title,
                    Description = description,
                    Status = "active",
                    ViewerCount = 0,
                    ScheduledAt = DateTime.UtcNow,
                    StartedAt = DateTime.UtcNow,
                    StreamUrl = $"https://mohamed-atta.com/live/{Guid.NewGuid()}",
                    CreatedAt = DateTime.UtcNow
                };

                _context.LiveStreams.Add(stream);
                await _context.SaveChangesAsync();

                var teacher = await _context.Users.FirstOrDefaultAsync(u => u.Id == teacherId);

                return new LiveStreamDTO
                {
                    Id = stream.Id,
                    TeacherId = stream.InstructorId,
                    TeacherName = teacher?.Name ?? "Unknown",
                    Title = stream.Title,
                    Description = stream.Description,
                    Status = stream.Status,
                    ViewersCount = stream.ViewerCount,
                    StartedAt = stream.StartedAt ?? DateTime.UtcNow,
                    StreamUrl = stream.StreamUrl
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating stream");
                return null;
            }
        }

        public async Task<bool> EndStreamAsync(int streamId, Guid teacherId)
        {
            try
            {
                var stream = await _context.LiveStreams
                    .FirstOrDefaultAsync(s => s.Id == streamId && s.InstructorId == teacherId);

                if (stream == null)
                    return false;

                stream.Status = "ended";
                stream.EndedAt = DateTime.UtcNow;
                _context.LiveStreams.Update(stream);
                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ending stream");
                return false;
            }
        }

        public async Task<List<ChatMessageDTO>> GetStreamChatAsync(int streamId, int page = 1, int perPage = 20)
        {
            try
            {
                var messages = await _context.ChatMessages
                    .Where(m => m.StreamId == streamId)
                    .Include(m => m.User)
                    .OrderByDescending(m => m.CreatedAt)
                    .Skip((page - 1) * perPage)
                    .Take(perPage)
                    .Select(m => new ChatMessageDTO
                    {
                        Id = m.Id,
                        LiveStreamId = m.StreamId,
                        UserId = m.UserId,
                        UserName = m.User != null ? m.User.Name : "Unknown",
                        UserAvatarUrl = m.User != null ? m.User.AvatarUrl : null,
                        Message = m.Message,
                        CreatedAt = m.CreatedAt
                    })
                    .ToListAsync();

                return messages.OrderBy(m => m.CreatedAt).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching chat messages");
                return new List<ChatMessageDTO>();
            }
        }

        public async Task<ChatMessageDTO?> SendChatMessageAsync(int streamId, Guid userId, string message)
        {
            try
            {
                var stream = await _context.LiveStreams
                    .FirstOrDefaultAsync(s => s.Id == streamId);
                if (stream == null)
                    return null;

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user == null)
                    return null;

                var chatMessage = new ChatMessage
                {
                    StreamId = streamId,
                    UserId = userId,
                    Message = message,
                    CreatedAt = DateTime.UtcNow
                };

                _context.ChatMessages.Add(chatMessage);
                await _context.SaveChangesAsync();

                return new ChatMessageDTO
                {
                    Id = chatMessage.Id,
                    LiveStreamId = chatMessage.StreamId,
                    UserId = chatMessage.UserId,
                    UserName = user.Name,
                    UserAvatarUrl = user.AvatarUrl,
                    Message = chatMessage.Message,
                    CreatedAt = chatMessage.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending chat message");
                return null;
            }
        }
    }
}
