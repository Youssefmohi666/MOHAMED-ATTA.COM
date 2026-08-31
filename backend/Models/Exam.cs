using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    [Table("Exams")]
    public class Exam
    {
        [Key]
        public Guid Id { get; set; }

        public Guid TeacherId { get; set; }

        public Guid? SubjectId { get; set; }

        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;

        public int DurationMinutes { get; set; } = 30;

        public string QuestionsJson { get; set; } = string.Empty;

        public int TotalPoints { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "draft";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("ExamAttempts")]
    public class ExamAttempt
    {
        [Key]
        public Guid Id { get; set; }

        public Guid ExamId { get; set; }

        public Guid StudentId { get; set; }

        public string AnswersJson { get; set; } = string.Empty;

        public int Score { get; set; }

        public int TotalPoints { get; set; }

        public int Violations { get; set; }

        public DateTime StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "in_progress";
    }
}
