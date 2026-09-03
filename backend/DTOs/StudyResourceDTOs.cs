using System;
using System.Collections.Generic;

namespace elmanassa.DTOs
{
    public class StudyResourceDTO
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string? FileType { get; set; }
        public string Grade { get; set; } = string.Empty;
        public string Term { get; set; } = string.Empty;
        public Guid? SubjectId { get; set; }
        public string? SubjectName { get; set; }
        public int? CourseId { get; set; }
        public string? CourseName { get; set; }
        public long SizeBytes { get; set; }
        public bool Public { get; set; }
        public DateTime UploadedAt { get; set; }
    }

    public class PagedResult<T>
    {
        public List<T> items { get; set; } = new();
        public int total { get; set; }
        public int page { get; set; } = 1;
        public int perPage { get; set; } = 50;
    }
}
