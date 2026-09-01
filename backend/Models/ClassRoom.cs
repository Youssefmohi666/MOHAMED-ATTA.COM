using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    [Table("ClassRooms")]
    public class ClassRoom
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public Guid SubjectId { get; set; }
        public Subject? Subject { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}