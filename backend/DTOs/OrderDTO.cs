using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    public class OrderCreateDTO
    {
        [Required]
        public int CourseId { get; set; }

        [Required]
        public string PaymentMethod { get; set; }

        public string? CouponCode { get; set; }

        [Required]
        [MaxLength(255)]
        public string BillingFullName { get; set; }

        [Required]
        [EmailAddress]
        public string BillingEmail { get; set; }

        public string? BillingPhone { get; set; }
    }

    public class OrderDTO
    {
        public Guid Id { get; set; }
        public string OrderNumber { get; set; }
        public Guid UserId { get; set; }
        public int? CourseId { get; set; }
        public decimal OriginalPrice { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal FinalPrice { get; set; }
        public string PaymentMethod { get; set; }
        public string PaymentStatus { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CouponValidateDTO
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; }

        public int? CourseId { get; set; }
    }

    public class CouponValidateResponseDTO
    {
        public bool Valid { get; set; }
        public string? Code { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? FinalPrice { get; set; }
        public decimal DiscountPct { get; set; }
        public string? Message { get; set; }
    }

    public class EnrollmentDTO
    {
        public int Id { get; set; }
        public Guid UserId { get; set; }
        public int? CourseId { get; set; }
        public Guid? SubjectId { get; set; }
        public DateTime EnrolledAt { get; set; }
    }

    public class StudentProgressDTO
    {
        public int TotalCourses { get; set; }
        public int CompletedLectures { get; set; }
        public int TotalLectures { get; set; }
        public double OverallProgress { get; set; }
        public List<SubjectProgressDTO> Subjects { get; set; } = new();
    }

    public class SubjectProgressDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public double Progress { get; set; }
        public DateTime? LastAccessed { get; set; }
    }

    public class LectureProgressUpdateDTO
    {
        [Required]
        public Guid LectureId { get; set; }

        public bool Completed { get; set; }
        public int ProgressPct { get; set; }
    }
}
