using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    public class FreeEnrollDTO
    {
        [Required]
        public string SubjectId { get; set; }
    }

    public class FreeEnrollResult
    {
        public string Code { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }

    public class AssignmentSubmitDTO
    {
        public string? AnswerText { get; set; }
        public List<string>? FileUrls { get; set; }
    }
}
