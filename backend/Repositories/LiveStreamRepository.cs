using elmanassa.ApplicationDbContext;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Repositories
{
    public class LiveStreamRepository : ILiveStreamRepository
    {
        private readonly AppDbContext _context;

        public LiveStreamRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<LiveStream>> GetActiveStreamsAsync(int page = 1, int perPage = 10)
        {
            return await _context.LiveStreams
                .Where(s => s.Status == "active")
                .OrderByDescending(s => s.StartedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync();
        }

        public async Task<LiveStream?> GetByIdAsync(int id)
        {
            return await _context.LiveStreams.FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task AddStreamAsync(LiveStream stream)
        {
            await _context.LiveStreams.AddAsync(stream);
        }

        public async Task<List<ChatMessage>> GetChatMessagesAsync(int streamId, int page = 1, int perPage = 20)
        {
            return await _context.ChatMessages
                .Where(m => m.StreamId == streamId)
                .Include(m => m.User)
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .ToListAsync();
        }

        public async Task AddChatMessageAsync(ChatMessage message)
        {
            await _context.ChatMessages.AddAsync(message);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}