using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class SubscriptionPlan
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [Required]
        public decimal PriceMonthly { get; set; }
        public decimal? Price { get; set; }
        public int? DurationMonths { get; set; }

        [Required]
        public string Features { get; set; } // JSON format
        [MaxLength(1000)]
        public string? Description { get; set; }

        public bool IsPopular { get; set; } = false;
        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
