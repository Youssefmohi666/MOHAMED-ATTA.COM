namespace elmanassa.DTOs
{
    public class ExamQuestionDTO
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public List<string> Options { get; set; } = new();
        public int CorrectAnswer { get; set; }
        public int Points { get; set; } = 1;
    }

    public class ExamQuestionViewDTO
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public List<string> Options { get; set; } = new();
        public int Points { get; set; } = 1;
    }

    public class ExamGenerateDTO
    {
        public string Topic { get; set; } = string.Empty;
        public int QuestionCount { get; set; } = 5;
        public int DurationMinutes { get; set; } = 15;
        public string SubjectId { get; set; } = string.Empty;
        public string Language { get; set; } = "ar";
    }

    public class ExamCreateDTO
    {
        public string Title { get; set; } = string.Empty;
        public int DurationMinutes { get; set; } = 30;
        public List<ExamQuestionDTO> Questions { get; set; } = new();
        public string SubjectId { get; set; } = string.Empty;
    }

    public class ExamUpdateDTO
    {
        public string? Title { get; set; }
        public int? DurationMinutes { get; set; }
        public List<ExamQuestionDTO>? Questions { get; set; }
        public string? SubjectId { get; set; }
    }

    public class ExamDTO
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int DurationMinutes { get; set; }
        public int QuestionCount { get; set; }
        public int TotalPoints { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class ExamDetailDTO : ExamDTO
    {
        public List<ExamQuestionViewDTO> Questions { get; set; } = new();
        public Guid? SubjectId { get; set; }
    }

    public class ExamSubmitDTO
    {
        public List<int> Answers { get; set; } = new();
        public int Violations { get; set; }
        public int TimeSpentSeconds { get; set; }
    }

    public class ExamResultDTO
    {
        public Guid AttemptId { get; set; }
        public Guid ExamId { get; set; }
        public string ExamTitle { get; set; } = string.Empty;
        public int Score { get; set; }
        public int TotalPoints { get; set; }
        public double Percentage { get; set; }
        public string Status { get; set; } = string.Empty;
        public int Violations { get; set; }
        public int TimeSpentSeconds { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public bool Passed { get; set; }
        public List<QuestionResultDTO> QuestionResults { get; set; } = new();
    }

    public class QuestionResultDTO
    {
        public int QuestionId { get; set; }
        public string Text { get; set; } = string.Empty;
        public int YourAnswer { get; set; }
        public int CorrectAnswer { get; set; }
        public bool IsCorrect { get; set; }
        public int Points { get; set; }
        public int EarnedPoints { get; set; }
    }

    public class ExamListItemDTO
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int DurationMinutes { get; set; }
        public int QuestionCount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class ExamPublishDTO
    {
        public string Status { get; set; } = "published";
    }

    public class StudentExamResultDTO
    {
        public Guid AttemptId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public int Score { get; set; }
        public int TotalPoints { get; set; }
        public int TimeSpentSeconds { get; set; }
        public DateTime SubmittedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
