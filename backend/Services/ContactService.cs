using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;

namespace elmanassa.Services
{
    public interface IContactService
    {
        Task<bool> CreateMessageAsync(ContactMessageCreateDTO model);
    }

    public class ContactService : IContactService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ContactService> _logger;

        public ContactService(AppDbContext context, ILogger<ContactService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<bool> CreateMessageAsync(ContactMessageCreateDTO model)
        {
            try
            {
                var message = new ContactMessage
                {
                    Name = model.Name,
                    Email = model.Email,
                    Type = model.Type,
                    Subject = model.Subject,
                    Message = model.Message,
                    CreatedAt = DateTime.UtcNow
                };

                _context.ContactMessages.Add(message);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating contact message");
                return false;
            }
        }
    }
}