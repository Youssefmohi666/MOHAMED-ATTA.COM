using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class Order
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(50)]
        public string OrderNumber { get; set; }

        [Required]
        public Guid UserId { get; set; }
        public User User { get; set; }

        public int? CourseId { get; set; }
        public Course Course { get; set; }

        public Guid? SubjectId { get; set; }
        public Subject Subject { get; set; }

        public decimal OriginalPrice { get; set; }
        public decimal DiscountAmount { get; set; } = 0;
        public decimal FinalPrice { get; set; }

        public int? CouponId { get; set; }
        public Coupon Coupon { get; set; }

        [Required]
        [MaxLength(20)]
        public string PaymentMethod { get; set; } = "card"; // card, wallet, bank

        [Required]
        [MaxLength(20)]
        public string PaymentStatus { get; set; } = "pending"; // pending, completed, failed, refunded

        public decimal Subtotal { get; set; }
        public decimal TotalAmount { get; set; }
        
        [MaxLength(255)]
        public string? BillingFullName { get; set; }
        [MaxLength(100)]
        public string? BillingEmail { get; set; }
        [MaxLength(20)]
        public string? BillingPhone { get; set; }
        [MaxLength(50)]
        public string? CouponCode { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
