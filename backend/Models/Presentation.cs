using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace elmanassa.Models
{
    [Table("Presentations")]
    public class Presentation
    {
        [Key]
        public Guid Id { get; set; }

        public Guid UserId { get; set; }

        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;

        public string Topic { get; set; } = string.Empty;

        public int SlideCount { get; set; } = 10;

        [MaxLength(100)]
        public string Style { get; set; } = "professional";

        public string ContentJson { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Status { get; set; } = "draft";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
