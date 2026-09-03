using elmanassa.Models;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    public class CommentCreateDTO
    {
        [Required]
        [MaxLength(1000)]
        public string Content { get; set; }
    }

    public class LiveStreamCreateDTO
    {
        public string Title { get; set; }
        public string Description { get; set; }
    }

    public class AiMessageCreateDTO
    {
        [Required]
        public string Message { get; set; }
    }

    public class AiConversationCreateDTO
    {
        [Required]
        public string Title { get; set; }
    }

    public class AiMessageDTO
    {
        public int Id { get; set; }
        public Guid ConversationId { get; set; }
        public string Role { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AiConversationDTO
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Title { get; set; }
        public List<AiMessageDTO> Messages { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ContactMessageCreateDTO
    {
        [Required]
        [MaxLength(255)]
        public string Name { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        public string? Type { get; set; }
        public string? Subject { get; set; }

        [Required]
        public string Message { get; set; }
    }

    public class LiveStreamDTO
    {
        public int Id { get; set; }
        public Guid TeacherId { get; set; }
        public string TeacherName { get; set; }
        public string Title { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; }
        public int ViewersCount { get; set; }
        public DateTime StartedAt { get; set; }
        public string StreamUrl { get; set; }
    }

    public class ChatMessageCreateDTO
    {
        [Required]
        public string Message { get; set; }
    }

    public class ChatMessageDTO
    {
        public int Id { get; set; }
        public int LiveStreamId { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; }
        public string UserAvatarUrl { get; set; }
        public string Message { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class BlogPostDTO
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string? Excerpt { get; set; }
        public string Content { get; set; }
        public string? ImageUrl { get; set; }
        public Guid? AuthorId { get; set; }
        public string? Tags { get; set; }
        public string? Category { get; set; }
        public int Views { get; set; }
        public string Status { get; set; }
        public DateTime? PublishedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SubscriptionPlanDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public decimal PriceMonthly { get; set; }
        public decimal? Price { get; set; }
        public int? DurationMonths { get; set; }
        public string Features { get; set; }
        public string? Description { get; set; }
        public bool IsPopular { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class TestimonialDTO
    {
        public int Id { get; set; }
        public Guid? UserId { get; set; }
        public string UserName { get; set; }
        public string? StudentName { get; set; }
        public string? Role { get; set; }
        public string? JobTitle { get; set; }
        public string? AvatarUrl { get; set; }
        public string Text { get; set; }
        public string? Content { get; set; }
        public int Rating { get; set; }
        public bool? IsApproved { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class StatisticsDTO
    {
        public int TotalStudents { get; set; }
        public int TotalCourses { get; set; }
        public int TotalTeachers { get; set; }
        public decimal AverageRating { get; set; }

        //
        public int TotalEnrollments { get; set; }
        public int TotalSubjects { get; set; }
        public List<CourseDTO> RecentCourses { get; set; }
    }
}
