using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace elmanassa.Services
{
    public interface IQuestionBankService
    {
        Task<List<BankQuestionDTO>> GetQuestionsAsync(Guid teacherId, BankQueryDTO query);
        Task<BankQuestionDTO?> CreateQuestionAsync(Guid teacherId, BankQuestionCreateDTO dto);
        Task<BankQuestionDTO?> UpdateQuestionAsync(Guid id, Guid teacherId, BankQuestionUpdateDTO dto);
        Task<bool> DeleteQuestionAsync(Guid id, Guid teacherId);
        Task<ExamDetailDTO?> BuildExamAsync(Guid teacherId, BuildExamFromBankDTO dto);
        Task<bool> AddQuestionsToExamAsync(Guid teacherId, AddQuestionsToExamDTO dto);
    }

    public class QuestionBankService : IQuestionBankService
    {
        private readonly AppDbContext _context;

        public QuestionBankService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<BankQuestionDTO>> GetQuestionsAsync(Guid teacherId, BankQueryDTO query)
        {
            var q = _context.Set<BankQuestion>()
                .Where(b => b.TeacherId == teacherId)
                .AsQueryable();

            if (Guid.TryParse(query.SubjectId, out var subjectId))
                q = q.Where(b => b.SubjectId == subjectId);

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim();
                q = q.Where(b => b.Text.Contains(search));
            }

            var questions = await q
                .OrderByDescending(b => b.CreatedAt)
                .Take(Math.Max(1, query.PerPage))
                .ToListAsync();

            var levelIds = questions.Where(x => x.LevelId.HasValue).Select(x => x.LevelId!.Value).Distinct().ToList();
            var subjectIds = questions.Where(x => x.SubjectId.HasValue).Select(x => x.SubjectId!.Value).Distinct().ToList();
            var levels = await _context.Set<Level>().Where(l => levelIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, l => l.Name);
            var subjects = await _context.Set<Subject>().Where(s => subjectIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Name);

            return questions.Select(b => ToDto(b, subjects, levels)).ToList();
        }

        public async Task<BankQuestionDTO?> CreateQuestionAsync(Guid teacherId, BankQuestionCreateDTO dto)
        {
            var options = dto.Options ?? new List<string>();
            var question = new BankQuestion
            {
                Id = Guid.NewGuid(),
                TeacherId = teacherId,
                Text = dto.Text,
                ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl) ? null : dto.ImageUrl,
                OptionsJson = JsonSerializer.Serialize(options),
                CorrectAnswer = dto.CorrectAnswer,
                Points = dto.Points ?? 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (Guid.TryParse(dto.SubjectId, out var sid)) question.SubjectId = sid;
            if (Guid.TryParse(dto.LevelId, out var lid)) question.LevelId = lid;

            _context.Set<BankQuestion>().Add(question);
            await _context.SaveChangesAsync();

            return ToDto(question, null, null);
        }

        public async Task<BankQuestionDTO?> UpdateQuestionAsync(Guid id, Guid teacherId, BankQuestionUpdateDTO dto)
        {
            var question = await _context.Set<BankQuestion>()
                .FirstOrDefaultAsync(b => b.Id == id && b.TeacherId == teacherId);
            if (question == null) return null;

            if (dto.Text != null) question.Text = dto.Text;
            if (dto.ImageUrl != null) question.ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl) ? null : dto.ImageUrl;
            if (dto.Options != null) question.OptionsJson = JsonSerializer.Serialize(dto.Options);
            if (dto.CorrectAnswer.HasValue) question.CorrectAnswer = dto.CorrectAnswer.Value;
            if (dto.Points.HasValue) question.Points = dto.Points.Value;
            if (dto.SubjectId != null) question.SubjectId = Guid.TryParse(dto.SubjectId, out var sid) ? sid : null;
            if (dto.LevelId != null) question.LevelId = Guid.TryParse(dto.LevelId, out var lid) ? lid : null;
            question.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return ToDto(question, null, null);
        }

        public async Task<bool> DeleteQuestionAsync(Guid id, Guid teacherId)
        {
            var question = await _context.Set<BankQuestion>()
                .FirstOrDefaultAsync(b => b.Id == id && b.TeacherId == teacherId);
            if (question == null) return false;

            _context.Set<BankQuestion>().Remove(question);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ExamDetailDTO?> BuildExamAsync(Guid teacherId, BuildExamFromBankDTO dto)
        {
            if (dto.QuestionIds == null || dto.QuestionIds.Count == 0) return null;

            var ids = dto.QuestionIds.Select(x => Guid.TryParse(x, out var g) ? g : Guid.Empty).Where(g => g != Guid.Empty).ToList();
            var questions = await _context.Set<BankQuestion>()
                .Where(b => ids.Contains(b.Id) && b.TeacherId == teacherId)
                .ToListAsync();
            if (questions.Count == 0) return null;

            var examQuestions = questions.Select(q => new ExamQuestionDTO
            {
                Id = 0,
                Text = q.Text,
                ImageUrl = q.ImageUrl,
                Options = JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new(),
                CorrectAnswer = q.CorrectAnswer,
                Points = q.Points
            }).ToList();

            var totalPoints = examQuestions.Sum(x => x.Points);
            var exam = new Exam
            {
                Id = Guid.NewGuid(),
                TeacherId = teacherId,
                Title = dto.Title,
                DurationMinutes = dto.DurationMinutes,
                QuestionsJson = JsonSerializer.Serialize(examQuestions),
                TotalPoints = totalPoints,
                Status = "draft",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (Guid.TryParse(dto.SubjectId, out var subjectId)) exam.SubjectId = subjectId;

            _context.Set<Exam>().Add(exam);
            await _context.SaveChangesAsync();

            return ToExamDetail(exam, examQuestions);
        }

        public async Task<bool> AddQuestionsToExamAsync(Guid teacherId, AddQuestionsToExamDTO dto)
        {
            var exam = await _context.Set<Exam>().FirstOrDefaultAsync(e => e.Id == Guid.Parse(dto.ExamId) && e.TeacherId == teacherId);
            if (exam == null) return false;

            var existing = JsonSerializer.Deserialize<List<ExamQuestionDTO>>(exam.QuestionsJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

            var ids = (dto.QuestionIds ?? new List<string>())
                .Select(x => Guid.TryParse(x, out var g) ? g : Guid.Empty)
                .Where(g => g != Guid.Empty).ToList();

            var questions = await _context.Set<BankQuestion>()
                .Where(b => ids.Contains(b.Id) && b.TeacherId == teacherId)
                .ToListAsync();

            foreach (var q in questions)
            {
                existing.Add(new ExamQuestionDTO
                {
                    Id = 0,
                    Text = q.Text,
                    ImageUrl = q.ImageUrl,
                    Options = JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new(),
                    CorrectAnswer = q.CorrectAnswer,
                    Points = q.Points
                });
            }

            exam.QuestionsJson = JsonSerializer.Serialize(existing);
            exam.TotalPoints = existing.Sum(x => x.Points);
            exam.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        private static BankQuestionDTO ToDto(BankQuestion b, Dictionary<Guid, string>? subjects, Dictionary<Guid, string>? levels)
        {
            return new BankQuestionDTO
            {
                Id = b.Id,
                Text = b.Text,
                ImageUrl = b.ImageUrl,
                Options = JsonSerializer.Deserialize<List<string>>(b.OptionsJson) ?? new(),
                CorrectAnswer = b.CorrectAnswer,
                Points = b.Points,
                SubjectId = b.SubjectId,
                SubjectName = b.SubjectId.HasValue && subjects != null && subjects.ContainsKey(b.SubjectId.Value) ? subjects[b.SubjectId.Value] : null,
                LevelId = b.LevelId,
                LevelName = b.LevelId.HasValue && levels != null && levels.ContainsKey(b.LevelId.Value) ? levels[b.LevelId.Value] : null,
                CreatedAt = b.CreatedAt
            };
        }

        private static ExamDetailDTO ToExamDetail(Exam exam, List<ExamQuestionDTO> questions)
        {
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
    }
}
