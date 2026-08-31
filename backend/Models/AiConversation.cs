using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class AiConversation
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }
        public User User { get; set; }
        public string Title { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<AiMessage> Messages { get; set; } = new List<AiMessage>();
    }
}
