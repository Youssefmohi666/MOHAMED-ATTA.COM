using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    public class AccountingTransaction
    {
        [Key]
        [MaxLength(50)]
        public string Id { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string StudentName { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string Date { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Service { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        /// <summary>SAR or EGP</summary>
        [MaxLength(5)]
        public string Currency { get; set; } = "SAR";

        /// <summary>income or expense</summary>
        [Required]
        [MaxLength(10)]
        public string Type { get; set; } = "income";

        [MaxLength(50)]
        public string? InvoiceNumber { get; set; }

        [MaxLength(50)]
        public string? PaymentMethod { get; set; }

        [MaxLength(30)]
        public string? ContactNumber { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Null = admin transaction; set = teacher-scoped transaction</summary>
        public Guid? TeacherId { get; set; }
        public User? Teacher { get; set; }
    }
}
