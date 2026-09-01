using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    [Table("Assessments")]
    public class Assessment
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = "Quiz";

        [Required]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        public Guid SubjectId { get; set; }
        public Subject? Subject { get; set; }

        public Guid? ClassRoomId { get; set; }
        public ClassRoom? ClassRoom { get; set; }

        public decimal MaxGrade { get; set; } = 100;

        public DateTime Date { get; set; } = DateTime.UtcNow;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}