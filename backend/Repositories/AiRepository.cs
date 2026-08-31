using elmanassa.ApplicationDbContext;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Repositories
{
    public class AiRepository : IAiRepository
    {
        private readonly AppDbContext _context;

        public AiRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AiConversation?> GetConversationAsync(Guid conversationId, Guid userId)
        {
            return await _context.AiConversations
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);
        }

        public async Task AddConversationAsync(AiConversation conversation)
        {
            await _context.AiConversations.AddAsync(conversation);
        }

        public async Task AddMessageAsync(AiMessage message)
        {
            await _context.AiMessages.AddAsync(message);
        }

        public async Task<List<AiConversation>> GetUserConversationsAsync(Guid userId)
        {
            return await _context.AiConversations
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}