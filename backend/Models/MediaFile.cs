using System;
using System.ComponentModel.DataAnnotations;

namespace elmanassa.Models
{
    public class MediaFile
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(500)]
        public string OriginalFileName { get; set; }

        [Required]
        [MaxLength(255)]
        public string StoredFileName { get; set; }

        [Required]
        [MaxLength(50)]
        public string FileType { get; set; }

        [Required]
        [MaxLength(50)]
        public string CompressionType { get; set; }

        public long OriginalSize { get; set; }
        public long CompressedSize { get; set; }

        [Required]
        [MaxLength(1000)]
        public string FilePath { get; set; }

        [MaxLength(255)]
        public string? ThumbnailPath { get; set; }

        public int? Duration { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }

        public Guid? SubjectId { get; set; }
        public Subject? Subject { get; set; }

        public Guid? LectureId { get; set; }
        public Lecture? Lecture { get; set; }

        /// <summary>True once HLS transcoding + AES-128 encryption is complete for this video.</summary>
        public bool HlsReady { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
