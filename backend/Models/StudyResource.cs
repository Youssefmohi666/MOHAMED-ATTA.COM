using System;
using System.Collections.Generic;

namespace elmanassa.Models
{
    public class StudyResource
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public string ContentType { get; set; } = "application/octet-stream";
        public string? FileType { get; set; }
        public string Grade { get; set; } = string.Empty;
        public string Term { get; set; } = string.Empty;
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public int? CourseId { get; set; }
        public string? CourseName { get; set; }
        public Guid? TeacherId { get; set; }
        public long SizeBytes { get; set; }
        public string? ExtractedText { get; set; }
        public bool Public { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public Subject? Subject { get; set; }
        public Course? Course { get; set; }
        public User? Teacher { get; set; }
    }
}
