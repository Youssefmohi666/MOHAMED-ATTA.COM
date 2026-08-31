using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.IO.Compression;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

namespace elmanassa.Services
{
    public interface IMediaService
    {
        Task<MediaUploadResultDto> UploadAndCompressAsync(
            Stream fileStream,
            string fileName,
            long fileSize,
            string contentType,
            Guid? subjectId = null,
            Guid? lectureId = null,
            CompressionSettingsDto? settings = null);

        Task<MediaFileDto?> GetMediaFileAsync(Guid id);
        Task<List<MediaFileDto>> GetMediaFilesBySubjectAsync(Guid subjectId);
        Task<List<MediaFileDto>> GetMediaFilesByLectureAsync(Guid lectureId);
        Task<bool> DeleteMediaFileAsync(Guid id);
        Task<bool> DeleteFileFromDiskAsync(string filePath);
        Task<CompressionStatsDto> GetCompressionStatsAsync();
        /// <summary>Returns internal file metadata (including FilePath) for streaming/serving — never expose to clients.</summary>
        Task<MediaFile?> GetMediaFileInternalAsync(Guid id);
    }

    public class MediaService : IMediaService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<MediaService> _logger;
        private readonly IHlsService _hlsService;
        private readonly IServiceProvider _serviceProvider;
        private readonly string _uploadPath;
        private readonly string _ffmpegPath;
        private const long MaxTempFileSize = 5L * 1024 * 1024 * 1024; // 5GB temp file limit

        private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase)
            { ".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv" };

        private static readonly HashSet<string> DocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
            { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt" };

        private static readonly HashSet<char> InvalidPathChars = new(Path.GetInvalidPathChars().Union(Path.GetInvalidFileNameChars()));

        public MediaService(AppDbContext context, ILogger<MediaService> logger, IWebHostEnvironment env, IHlsService hlsService, IServiceProvider serviceProvider)
        {
            _context = context;
            _logger = logger;
            _hlsService = hlsService;
            _serviceProvider = serviceProvider;
            _uploadPath = Path.Combine(env.ContentRootPath, "uploads");

            _ffmpegPath = GetFfmpegPath();

            if (!Directory.Exists(_uploadPath))
                Directory.CreateDirectory(_uploadPath);
        }

        /// <summary>
        /// Validates file path to prevent directory traversal attacks
        /// </summary>
        private bool IsValidFilePath(string basePath, string filePath)
        {
            try
            {
                // Reject paths containing traversal attempts
                if (filePath.Contains("..") || filePath.Contains("~"))
                    return false;

                var fullBasePath = Path.GetFullPath(basePath);
                var fullFilePath = Path.GetFullPath(filePath);
                
                // Ensure the resolved path is still within the base path
                return fullFilePath.StartsWith(fullBasePath, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Sanitizes file names to prevent injection attacks and path traversal
        /// </summary>
        private string SanitizeFileName(string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName))
                return "file";

            // Remove path separators and traversal attempts
            var sanitized = fileName
                .Replace("\\", "")
                .Replace("/", "")
                .Replace("..", "");

            // Remove invalid path characters
            sanitized = new string(sanitized
                .Where(c => !InvalidPathChars.Contains(c))
                .ToArray());
            
            // Remove special characters, keep only alphanumeric, spaces, hyphens, and dots
            sanitized = Regex.Replace(sanitized, @"[^\w\s\-\.]", "");
            
            // Replace spaces with underscores
            sanitized = Regex.Replace(sanitized, @"\s+", "_");
            
            return string.IsNullOrWhiteSpace(sanitized) ? "file" : sanitized;
        }

        /// <summary>
        /// Validates that a file path doesn't contain traversal attempts
        /// </summary>
        private void ValidateFilePath(string? filePath, string paramName = "filePath")
        {
            if (filePath == null)
                throw new ArgumentException($"{paramName} cannot be null", paramName);
            
            if (filePath.Contains("..") || filePath.Contains("~"))
                throw new ArgumentException($"{paramName} contains invalid path traversal characters", paramName);
        }

        /// <summary>
        /// Validates that a file name doesn't contain traversal attempts or path separators
        /// </summary>
        private void ValidateFileName(string? fileName, string paramName = "fileName")
        {
            if (fileName == null)
                throw new ArgumentException($"{paramName} cannot be null", paramName);
            
            if (fileName.Contains("..") || fileName.Contains("~") || fileName.Contains("/") || fileName.Contains("\\"))
                throw new ArgumentException($"{paramName} contains invalid path characters", paramName);
        }

        private string GetFfmpegPath()
        {
            var possiblePaths = new[]
            {
                "ffmpeg",
                "ffmpeg.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "ffmpeg", "bin", "ffmpeg.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ffmpeg", "bin", "ffmpeg.exe"),
                "/usr/bin/ffmpeg",
                "/usr/local/bin/ffmpeg"
            };

            foreach (var path in possiblePaths)
            {
                try
                {
                    var startInfo = new ProcessStartInfo
                    {
                        FileName = path,
                        Arguments = "-version",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        CreateNoWindow = true
                    };

                    using var process = Process.Start(startInfo);
                    if (process != null)
                    {
                        process.WaitForExit(3000);
                        if (process.ExitCode == 0)
                            return path;
                    }
                }
                catch { }
            }

            return "ffmpeg";
        }

        public async Task<MediaUploadResultDto> UploadAndCompressAsync(
            Stream fileStream,
            string fileName,
            long fileSize,
            string contentType,
            Guid? subjectId = null,
            Guid? lectureId = null,
            CompressionSettingsDto? settings = null)
        {
            settings ??= new CompressionSettingsDto();
            var tempFilePath = Path.GetTempFileName();
            string finalFilePath = string.Empty;
            string compressionType = "none";
            long compressedSize = fileSize;

            try
            {
                // Validate file size
                if (fileSize > MaxTempFileSize)
                {
                    return new MediaUploadResultDto
                    {
                        Success = false,
                        Error = "حجم الملف يتجاوز الحد المسموح",
                        ErrorCode = "FILE_TOO_LARGE"
                    };
                }

                var extension = Path.GetExtension(fileName).ToLowerInvariant();
                var isGzipped = extension == ".gz";
                
                // For .gz files, check the inner extension to determine type
                var innerExtension = isGzipped 
                    ? Path.GetExtension(Path.GetFileNameWithoutExtension(fileName)).ToLowerInvariant()
                    : extension;
                
                var isVideo = VideoExtensions.Contains(innerExtension) && !isGzipped;
                var isDocument = DocumentExtensions.Contains(innerExtension);

                // Save to temp file
                await using (var tempStream = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true))
                {
                    await fileStream.CopyToAsync(tempStream);
                }

                if (isVideo)
                {
                    var result = await CompressVideoAsync(tempFilePath, extension, settings, subjectId);
                    finalFilePath = result.FilePath;
                    compressedSize = result.CompressedSize;
                    compressionType = "video_transcoded";

                    if (!result.Success)
                    {
                        _logger.LogWarning("Video compression failed, storing original: {Error}", result.Error);
                        finalFilePath = await SaveOriginalFileAsync(tempFilePath, fileName, "videos", subjectId);
                        compressedSize = new FileInfo(finalFilePath).Length;
                        compressionType = "none";
                    }
                }
                else if (isDocument && settings.CompressDocuments && !isGzipped)
                {
                    // Only compress if not already gzipped
                    var result = await CompressDocumentAsync(tempFilePath, fileName, subjectId);
                    finalFilePath = result.FilePath;
                    compressedSize = result.CompressedSize;
                    compressionType = result.Success ? "gzipped" : "none";

                    if (!result.Success)
                    {
                        _logger.LogWarning("Document compression failed, storing original: {Error}", result.Error);
                        finalFilePath = await SaveOriginalFileAsync(tempFilePath, fileName, "documents", subjectId);
                        compressedSize = new FileInfo(finalFilePath).Length;
                        compressionType = "none";
                    }
                }
                else if (isDocument && isGzipped)
                {
                    // Already gzipped by user - store as-is, mark as pre-gzipped
                    finalFilePath = await SaveOriginalFileAsync(tempFilePath, fileName, "documents", subjectId);
                    compressedSize = new FileInfo(finalFilePath).Length;
                    compressionType = "none"; // Don't decompress on retrieval
                }
                else
                {
                    var folder = isVideo ? "videos" : isDocument ? "documents" : "others";
                    finalFilePath = await SaveOriginalFileAsync(tempFilePath, fileName, folder, subjectId);
                    // Path is validated in SaveOriginalFileAsync
                    compressedSize = new FileInfo(finalFilePath).Length;
                }

                // Validate final path
                if (!IsValidFilePath(_uploadPath, finalFilePath))
                {
                    throw new InvalidOperationException("Invalid file path detected");
                }

                var mediaFile = new MediaFile
                {
                    OriginalFileName = SanitizeFileName(fileName),
                    StoredFileName = Path.GetFileName(finalFilePath),
                    FileType = GetFileType(innerExtension),
                    CompressionType = compressionType,
                    OriginalSize = fileSize,
                    CompressedSize = compressedSize,
                    FilePath = finalFilePath,
                    SubjectId = subjectId,
                    LectureId = lectureId,
                    CreatedAt = DateTime.UtcNow
                };

                if (isVideo)
                {
                    var videoInfo = await GetVideoInfoAsync(finalFilePath);
                    mediaFile.Duration = videoInfo.Duration;
                    mediaFile.Width = videoInfo.Width;
                    mediaFile.Height = videoInfo.Height;
                }

                _context.MediaFiles.Add(mediaFile);
                await _context.SaveChangesAsync();

                // ── Kick off HLS transcoding in the background ──────────────────
                // We don't await this — it runs async so the upload response is instant.
                // HlsReady is set to true once complete.
                if (isVideo)
                {
                    var hlsInputPath = finalFilePath;
                    var hlsMediaId = mediaFile.Id;
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            var hlsResult = await _hlsService.TranscodeToHlsAsync(hlsInputPath, hlsMediaId);
                            if (hlsResult.Success)
                            {
                                // Create a fresh scope for the background task
                                using var scope = _serviceProvider.CreateScope();
                                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                                var file = await db.MediaFiles.FindAsync(hlsMediaId);
                                if (file != null)
                                {
                                    file.HlsReady = true;
                                    await db.SaveChangesAsync();
                                    _logger.LogInformation("HLS ready for media {Id}", hlsMediaId);
                                }
                            }
                            else
                            {
                                _logger.LogWarning("HLS transcode failed for {Id}: {Err}", mediaFile.Id, hlsResult.Error);
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Background HLS transcode exception for {Id}", mediaFile.Id);
                        }
                    });
                }

                _logger.LogInformation("File uploaded successfully: {FileName} | Original: {Original}B | Compressed: {Compressed}B | Ratio: {Ratio}%",
                    fileName, fileSize, compressedSize,
                    Math.Round((1 - (double)compressedSize / fileSize) * 100, 2));

                return new MediaUploadResultDto
                {
                    Success = true,
                    MediaFile = MapToDto(mediaFile)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading and compressing file: {FileName}", fileName);
                return new MediaUploadResultDto
                {
                    Success = false,
                    Error = "فشل في رفع وضغط الملف",
                    ErrorCode = "UPLOAD_FAILED"
                };
            }
            finally
            {
                try
                {
                    if (File.Exists(tempFilePath))
                        File.Delete(tempFilePath);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete temp file: {TempPath}", tempFilePath);
                }
            }
        }

        private async Task<(bool Success, string FilePath, long CompressedSize, string? Error)> CompressVideoAsync(
            string inputPath, string extension, CompressionSettingsDto settings, Guid? subjectId = null)
        {
            var outputFileName = $"{Guid.NewGuid()}.mp4";
            var outputDir = subjectId.HasValue
                ? Path.Combine(_uploadPath, "videos", subjectId.Value.ToString())
                : Path.Combine(_uploadPath, "videos");
            Directory.CreateDirectory(outputDir);
            var outputPath = Path.Combine(outputDir, outputFileName);

            // Validate output path
            if (!IsValidFilePath(_uploadPath, outputPath))
                return (false, string.Empty, 0, "Invalid output path");

            var height = Math.Clamp(settings.VideoMaxHeight, 360, 2160);
            var crf = Math.Clamp(settings.VideoCrf, 18, 51);
            var preset = settings.VideoPreset switch
            {
                "ultrafast" or "superfast" or "veryfast" or "faster" or "fast" or "medium" or "slow" or "slower" or "veryslow" => settings.VideoPreset,
                _ => "medium"
            };
            var codec = settings.VideoCodec switch
            {
                "libx265" or "libx264" => settings.VideoCodec,
                _ => "libx265"
            };

            try
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = _ffmpegPath,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };

                startInfo.ArgumentList.Add("-i");
                startInfo.ArgumentList.Add(inputPath);
                startInfo.ArgumentList.Add("-vf");
                startInfo.ArgumentList.Add($"scale=-2:{height}");
                startInfo.ArgumentList.Add("-c:v");
                startInfo.ArgumentList.Add(codec);
                startInfo.ArgumentList.Add("-crf");
                startInfo.ArgumentList.Add(crf.ToString());
                startInfo.ArgumentList.Add("-preset");
                startInfo.ArgumentList.Add(preset);
                startInfo.ArgumentList.Add("-c:a");
                startInfo.ArgumentList.Add("aac");
                startInfo.ArgumentList.Add("-b:a");
                startInfo.ArgumentList.Add("128k");
                startInfo.ArgumentList.Add("-movflags");
                startInfo.ArgumentList.Add("+faststart");
                startInfo.ArgumentList.Add("-y");
                startInfo.ArgumentList.Add(outputPath);

                using var process = new Process { StartInfo = startInfo };
                process.Start();

                var errorOutput = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                if (process.ExitCode == 0 && File.Exists(outputPath))
                {
                    var compressedSize = new FileInfo(outputPath).Length;
                    var originalSize = new FileInfo(inputPath).Length;
                    var ratio = Math.Round((1 - (double)compressedSize / originalSize) * 100, 2);
                    
                    _logger.LogInformation("Video compressed: {Original}B -> {Compressed}B ({Ratio}% reduction)",
                        originalSize, compressedSize, ratio);
                    return (true, outputPath, compressedSize, null);
                }

                _logger.LogWarning("FFmpeg compression failed with exit code {ExitCode}: {Error}", process.ExitCode, errorOutput);
                
                // Clean up failed output
                try 
                { 
                    if (File.Exists(outputPath) && IsValidFilePath(_uploadPath, outputPath)) 
                        File.Delete(outputPath); 
                } 
                catch { }
                
                return (false, string.Empty, 0, errorOutput);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error running FFmpeg for video compression");
                try 
                { 
                    if (File.Exists(outputPath) && IsValidFilePath(_uploadPath, outputPath)) 
                        File.Delete(outputPath); 
                } 
                catch { }
                return (false, string.Empty, 0, ex.Message);
            }
        }

        private async Task<(bool Success, string FilePath, long CompressedSize, string? Error)> CompressDocumentAsync(string inputPath, string fileName, Guid? subjectId = null)
        {
            try
            {
                // Validate inputs using helper functions
                ValidateFilePath(inputPath, nameof(inputPath));
                ValidateFileName(fileName, nameof(fileName));

                // Validate input path
                if (!IsValidFilePath(_uploadPath, inputPath))
                    return (false, string.Empty, 0, "Invalid input path");

                // Get the actual extension (strip .gz if already present)
                var actualExt = Path.GetExtension(fileName);
                if (actualExt.Equals(".gz", StringComparison.OrdinalIgnoreCase))
                {
                    actualExt = Path.GetExtension(Path.GetFileNameWithoutExtension(fileName));
                }

                var gzFileName = $"{Guid.NewGuid()}{actualExt}.gz";
                var outputDir = subjectId.HasValue
                    ? Path.Combine(_uploadPath, "documents", subjectId.Value.ToString())
                    : Path.Combine(_uploadPath, "documents");
                Directory.CreateDirectory(outputDir);
                var outputPath = Path.Combine(outputDir, gzFileName);

                // Validate output path
                if (!IsValidFilePath(_uploadPath, outputPath))
                    return (false, string.Empty, 0, "Invalid output path");

                await Task.Run(() =>
                {
                    using var originalFile = new FileStream(inputPath, FileMode.Open, FileAccess.Read);
                    using var compressedFile = new FileStream(outputPath, FileMode.Create, FileAccess.Write);
                    using var gzipStream = new GZipStream(compressedFile, CompressionLevel.Optimal);
                    originalFile.CopyTo(gzipStream);
                });

                var compressedSize = new FileInfo(outputPath).Length;
                var originalSize = new FileInfo(inputPath).Length;
                var ratio = Math.Round((1 - (double)compressedSize / originalSize) * 100, 2);
                
                _logger.LogInformation("Document compressed: {Original}B -> {Compressed}B ({Ratio}% reduction)",
                    originalSize, compressedSize, ratio);

                return (true, outputPath, compressedSize, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error compressing document: {FileName}", fileName);
                return (false, string.Empty, 0, ex.Message);
            }
        }

        private async Task<string> SaveOriginalFileAsync(string sourcePath, string fileName, string subFolder, Guid? subjectId = null)
        {
            var outputDir = subjectId.HasValue
                ? Path.Combine(_uploadPath, subFolder, subjectId.Value.ToString())
                : Path.Combine(_uploadPath, subFolder);
            Directory.CreateDirectory(outputDir);

            var uniqueName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";
            var outputPath = Path.Combine(outputDir, uniqueName);

            // Validate output path
            if (!IsValidFilePath(_uploadPath, outputPath))
                throw new InvalidOperationException("Invalid output path");

            await Task.Run(() => File.Copy(sourcePath, outputPath, true));

            return outputPath;
        }

        private async Task<(int? Duration, int? Width, int? Height)> GetVideoInfoAsync(string filePath)
        {
            // Validate path first
            if (!IsValidFilePath(_uploadPath, filePath))
                return (null, null, null);

            if (!File.Exists(filePath)) 
                return (null, null, null);

            try
            {
                var ffprobePath = _ffmpegPath.Replace("ffmpeg", "ffprobe");
                if (ffprobePath == _ffmpegPath) ffprobePath = "ffprobe";

                var startInfo = new ProcessStartInfo
                {
                    FileName = ffprobePath,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };

                startInfo.ArgumentList.Add("-v");
                startInfo.ArgumentList.Add("quiet");
                startInfo.ArgumentList.Add("-print_format");
                startInfo.ArgumentList.Add("json");
                startInfo.ArgumentList.Add("-show_format");
                startInfo.ArgumentList.Add("-show_streams");
                startInfo.ArgumentList.Add(filePath);

                using var process = new Process { StartInfo = startInfo };
                process.Start();

                var output = await process.StandardOutput.ReadToEndAsync();
                await process.WaitForExitAsync();

                if (process.ExitCode == 0 && !string.IsNullOrEmpty(output))
                {
                    var durationMatch = Regex.Match(output, @"""duration"":\s*""([\d.]+)""");
                    var widthMatch = Regex.Match(output, @"""width"":\s*(\d+)");
                    var heightMatch = Regex.Match(output, @"""height"":\s*(\d+)");

                    int? duration = durationMatch.Success ? (int?)double.Parse(durationMatch.Groups[1].Value) : null;
                    int? width = widthMatch.Success ? int.Parse(widthMatch.Groups[1].Value) : null;
                    int? height = heightMatch.Success ? int.Parse(heightMatch.Groups[1].Value) : null;

                    return (duration, width, height);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error getting video info for: {FilePath}", filePath);
            }

            return (null, null, null);
        }

        private static string GetFileType(string extension)
        {
            if (VideoExtensions.Contains(extension)) return "video";
            if (DocumentExtensions.Contains(extension)) return "document";
            return "other";
        }

        private static MediaFileDto MapToDto(MediaFile file) => new()
                {
                    Id = file.Id,
                    OriginalFileName = file.OriginalFileName,
                    StoredFileName = file.StoredFileName,
                    FileType = file.FileType,
                    CompressionType = file.CompressionType,
                    OriginalSize = file.OriginalSize,
                    CompressedSize = file.CompressedSize,
                    // FilePath intentionally omitted — never expose server paths to clients
                    Duration = file.Duration,
                    Width = file.Width,
                    Height = file.Height,
                    SubjectId = file.SubjectId,
                    LectureId = file.LectureId,
                    CreatedAt = file.CreatedAt,
                    HlsReady = file.HlsReady
                };

        public async Task<MediaFileDto?> GetMediaFileAsync(Guid id)
        {
            var file = await _context.MediaFiles.FindAsync(id);
            return file == null ? null : MapToDto(file);
        }

        public async Task<MediaFile?> GetMediaFileInternalAsync(Guid id)
            => await _context.MediaFiles.FindAsync(id);

        public async Task<List<MediaFileDto>> GetMediaFilesBySubjectAsync(Guid subjectId)
        {
            return await _context.MediaFiles
                .Where(f => f.SubjectId == subjectId)
                .OrderByDescending(f => f.CreatedAt)
                .Select(f => MapToDto(f))
                .ToListAsync();
        }

        public async Task<List<MediaFileDto>> GetMediaFilesByLectureAsync(Guid lectureId)
        {
            return await _context.MediaFiles
                .Where(f => f.LectureId == lectureId)
                .OrderByDescending(f => f.CreatedAt)
                .Select(f => MapToDto(f))
                .ToListAsync();
        }

        public async Task<bool> DeleteMediaFileAsync(Guid id)
        {
            var file = await _context.MediaFiles.FindAsync(id);
            if (file == null) return false;

            try
            {
                // Validate main file path before deletion
                if (!IsValidFilePath(_uploadPath, file.FilePath))
                    throw new InvalidOperationException("Invalid file path");

                if (File.Exists(file.FilePath))
                    File.Delete(file.FilePath);

                // Validate thumbnail path before deletion
                if (!string.IsNullOrEmpty(file.ThumbnailPath))
                {
                    if (!IsValidFilePath(_uploadPath, file.ThumbnailPath))
                        throw new InvalidOperationException("Invalid thumbnail path");
                    
                    if (File.Exists(file.ThumbnailPath))
                        File.Delete(file.ThumbnailPath);
                }

                _context.MediaFiles.Remove(file);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Media file deleted: {Id} ({FileName})", id, file.OriginalFileName);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting media file: {Id}", id);
                return false;
            }
        }

        public Task<bool> DeleteFileFromDiskAsync(string filePath)
        {
            try
            {
                // Validate path before any file operation
                if (string.IsNullOrEmpty(filePath) || !IsValidFilePath(_uploadPath, filePath))
                    return Task.FromResult(false);

                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    return Task.FromResult(true);
                }
                return Task.FromResult(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file from disk: {FilePath}", filePath);
                return Task.FromResult(false);
            }
        }

        public async Task<CompressionStatsDto> GetCompressionStatsAsync()
        {
            try
            {
                var stats = await _context.MediaFiles
                    .GroupBy(f => f.FileType)
                    .Select(g => new
                    {
                        FileType = g.Key,
                        Count = g.Count(),
                        TotalOriginalSize = g.Sum(f => f.OriginalSize),
                        TotalCompressedSize = g.Sum(f => f.CompressedSize)
                    })
                    .ToListAsync();

                var totalOriginal = stats.Sum(s => s.TotalOriginalSize);
                var totalCompressed = stats.Sum(s => s.TotalCompressedSize);

                return new CompressionStatsDto
                {
                    TotalFiles = stats.Sum(s => s.Count),
                    TotalOriginalSize = totalOriginal,
                    TotalCompressedSize = totalCompressed,
                    OverallCompressionRatio = totalOriginal > 0 ? Math.Round((1 - (double)totalCompressed / totalOriginal) * 100, 2) : 0,
                    ByFileType = stats.Select(s => new FileTypeStatsDto
                    {
                        FileType = s.FileType,
                        Count = s.Count,
                        OriginalSize = s.TotalOriginalSize,
                        CompressedSize = s.TotalCompressedSize,
                        CompressionRatio = s.TotalOriginalSize > 0 ? Math.Round((1 - (double)s.TotalCompressedSize / s.TotalOriginalSize) * 100, 2) : 0
                    }).ToList()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating compression stats");
                return new CompressionStatsDto();
            }
        }
    }
}
