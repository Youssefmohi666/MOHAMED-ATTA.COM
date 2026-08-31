using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    /// <summary>
    /// Stores every Paymob transaction attempt for audit and idempotency.
    /// </summary>
    public class PaymentTransaction
    {
        [Key]
        public int Id { get; set; }

        /// <summary>Unique reference sent to Paymob as merchant_order_id.</summary>
        [Required]
        [MaxLength(50)]
        public string MerchantOrderId { get; set; } = string.Empty;

        /// <summary>Paymob transaction ID returned in the callback.</summary>
        [MaxLength(100)]
        public string? PaymobTransactionId { get; set; }

        [Required]
        public Guid OrderId { get; set; }
        public Order Order { get; set; } = null!;

        [Required]
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [MaxLength(10)]
        public string Currency { get; set; } = "EGP";

        [MaxLength(20)]
        public string PaymentMethod { get; set; } = "card";

        /// <summary>pending | success | failed</summary>
        [MaxLength(20)]
        public string Status { get; set; } = "pending";

        /// <summary>Raw JSON payload from Paymob server callback for audit.</summary>
        public string? RawCallbackPayload { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
