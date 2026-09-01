using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    [Table("AssessmentGrades")]
    public class AssessmentGrade
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid AssessmentId { get; set; }
        public Assessment? Assessment { get; set; }

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public decimal Grade { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}