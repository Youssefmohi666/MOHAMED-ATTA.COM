using elmanassa.Models;

namespace elmanassa.Repositories
{
    public interface ILiveStreamRepository
    {
        Task<List<LiveStream>> GetActiveStreamsAsync(int page = 1, int perPage = 10);
        Task<LiveStream?> GetByIdAsync(int id);
        Task AddStreamAsync(LiveStream stream);
        Task<List<ChatMessage>> GetChatMessagesAsync(int streamId, int page = 1, int perPage = 20);
        Task AddChatMessageAsync(ChatMessage message);
        Task SaveChangesAsync();
    }
}