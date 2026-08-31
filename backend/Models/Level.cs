using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class Level
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid SubjectId { get; set; }
        public Subject Subject { get; set; }

        [Required]
        [MaxLength(255)]
        public string Name { get; set; }

        public int SortOrder { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Lecture> Lectures { get; set; }
    }
}
