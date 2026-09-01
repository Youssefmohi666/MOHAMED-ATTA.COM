using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    [Table("BankQuestions")]
    public class BankQuestion
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid TeacherId { get; set; }

        public Guid? SubjectId { get; set; }

        public Guid? LevelId { get; set; }

        [Required]
        [MaxLength(2000)]
        public string Text { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? ImageUrl { get; set; }

        [Required]
        public string OptionsJson { get; set; } = "[]";

        public int CorrectAnswer { get; set; }

        public int Points { get; set; } = 1;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
