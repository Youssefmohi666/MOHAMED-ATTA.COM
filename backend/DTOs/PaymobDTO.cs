using System.ComponentModel.DataAnnotations;

namespace elmanassa.DTOs
{
    public class PaymobCreatePaymentDTO
    {
        /// <summary>Subject being purchased.</summary>
        [Required]
        public Guid SubjectId { get; set; }

        /// <summary>card | wallet</summary>
        [Required]
        [MaxLength(20)]
        public string PaymentMethod { get; set; } = "card";

        public string? CouponCode { get; set; }

        [MaxLength(255)]
        public string? BillingFullName { get; set; }

        [EmailAddress]
        [MaxLength(255)]
        public string? BillingEmail { get; set; }

        [MaxLength(20)]
        public string? BillingPhone { get; set; }
    }

    public class PaymobPaymentResponseDTO
    {
        public Guid OrderId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public string RedirectUrl { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "EGP";
    }
}
