using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class LiveStream
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string Title { get; set; }

        [Required]
        public Guid InstructorId { get; set; }
        public User Instructor { get; set; }
        
        public Guid? TeacherId { get; set; }
        
        [MaxLength(1000)]
        public string? Description { get; set; }

        public string? StreamUrl { get; set; }
        public DateTime ScheduledAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public int? DurationMins { get; set; }
        public string Status { get; set; } = "scheduled"; // scheduled, live, ended
        public int ViewerCount { get; set; } = 0;
        public int? ViewersCount { get; set; }        public DateTime? EndedAt { get; set; }        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ChatMessage> ChatMessages { get; set; }
    }
}
