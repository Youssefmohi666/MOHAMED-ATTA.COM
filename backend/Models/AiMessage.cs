using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class AiMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public Guid ConversationId { get; set; }
        public AiConversation Conversation { get; set; }

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } // user, assistant

        [Required]
        public string Content { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
