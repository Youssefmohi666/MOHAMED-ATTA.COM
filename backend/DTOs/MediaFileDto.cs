using System;

namespace elmanassa.DTOs
{
    public class MediaFileDto
    {
        public Guid Id { get; set; }
        public string OriginalFileName { get; set; }
        public string StoredFileName { get; set; }
        public string FileType { get; set; }
        public string CompressionType { get; set; }
        public long OriginalSize { get; set; }
        public long CompressedSize { get; set; }
        // FilePath is intentionally NOT exposed to clients — internal use only
        public double CompressionRatio => OriginalSize > 0 ? Math.Round((1 - (double)CompressedSize / OriginalSize) * 100, 2) : 0;
        public int? Duration { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public Guid? SubjectId { get; set; }
        public Guid? LectureId { get; set; }
        public DateTime CreatedAt { get; set; }
        /// <summary>True when HLS + AES-128 encrypted segments are ready for this video.</summary>
        public bool HlsReady { get; set; }
    }

    public class MediaUploadResultDto
    {
        public bool Success { get; set; }
        public MediaFileDto? MediaFile { get; set; }
        public string? Error { get; set; }
        public string? ErrorCode { get; set; }
    }

    public class CompressionSettingsDto
    {
        public string VideoCodec { get; set; } = "libx265";
        public int VideoCrf { get; set; } = 28;
        public int VideoMaxHeight { get; set; } = 720;
        public string VideoPreset { get; set; } = "medium";
        public bool CompressDocuments { get; set; } = true;
    }

    public class FileTypeStatsDto
    {
        public string FileType { get; set; }
        public int Count { get; set; }
        public long OriginalSize { get; set; }
        public long CompressedSize { get; set; }
        public double CompressionRatio { get; set; }
    }

    public class CompressionStatsDto
    {
        public int TotalFiles { get; set; }
        public long TotalOriginalSize { get; set; }
        public long TotalCompressedSize { get; set; }
        public double OverallCompressionRatio { get; set; }
        public List<FileTypeStatsDto> ByFileType { get; set; } = new();

        public string FormattedTotalOriginal => FormatBytes(TotalOriginalSize);
        public string FormattedTotalCompressed => FormatBytes(TotalCompressedSize);
        public long SpaceSaved => TotalOriginalSize - TotalCompressedSize;
        public string FormattedSpaceSaved => FormatBytes(SpaceSaved);

        private static string FormatBytes(long bytes)
        {
            string[] sizes = { "B", "KB", "MB", "GB", "TB" };
            double len = bytes;
            int order = 0;
            while (len >= 1024 && order < sizes.Length - 1)
            {
                order++;
                len = len / 1024;
            }
            return $"{len:0.##} {sizes[order]}";
        }
    }
}
