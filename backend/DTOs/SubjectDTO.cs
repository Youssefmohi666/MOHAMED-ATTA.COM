using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    public class SubjectCreateDTO
    {
        [Required]
        [MaxLength(255)]
        public string Name { get; set; }

        public string? Description { get; set; }
        public string Icon { get; set; } = "📚";
        public List<LevelCreateDTO>? Levels { get; set; }
    }

    public class SubjectUpdateDTO
    {
        [MaxLength(255)]
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? Icon { get; set; }
    }

    public class SubjectDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public string Icon { get; set; }
        public int StudentsCount { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<LevelDTO> Levels { get; set; } = new();
    }

    public class LevelCreateDTO
    {
        [Required]
        [MaxLength(255)]
        public string Name { get; set; }

        public int SortOrder { get; set; }
        public List<LectureCreateDTO>? Lectures { get; set; }
    }

    public class LevelDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public int SortOrder { get; set; }
        public List<LectureDTO> Lectures { get; set; } = new();
    }

    public class LectureCreateDTO
    {
        [Required]
        [MaxLength(500)]
        public string Title { get; set; }

        public string? Duration { get; set; }
        public string? VideoUrl { get; set; }
        public int SortOrder { get; set; }
    }

    public class LectureDTO
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string? Duration { get; set; }
        public string? VideoUrl { get; set; }
        public int SortOrder { get; set; }
    }
}
