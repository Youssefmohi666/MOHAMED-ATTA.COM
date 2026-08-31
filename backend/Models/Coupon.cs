using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class Coupon
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Code { get; set; }

        [Required]
        public decimal DiscountPct { get; set; }
        
        public decimal? DiscountPercentage { get; set; }
        public DateTime? ExpiryDate { get; set; }

        public bool IsActive { get; set; } = true;
        public int? MaxUses { get; set; }
        public int CurrentUses { get; set; } = 0;
        public DateTime? ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
