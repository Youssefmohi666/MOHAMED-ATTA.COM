using System;
using System.Collections.Generic;

namespace elmanassa.DTOs
{
    public class BankQuestionDTO
    {
        public Guid Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public List<string> Options { get; set; } = new();
        public int CorrectAnswer { get; set; }
        public int Points { get; set; } = 1;
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public Guid? LevelId { get; set; }
        public string? LevelName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class BankQuestionCreateDTO
    {
        public string Text { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public List<string>? Options { get; set; }
        public int CorrectAnswer { get; set; }
        public int? Points { get; set; }
        public string? SubjectId { get; set; }
        public string? LevelId { get; set; }
    }

    public class BankQuestionUpdateDTO
    {
        public string? Text { get; set; }
        public string? ImageUrl { get; set; }
        public List<string>? Options { get; set; }
        public int? CorrectAnswer { get; set; }
        public int? Points { get; set; }
        public string? SubjectId { get; set; }
        public string? LevelId { get; set; }
    }

    public class BankQueryDTO
    {
        public string? SubjectId { get; set; }
        public string? Search { get; set; }
        public int PerPage { get; set; } = 200;
    }

    public class BuildExamFromBankDTO
    {
        public string Title { get; set; } = string.Empty;
        public int DurationMinutes { get; set; } = 30;
        public string? SubjectId { get; set; }
        public List<string> QuestionIds { get; set; } = new();
    }

    public class AddQuestionsToExamDTO
    {
        public string ExamId { get; set; } = string.Empty;
        public List<string> QuestionIds { get; set; } = new();
    }
}
