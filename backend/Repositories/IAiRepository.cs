using elmanassa.Models;

namespace elmanassa.Repositories
{
    public interface IAiRepository
    {
        Task<AiConversation?> GetConversationAsync(Guid conversationId, Guid userId);
        Task AddConversationAsync(AiConversation conversation);
        Task AddMessageAsync(AiMessage message);
        Task<List<AiConversation>> GetUserConversationsAsync(Guid userId);
        Task SaveChangesAsync();
    }
}