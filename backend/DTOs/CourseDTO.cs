using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    public class CourseCreateDTO
    {
        [Required]
        [MaxLength(500)]
        public string Title { get; set; }

        public string? Description { get; set; }

        [Required]
        [MaxLength(100)]
        public string Category { get; set; }

        public int Duration { get; set; }
        public int LecturesCount { get; set; }
        public string? Level { get; set; }
        public string? Language { get; set; }
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public string? Status { get; set; }
    }

    public class CourseUpdateDTO
    {
        [MaxLength(500)]
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Category { get; set; }
        public int? Duration { get; set; }
        public string? Level { get; set; }
        public string? Language { get; set; }
        public decimal? Price { get; set; }
        public string? ImageUrl { get; set; }
        public string? Status { get; set; }
    }

    public class CourseDTO
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? Category { get; set; }
        public Guid TeacherId { get; set; }
        public string? TeacherName { get; set; }
        public decimal Rating { get; set; }
        public int Duration { get; set; }
        public int LecturesCount { get; set; }
        public string? Level { get; set; }
        public string? Language { get; set; }
        public int StudentsCount { get; set; }
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public string? Icon { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<LevelDTO> Levels { get; set; } = new();
    }

    public class ReviewCreateDTO
    {
        [Required]
        [Range(1, 5)]
        public int Rating { get; set; }

        public string? Comment { get; set; }
    }

    public class ReviewDTO
    {
        public int Id { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
