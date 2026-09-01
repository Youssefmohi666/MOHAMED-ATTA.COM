using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace elmanassa.Services
{
    public interface IExamService
    {
Task<ExamDetailDTO?> GenerateExamAsync(Guid teacherId, ExamGenerateDTO dto);
        Task<ExamDetailDTO?> CreateExamAsync(Guid teacherId, ExamCreateDTO dto);
        Task<ExamDetailDTO?> GetExamAsync(Guid id);
        Task<List<ExamListItemDTO>> GetTeacherExamsAsync(Guid teacherId);
        Task<ExamDetailDTO?> UpdateExamAsync(Guid id, Guid teacherId, ExamUpdateDTO dto);
        Task<bool> PublishExamAsync(Guid id, Guid teacherId, string status);
        Task<bool> DeleteExamAsync(Guid id, Guid teacherId);
        Task<List<ExamListItemDTO>> GetAvailableExamsAsync();
        Task<ExamResultDTO?> SubmitAttemptAsync(Guid examId, Guid studentId, ExamSubmitDTO dto);
        Task<ExamResultDTO?> GetAttemptResultAsync(Guid attemptId, Guid studentId);
        Task<List<StudentExamResultDTO>> GetExamResultsAsync(Guid examId, Guid teacherId);
    }

    public class ExamService : IExamService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ExamService> _logger;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        public ExamService(
            AppDbContext context,
            ILogger<ExamService> logger,
            IConfiguration config,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _logger = logger;
            _config = config;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<ExamDetailDTO?> GenerateExamAsync(Guid teacherId, ExamGenerateDTO dto)
        {
            try
            {
                var apiKey = _config["OpenCodeZen:ApiKey"];
                var baseUrl = _config["OpenCodeZen:BaseUrl"] ?? "https://opencode.ai/zen/v1";
                var model = _config["OpenCodeZen:Model"] ?? "nemotron-3-ultra-free";

                if (string.IsNullOrEmpty(apiKey))
                    throw new InvalidOperationException("OpenCode Zen API key not configured");

                var lang = dto.Language == "en" ? "English" : "Arabic";

                var prompt = $@"Create an exam about: {dto.Topic}

Number of questions: {dto.QuestionCount}
Language: {lang}

You MUST respond with ONLY a JSON object with this exact structure:
{{
  ""title"": ""exam title"",
  ""questions"": [
    {{
      ""id"": 1,
      ""text"": ""question text"",
      ""options"": [""option1"", ""option2"", ""option3"", ""option4""],
      ""correctAnswer"": 0,
      ""points"": 1
    }}
  ]
}}

Each question MUST have exactly 4 options. correctAnswer is the 0-based index of the correct option. No markdown, no code blocks, only raw JSON.";

                var messages = new List<object>
                {
                    new { role = "system", content = "You are an exam generator. Respond ONLY with valid JSON. No markdown, no code blocks." },
                    new { role = "user", content = prompt }
                };

                var payload = JsonSerializer.Serialize(new
                {
                    model,
                    messages,
                    temperature = 0.5,
                    max_tokens = 4096
                });

                var httpClient = _httpClientFactory.CreateClient();
                var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

                var response = await httpClient.SendAsync(request);
                response.EnsureSuccessStatusCode();

                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);

                var jsonContent = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString() ?? "{}";

                jsonContent = jsonContent.Trim();
                if (jsonContent.StartsWith("```json")) jsonContent = jsonContent[7..];
                if (jsonContent.StartsWith("```")) jsonContent = jsonContent[3..];
                if (jsonContent.EndsWith("```")) jsonContent = jsonContent[..^3];
                jsonContent = jsonContent.Trim();

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var generated = JsonSerializer.Deserialize<ExamGenerateResponse>(jsonContent, options);

                if (generated?.Questions == null || generated.Questions.Count == 0)
                    throw new InvalidOperationException("Failed to generate exam questions");

                for (int i = 0; i < generated.Questions.Count; i++)
                    generated.Questions[i].Id = i;

                var totalPoints = generated.Questions.Sum(q => q.Points);

                var exam = new Exam
                {
                    Id = Guid.NewGuid(),
                    TeacherId = teacherId,
                    Title = generated.Title ?? dto.Topic,
                    DurationMinutes = dto.DurationMinutes,
                    QuestionsJson = JsonSerializer.Serialize(generated.Questions),
                    TotalPoints = totalPoints,
                    Status = "draft",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                if (Guid.TryParse(dto.SubjectId, out var subjectId))
                    exam.SubjectId = subjectId;

                _context.Set<Exam>().Add(exam);
                await _context.SaveChangesAsync();

                return new ExamDetailDTO
                {
                    Id = exam.Id,
                    Title = exam.Title,
                    DurationMinutes = exam.DurationMinutes,
                    QuestionCount = generated.Questions.Count,
                    TotalPoints = totalPoints,
                    Status = exam.Status,
                    CreatedAt = exam.CreatedAt,
                    SubjectId = exam.SubjectId,
                    Questions = generated.Questions.Select(q => new ExamQuestionViewDTO
                    {
                        Id = q.Id,
                        Text = q.Text,
                        Options = q.Options,
                        Points = q.Points
                    }).ToList()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating exam");
                throw;
            }
        }

        public async Task<ExamDetailDTO?> CreateExamAsync(Guid teacherId, ExamCreateDTO dto)
        {
            var totalPoints = dto.Questions.Sum(q => q.Points);

            var exam = new Exam
            {
                Id = Guid.NewGuid(),
                TeacherId = teacherId,
                Title = dto.Title,
                DurationMinutes = dto.DurationMinutes,
                QuestionsJson = JsonSerializer.Serialize(dto.Questions),
                TotalPoints = totalPoints,
                Status = "published",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (Guid.TryParse(dto.SubjectId, out var subjectId))
                exam.SubjectId = subjectId;

            _context.Set<Exam>().Add(exam);
            await _context.SaveChangesAsync();

            return new ExamDetailDTO
            {
                Id = exam.Id,
                Title = exam.Title,
                DurationMinutes = exam.DurationMinutes,
                QuestionCount = dto.Questions.Count,
                TotalPoints = totalPoints,
                Status = exam.Status,
                CreatedAt = exam.CreatedAt,
                SubjectId = exam.SubjectId,
                Questions = dto.Questions.Select(q => new ExamQuestionViewDTO
                {
                    Id = q.Id,
                    Text = q.Text,
                    Options = q.Options,
                    Points = q.Points
                }).ToList()
            };
        }

        public async Task<ExamDetailDTO?> GetExamAsync(Guid id)
        {
            var exam = await _context.Set<Exam>().FindAsync(id);
            if (exam == null) return null;

            var questions = JsonSerializer.Deserialize<List<ExamQuestionDTO>>(exam.QuestionsJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

            return new ExamDetailDTO
            {
                Id = exam.Id,
                Title = exam.Title,
                DurationMinutes = exam.DurationMinutes,
                QuestionCount = questions.Count,
                TotalPoints = exam.TotalPoints,
                Status = exam.Status,
                CreatedAt = exam.CreatedAt,
                SubjectId = exam.SubjectId,
                Questions = questions.Select(q => new ExamQuestionViewDTO
                {
                    Id = q.Id,
                    Text = q.Text,
                    ImageUrl = q.ImageUrl,
                    Options = q.Options,
                    Points = q.Points
                }).ToList()
            };
        }

        public async Task<List<ExamListItemDTO>> GetTeacherExamsAsync(Guid teacherId)
        {
            var exams = await _context.Set<Exam>()
                .Where(e => e.TeacherId == teacherId)
                .OrderByDescending(e => e.CreatedAt)
                .ToListAsync();

            return exams.Select(e =>
            {
                var questions = JsonSerializer.Deserialize<List<ExamQuestionDTO>>(e.QuestionsJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                return new ExamListItemDTO
                {
                    Id = e.Id,
                    Title = e.Title,
                    DurationMinutes = e.DurationMinutes,
                    QuestionCount = questions.Count,
                    Status = e.Status,
                    CreatedAt = e.CreatedAt
                };
            }).ToList();
        }

        public async Task<ExamDetailDTO?> UpdateExamAsync(Guid id, Guid teacherId, ExamUpdateDTO dto)
        {
            var exam = await _context.Set<Exam>()
                .FirstOrDefaultAsync(e => e.Id == id && e.TeacherId == teacherId);
            if (exam == null) return null;

            if (!string.IsNullOrWhiteSpace(dto.Title))
                exam.Title = dto.Title;
            if (dto.DurationMinutes.HasValue)
                exam.DurationMinutes = dto.DurationMinutes.Value;
            if (dto.Questions != null && dto.Questions.Count > 0)
            {
                for (int i = 0; i < dto.Questions.Count; i++)
                    dto.Questions[i].Id = i;
                exam.QuestionsJson = JsonSerializer.Serialize(dto.Questions);
                exam.TotalPoints = dto.Questions.Sum(q => q.Points);
            }
            if (Guid.TryParse(dto.SubjectId, out var subjectId))
                exam.SubjectId = subjectId;

            exam.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var questions = JsonSerializer.Deserialize<List<ExamQuestionDTO>>(exam.QuestionsJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

            return new ExamDetailDTO
            {
                Id = exam.Id, Title = exam.Title, DurationMinutes = exam.DurationMinutes,
                QuestionCount = questions.Count, TotalPoints = exam.TotalPoints,
                Status = exam.Status, CreatedAt = exam.CreatedAt, SubjectId = exam.SubjectId,
                Questions = questions.Select(q => new ExamQuestionViewDTO
                {
                    Id = q.Id, Text = q.Text, ImageUrl = q.ImageUrl, Options = q.Options, Points = q.Points
                }).ToList()
            };
        }

        public async Task<bool> PublishExamAsync(Guid id, Guid teacherId, string status)
        {
            var exam = await _context.Set<Exam>()
                .FirstOrDefaultAsync(e => e.Id == id && e.TeacherId == teacherId);
            if (exam == null) return false;

            exam.Status = status;
            exam.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<ExamListItemDTO>> GetAvailableExamsAsync()
        {
            var exams = await _context.Set<Exam>()
                .Where(e => e.Status == "published")
                .OrderByDescending(e => e.CreatedAt)
                .ToListAsync();

            return exams.Select(e =>
            {
                var questions = JsonSerializer.Deserialize<List<ExamQuestionDTO>>(e.QuestionsJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                return new ExamListItemDTO
                {
                    Id = e.Id, Title = e.Title, DurationMinutes = e.DurationMinutes,
                    QuestionCount = questions.Count, Status = e.Status, CreatedAt = e.CreatedAt
                };
            }).ToList();
        }

        public async Task<bool> DeleteExamAsync(Guid id, Guid teacherId)
        {
            var exam = await _context.Set<Exam>()
                .FirstOrDefaultAsync(e => e.Id == id && e.TeacherId == teacherId);
            if (exam == null) return false;

            _context.Set<Exam>().Remove(exam);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ExamResultDTO?> SubmitAttemptAsync(Guid examId, Guid studentId, ExamSubmitDTO dto)
        {
            var exam = await _context.Set<Exam>().FindAsync(examId);
            if (exam == null) return null;

            var questions = JsonSerializer.Deserialize<List<ExamQuestionDTO>>(exam.QuestionsJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

            int score = 0;
            var questionResults = new List<QuestionResultDTO>();

            for (int i = 0; i < questions.Count; i++)
            {
                var q = questions[i];
                var studentAnswer = i < dto.Answers.Count ? dto.Answers[i] : -1;
                var isCorrect = studentAnswer == q.CorrectAnswer;

                if (isCorrect) score += q.Points;

                questionResults.Add(new QuestionResultDTO
                {
                    QuestionId = q.Id,
                    Text = q.Text,
                    YourAnswer = studentAnswer,
                    CorrectAnswer = q.CorrectAnswer,
                    IsCorrect = isCorrect,
                    Points = q.Points,
                    EarnedPoints = isCorrect ? q.Points : 0
                });
            }

            var attempt = new ExamAttempt
            {
                Id = Guid.NewGuid(),
                ExamId = examId,
                StudentId = studentId,
                AnswersJson = JsonSerializer.Serialize(dto.Answers),
                Score = score,
                TotalPoints = exam.TotalPoints,
                Violations = dto.Violations,
                StartedAt = DateTime.UtcNow.AddSeconds(-dto.TimeSpentSeconds),
                SubmittedAt = DateTime.UtcNow,
                Status = "completed"
            };

            _context.Set<ExamAttempt>().Add(attempt);
            await _context.SaveChangesAsync();

            var percentage = exam.TotalPoints > 0 ? (double)score / exam.TotalPoints * 100 : 0;

            return new ExamResultDTO
            {
                AttemptId = attempt.Id,
                ExamId = examId,
                ExamTitle = exam.Title,
                Score = score,
                TotalPoints = exam.TotalPoints,
                Percentage = Math.Round(percentage, 1),
                Status = "completed",
                Violations = dto.Violations,
                TimeSpentSeconds = dto.TimeSpentSeconds,
                StartedAt = attempt.StartedAt,
                SubmittedAt = attempt.SubmittedAt,
                Passed = percentage >= 50,
                QuestionResults = questionResults
            };
        }

        public async Task<ExamResultDTO?> GetAttemptResultAsync(Guid attemptId, Guid studentId)
        {
            var attempt = await _context.Set<ExamAttempt>()
                .FirstOrDefaultAsync(a => a.Id == attemptId && a.StudentId == studentId);
            if (attempt == null) return null;

            var exam = await _context.Set<Exam>().FindAsync(attempt.ExamId);
            if (exam == null) return null;

            var questions = JsonSerializer.Deserialize<List<ExamQuestionDTO>>(exam.QuestionsJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

            var answers = JsonSerializer.Deserialize<List<int>>(attempt.AnswersJson) ?? new();

            var questionResults = new List<QuestionResultDTO>();
            for (int i = 0; i < questions.Count; i++)
            {
                var q = questions[i];
                var studentAnswer = i < answers.Count ? answers[i] : -1;
                var isCorrect = studentAnswer == q.CorrectAnswer;

                questionResults.Add(new QuestionResultDTO
                {
                    QuestionId = q.Id,
                    Text = q.Text,
                    YourAnswer = studentAnswer,
                    CorrectAnswer = q.CorrectAnswer,
                    IsCorrect = isCorrect,
                    Points = q.Points,
                    EarnedPoints = isCorrect ? q.Points : 0
                });
            }

            var percentage = attempt.TotalPoints > 0 ? (double)attempt.Score / attempt.TotalPoints * 100 : 0;

            return new ExamResultDTO
            {
                AttemptId = attempt.Id,
                ExamId = exam.Id,
                ExamTitle = exam.Title,
                Score = attempt.Score,
                TotalPoints = attempt.TotalPoints,
                Percentage = Math.Round(percentage, 1),
                Status = attempt.Status,
                Violations = attempt.Violations,
                TimeSpentSeconds = attempt.SubmittedAt.HasValue
                    ? (int)(attempt.SubmittedAt.Value - attempt.StartedAt).TotalSeconds
                    : 0,
                StartedAt = attempt.StartedAt,
                SubmittedAt = attempt.SubmittedAt,
                Passed = percentage >= 50,
                QuestionResults = questionResults
            };
        }

       

        public async Task<List<StudentExamResultDTO>> GetExamResultsAsync(Guid examId, Guid teacherId)
        {
            var exam = await _context.Set<Exam>()
                .FirstOrDefaultAsync(e => e.Id == examId && e.TeacherId == teacherId);
            if (exam == null) return new();

            var attempts = await _context.Set<ExamAttempt>()
                .Where(a => a.ExamId == examId && a.Status == "completed")
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync();

            var studentIds = attempts.Select(a => a.StudentId).Distinct().ToList();
            var students = await _context.Users
                .Where(u => studentIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Name);

            return attempts.Select(a =>
            {
                var timeSpent = a.SubmittedAt.HasValue
                    ? (int)(a.SubmittedAt.Value - a.StartedAt).TotalSeconds
                    : 0;
                return new StudentExamResultDTO
                {
                    AttemptId = a.Id,
                    StudentName = students.GetValueOrDefault(a.StudentId, "طالب"),
                    Score = a.Score,
                    TotalPoints = a.TotalPoints,
                    TimeSpentSeconds = timeSpent,
                    SubmittedAt = a.SubmittedAt ?? a.StartedAt,
                    Status = a.Score >= a.TotalPoints / 2.0 ? "ناجح" : "راسب"
                };
            }).ToList();
        }

        private class ExamGenerateResponse
        {
            public string Title { get; set; } = string.Empty;
            public List<ExamQuestionDTO> Questions { get; set; } = new();
        }
    }
}
