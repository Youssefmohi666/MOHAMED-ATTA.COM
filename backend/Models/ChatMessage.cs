using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class ChatMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StreamId { get; set; }
        public int? LiveStreamId { get; set; }
        public LiveStream Stream { get; set; }

        [Required]
        public Guid UserId { get; set; }
        public User User { get; set; }

        [Required]
        public string Message { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
