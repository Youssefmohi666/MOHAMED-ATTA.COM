using elmanassa.DTOs;
using elmanassa.Models;
using elmanassa.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace elmanassa.Controllers
{
    [ApiController]
    [Route("api/v1/media")]
    [Authorize]
    public class MediaController : ControllerBase
    {
        private readonly IMediaService _mediaService;
        private readonly IHlsService _hlsService;
        private readonly ISignedUrlService _signedUrlService;
        private readonly IPdfService _pdfService;
        private readonly ILogger<MediaController> _logger;
        private readonly long _maxFileSize = 5L * 1024 * 1024 * 1024; // 5 GB
        private readonly string _uploadsRoot;
        private readonly string _hlsRoot;

        private const int PdfRenderDpi = 150;

        private static readonly Dictionary<string, string[]> AllowedContentTypes = new()
        {
            ["video"] = new[] { "video/mp4", "video/avi", "video/quicktime", "video/x-matroska", "video/webm" },
            ["document"] = new[] { "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "text/plain" },
            ["image"] = new[] { "image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/tiff" }
        };

        private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
            { ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff" };

        public MediaController(
            IMediaService mediaService,
            IHlsService hlsService,
            ISignedUrlService signedUrlService,
            IPdfService pdfService,
            ILogger<MediaController> logger,
            IWebHostEnvironment env)
        {
            _mediaService = mediaService;
            _hlsService = hlsService;
            _signedUrlService = signedUrlService;
            _pdfService = pdfService;
            _logger = logger;
            _uploadsRoot = Path.GetFullPath(Path.Combine(env.ContentRootPath, "uploads"));
            _hlsRoot = Path.GetFullPath(Path.Combine(env.ContentRootPath, "uploads", "hls"));
        }

        /// <summary>
        /// Resolves a path and verifies it stays within the allowed root.
        /// Returns null if the path escapes the root (path traversal attempt).
        /// </summary>
        private string? SafeResolvePath(string root, params string[] parts)
        {
            try
            {
                var combined = Path.GetFullPath(Path.Combine(new[] { root }.Concat(parts).ToArray()));
                return combined.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
                    || combined.Equals(root, StringComparison.OrdinalIgnoreCase)
                    ? combined : null;
            }
            catch { return null; }
        }

        // ── Signed token endpoint ───────────────────────────────────────────────

        /// <summary>Issues a short-lived signed token for streaming a specific file.</summary>
        [HttpGet("{id:guid}/token")]
        public IActionResult GetStreamToken(Guid id)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();
            var token = _signedUrlService.GenerateToken(id, userId, ttlSeconds: 300);
            return Ok(new { token });
        }

        // ── HLS endpoints ───────────────────────────────────────────────────────

        /// <summary>Returns the HLS m3u8 playlist. Validates signed token.</summary>
        [HttpGet("hls/{id:guid}/index.m3u8")]
        public async Task<IActionResult> GetHlsPlaylist(Guid id, [FromQuery] string token)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty || !_signedUrlService.ValidateToken(token, id, userId))
                return Unauthorized(new { error = "Invalid or expired token" });

            var file = await _mediaService.GetMediaFileInternalAsync(id);
            if (file == null) return NotFound();

            // Playlist is stored next to the segments
            var playlistPath = Path.Combine(
                Path.GetDirectoryName(file.FilePath) ?? "",
                "..", "hls", id.ToString(), "index.m3u8");
            playlistPath = Path.GetFullPath(playlistPath);

            if (!System.IO.File.Exists(playlistPath))
                return NotFound(new { error = "HLS not available for this file" });

            // Rewrite segment URLs to include the signed token
            var content = await System.IO.File.ReadAllTextAsync(playlistPath);
            content = content.Replace("seg", $"/api/v1/media/hls/{id}/seg");
            content = System.Text.RegularExpressions.Regex.Replace(
                content, @"(seg\d+\.ts)", $"$1?token={Uri.EscapeDataString(token)}");

            return Content(content, "application/vnd.apple.mpegurl");
        }

        /// <summary>Serves an individual HLS segment (.ts). Validates signed token.</summary>
        [HttpGet("hls/{id:guid}/{segment}")]
        public async Task<IActionResult> GetHlsSegment(Guid id, string segment, [FromQuery] string token)
        {
            // Sanitize segment name — only allow seg###.ts pattern
            if (!System.Text.RegularExpressions.Regex.IsMatch(segment, @"^seg\d{3}\.ts$"))
                return BadRequest();

            var userId = GetUserId();
            if (userId == Guid.Empty || !_signedUrlService.ValidateToken(token, id, userId))
                return Unauthorized();

            var segPath = Path.Combine(
                Path.GetDirectoryName(
                    (await _mediaService.GetMediaFileInternalAsync(id))?.FilePath ?? "") ?? "",
                "..", "hls", id.ToString(), segment);
            segPath = Path.GetFullPath(segPath);

            if (!System.IO.File.Exists(segPath)) return NotFound();

            Response.Headers.Append("Cache-Control", "private, max-age=300");
            return PhysicalFile(segPath, "video/mp2t");
        }

        /// <summary>Serves the AES-128 decryption key. Only authenticated enrolled users.</summary>
        [HttpGet("hls/{id:guid}/key")]
        public async Task<IActionResult> GetHlsKey(Guid id, [FromQuery] string token)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty || !_signedUrlService.ValidateToken(token, id, userId))
                return Unauthorized();

            var key = await _hlsService.GetEncryptionKeyAsync(id);
            if (key == null) return NotFound();

            Response.Headers.Append("Cache-Control", "private, no-store");
            return File(key, "application/octet-stream");
        }

        [HttpPost("upload")]
        [Authorize(Roles = "admin,teacher")]
        [RequestSizeLimit(5_368_709_120)]
        [RequestFormLimits(MultipartBodyLengthLimit = 5_368_709_120)]
        public async Task<ActionResult<ApiResponse<MediaUploadResultDto>>> UploadFile(
            IFormFile file,
            [FromQuery] Guid? subjectId = null,
            [FromQuery] Guid? lectureId = null)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new ApiResponse<object>("لم يتم تحديد ملف", "NO_FILE", false));
            }

            if (file.Length > _maxFileSize)
            {
                return BadRequest(new ApiResponse<object>("حجم الملف يتجاوز الحد المسموح (500MB)", "FILE_TOO_LARGE", false));
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var contentType = file.ContentType.ToLowerInvariant();

            var isAllowed = AllowedContentTypes.Values.SelectMany(x => x).Any(t =>
                contentType.Contains(t, StringComparison.OrdinalIgnoreCase) ||
                t.Contains(contentType, StringComparison.OrdinalIgnoreCase));

            if (!isAllowed && !extension.EndsWith(".gz"))
            {
                return BadRequest(new ApiResponse<object>("نوع الملف غير مدعوم", "UNSUPPORTED_FILE_TYPE", false));
            }

            try
            {
                await using var stream = file.OpenReadStream();
                var result = await _mediaService.UploadAndCompressAsync(
                    stream,
                    file.FileName,
                    file.Length,
                    contentType,
                    subjectId,
                    lectureId);

                if (result.Success && result.MediaFile != null)
                {
                    return Ok(new ApiResponse<MediaUploadResultDto>(result));
                }

                return BadRequest(new ApiResponse<object>(
                    result.Error ?? "فشل في رفع الملف",
                    result.ErrorCode ?? "UPLOAD_FAILED",
                    false));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file: {FileName}", file.FileName);
                return StatusCode(500, new ApiResponse<object>(
                    "حدث خطأ أثناء رفع الملف",
                    "SERVER_ERROR",
                    false));
            }
        }

        [HttpPost("upload/batch")]
        [Authorize(Roles = "admin,teacher")]
        [RequestSizeLimit(5_368_709_120)]
        public async Task<ActionResult<ApiResponse<List<MediaUploadResultDto>>>> UploadBatch(
            [FromForm] List<IFormFile> files,
            [FromQuery] Guid? subjectId = null,
            [FromQuery] Guid? lectureId = null)
        {
            if (files == null || files.Count == 0)
            {
                return BadRequest(new ApiResponse<object>("لم يتم تحديد ملفات", "NO_FILES", false));
            }

            var results = new List<MediaUploadResultDto>();
            var settings = new CompressionSettingsDto();

            foreach (var file in files)
            {
                if (file.Length > _maxFileSize)
                {
                    results.Add(new MediaUploadResultDto
                    {
                        Success = false,
                        Error = $"حجم الملف {file.FileName} يتجاوز الحد المسموح",
                        ErrorCode = "FILE_TOO_LARGE"
                    });
                    continue;
                }

                try
                {
                    await using var stream = file.OpenReadStream();
                    var result = await _mediaService.UploadAndCompressAsync(
                        stream,
                        file.FileName,
                        file.Length,
                        file.ContentType,
                        subjectId,
                        lectureId,
                        settings);
                    results.Add(result);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error uploading batch file: {FileName}", file.FileName);
                    results.Add(new MediaUploadResultDto
                    {
                        Success = false,
                        Error = $"فشل في رفع {file.FileName}",
                        ErrorCode = "UPLOAD_FAILED"
                    });
                }
            }

            return Ok(new ApiResponse<List<MediaUploadResultDto>>(results));
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<ApiResponse<MediaFileDto>>> GetMediaFile(Guid id)
        {
            var file = await _mediaService.GetMediaFileAsync(id);

            if (file == null)
            {
                return NotFound(new ApiResponse<object>("الملف غير موجود", "FILE_NOT_FOUND", false));
            }

            return Ok(new ApiResponse<MediaFileDto>(file));
        }

        [HttpGet("subject/{subjectId:guid}")]
        public async Task<ActionResult<ApiResponse<List<MediaFileDto>>>> GetMediaFilesBySubject(Guid subjectId)
        {
            var files = await _mediaService.GetMediaFilesBySubjectAsync(subjectId);
            return Ok(new ApiResponse<List<MediaFileDto>>(files));
        }

        [HttpGet("lecture/{lectureId:guid}")]
        public async Task<ActionResult<ApiResponse<List<MediaFileDto>>>> GetMediaFilesByLecture(Guid lectureId)
        {
            var files = await _mediaService.GetMediaFilesByLectureAsync(lectureId);
            return Ok(new ApiResponse<List<MediaFileDto>>(files));
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "admin,teacher")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteMediaFile(Guid id)
        {
            var deleted = await _mediaService.DeleteMediaFileAsync(id);

            if (!deleted)
            {
                return NotFound(new ApiResponse<object>("الملف غير موجود", "FILE_NOT_FOUND", false));
            }

            return Ok(new ApiResponse<object>(null, true) { Data = new { message = "تم حذف الملف بنجاح" } });
        }

        [HttpGet("download/{id:guid}")]
        [Authorize]
        public async Task<IActionResult> DownloadFile(Guid id)
        {
            var file = await _mediaService.GetMediaFileInternalAsync(id);

            if (file == null || !System.IO.File.Exists(file.FilePath))
                return NotFound(new ApiResponse<object>("الملف غير موجود", "FILE_NOT_FOUND", false));

            var downloadFileName = file.OriginalFileName.Replace(".gz", "");
            var ext = Path.GetExtension(downloadFileName).ToLowerInvariant();
            var contentType = GetMimeType(ext);

            // Decompress if: was compressed by us OR is already a .gz file
            var needsDecompression = (file.CompressionType == "gzipped") || 
                                     (file.FilePath.EndsWith(".gz", StringComparison.OrdinalIgnoreCase));

            if (needsDecompression)
            {
                Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{downloadFileName}\"");
                Response.ContentType = contentType;

                var gzStream = new FileStream(
                    file.FilePath, FileMode.Open, FileAccess.Read,
                    FileShare.Read, 65536, FileOptions.Asynchronous);
                var decompressStream = new System.IO.Compression.GZipStream(
                    gzStream, System.IO.Compression.CompressionMode.Decompress);

                return File(decompressStream, contentType, downloadFileName);
            }

            return PhysicalFile(file.FilePath, contentType, downloadFileName);
        }

        [HttpGet("stream/{id:guid}")]
        [Authorize]
        public async Task<IActionResult> StreamVideo(Guid id)
        {
            var file = await _mediaService.GetMediaFileInternalAsync(id);

            if (file == null || !System.IO.File.Exists(file.FilePath))
                return NotFound(new ApiResponse<object>("الملف غير موجود", "FILE_NOT_FOUND", false));

            if (file.FileType != "video")
                return BadRequest(new ApiResponse<object>("هذا الملف ليس فيديو", "NOT_A_VIDEO", false));

            var storedExt = Path.GetExtension(file.FilePath).ToLowerInvariant();
            var mimeType = storedExt switch
            {
                ".webm" => "video/webm",
                ".ogg" => "video/ogg",
                ".avi" => "video/x-msvideo",
                ".mov" => "video/quicktime",
                ".mkv" => "video/x-matroska",
                _ => "video/mp4"
            };

            const long chunkSize = 2 * 1024 * 1024;
            var fileInfo = new FileInfo(file.FilePath);
            var totalLength = fileInfo.Length;
            var rangeStart = 0L;
            var rangeEnd = Math.Min(chunkSize - 1, totalLength - 1);

            Response.Headers.Append("Accept-Ranges", "bytes");

            if (Request.Headers.TryGetValue("Range", out var rangeHeader))
            {
                var match = System.Text.RegularExpressions.Regex.Match(
                    rangeHeader.ToString(), @"bytes=(\d+)-(\d*)");

                if (match.Success)
                {
                    rangeStart = long.Parse(match.Groups[1].Value);
                    rangeEnd = match.Groups[2].Value.Length > 0
                        ? long.Parse(match.Groups[2].Value)
                        : Math.Min(rangeStart + chunkSize - 1, totalLength - 1);

                    rangeEnd = Math.Min(rangeEnd, totalLength - 1);
                }
            }

            var bytesToSend = rangeEnd - rangeStart + 1;

            Response.StatusCode = 206;
            Response.Headers.Append("Content-Range", $"bytes {rangeStart}-{rangeEnd}/{totalLength}");
            Response.Headers.Append("Content-Length", bytesToSend.ToString());
            Response.Headers.Append("Cache-Control", "no-cache");

            var stream = new FileStream(
                file.FilePath, FileMode.Open, FileAccess.Read,
                FileShare.Read, 65536, FileOptions.Asynchronous | FileOptions.SequentialScan);

            stream.Seek(rangeStart, SeekOrigin.Begin);

            return File(stream, mimeType, enableRangeProcessing: false);
        }

        [HttpGet("image/{id:guid}")]
        [Authorize]
        public async Task<IActionResult> GetImage(Guid id)
        {
            var file = await _mediaService.GetMediaFileInternalAsync(id);

            if (file == null || !System.IO.File.Exists(file.FilePath))
                return NotFound(new ApiResponse<object>("الملف غير موجود", "FILE_NOT_FOUND", false));

            var ext = Path.GetExtension(file.OriginalFileName.Replace(".gz", "")).ToLowerInvariant();
            if (!ImageExtensions.Contains(ext))
                return BadRequest(new ApiResponse<object>("هذا الملف ليس صورة", "NOT_AN_IMAGE", false));

            Response.Headers.Append("Cache-Control", "private, max-age=300");
            return PhysicalFile(file.FilePath, GetMimeType(ext));
        }

        // ── PDF question snipping ───────────────────────────────────────────────

        /// <summary>Returns PDF metadata (page count). Used by the teacher question editor.</summary>
        [HttpGet("pdf/{id:guid}/info")]
        [Authorize(Roles = "admin,teacher")]
        public async Task<ActionResult<ApiResponse<PdfInfoDTO>>> GetPdfInfo(Guid id)
        {
            try
            {
                var (pdfPath, needsCleanup) = await ResolvePdfAsync(id);
                if (pdfPath == null)
                    return NotFound(new ApiResponse<object>("الملف غير موجود", "FILE_NOT_FOUND", false));
                try
                {
                    var pageCount = await _pdfService.GetPageCountAsync(pdfPath);
                    if (pageCount <= 0)
                        return BadRequest(new ApiResponse<object>("تعذر قراءة ملف PDF", "INVALID_PDF", false));
                    return Ok(new ApiResponse<PdfInfoDTO>(new PdfInfoDTO { PageCount = pageCount }));
                }
                finally
                {
                    if (needsCleanup) TryDeleteTempFile(pdfPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading PDF info for {Id}", id);
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء قراءة الملف", "SERVER_ERROR", false));
            }
        }

        /// <summary>Renders a single PDF page to PNG (150 DPI). Coordinates from this
        /// response map 1:1 to the snip endpoint.</summary>
        [HttpGet("pdf/{id:guid}/page/{page:int}")]
        [Authorize(Roles = "admin,teacher")]
        public async Task<IActionResult> GetPdfPage(Guid id, int page)
        {
            try
            {
                if (page < 1)
                    return BadRequest(new ApiResponse<object>("رقم الصفحة غير صالح", "INVALID_PAGE", false));

                var (pdfPath, needsCleanup) = await ResolvePdfAsync(id);
                if (pdfPath == null)
                    return NotFound(new ApiResponse<object>("الملف غير موجود", "FILE_NOT_FOUND", false));
                try
                {
                    var bytes = await _pdfService.RenderPageAsync(pdfPath, page, PdfRenderDpi);
                    if (bytes.Length == 0)
                        return NotFound(new ApiResponse<object>("تعذر عرض هذه الصفحة", "RENDER_FAILED", false));
                    Response.Headers.Append("Cache-Control", "private, max-age=300");
                    return File(bytes, "image/png");
                }
                finally
                {
                    if (needsCleanup) TryDeleteTempFile(pdfPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rendering PDF page {Page} for {Id}", page, id);
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء عرض الصفحة", "SERVER_ERROR", false));
            }
        }

        /// <summary>Crops a rectangular region from a PDF page and stores it as a new
        /// image MediaFile for use in questions (imageUrl).</summary>
        [HttpPost("pdf/{id:guid}/snip")]
        [Authorize(Roles = "admin,teacher")]
        public async Task<ActionResult<ApiResponse<PdfSnipResultDTO>>> SnipPdf(Guid id, [FromBody] PdfSnipDTO model)
        {
            try
            {
                if (model.Page < 1)
                    return BadRequest(new ApiResponse<object>("رقم الصفحة غير صالح", "INVALID_PAGE", false));
                if (model.Width < 10 || model.Height < 10)
                    return BadRequest(new ApiResponse<object>("منطقة التحديد صغيرة جداً", "INVALID_REGION", false));
                if (model.X < 0 || model.Y < 0)
                    return BadRequest(new ApiResponse<object>("إحداثيات التحديد غير صالحة", "INVALID_REGION", false));

                var (pdfPath, needsCleanup) = await ResolvePdfAsync(id);
                if (pdfPath == null)
                    return NotFound(new ApiResponse<object>("الملف غير موجود", "FILE_NOT_FOUND", false));
                try
                {
                    var bytes = await _pdfService.CropPageAsync(pdfPath, model.Page, PdfRenderDpi,
                        model.X, model.Y, model.Width, model.Height);
                    if (bytes == null || bytes.Length == 0)
                        return BadRequest(new ApiResponse<object>(
                            "تعذر قص هذه المنطقة. تأكد من أن المنطقة داخل حدود الصفحة", "CROP_FAILED", false));

                    var mediaFile = await _mediaService.SaveImageAsync(bytes, "question-snip");
                    if (mediaFile == null)
                        return StatusCode(500, new ApiResponse<object>("فشل حفظ الصورة", "SAVE_FAILED", false));

                    return Ok(new ApiResponse<PdfSnipResultDTO>(new PdfSnipResultDTO
                    {
                        MediaFileId = mediaFile.Id.ToString(),
                        ImageUrl = $"/api/v1/media/image/{mediaFile.Id}"
                    }));
                }
                finally
                {
                    if (needsCleanup) TryDeleteTempFile(pdfPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error snipping PDF {Id}", id);
                return StatusCode(500, new ApiResponse<object>("حدث خطأ أثناء القص", "SERVER_ERROR", false));
            }
        }

        [HttpGet("view/{id:guid}")]
        [Authorize]
        public async Task<IActionResult> ViewDocument(Guid id)
        {
            var file = await _mediaService.GetMediaFileInternalAsync(id);

            if (file == null || !System.IO.File.Exists(file.FilePath))
                return NotFound(new ApiResponse<object>("الملف غير موجود", "FILE_NOT_FOUND", false));

            var originalName = file.OriginalFileName;
            var ext = Path.GetExtension(originalName.Replace(".gz", "")).ToLowerInvariant();

            // Images may be uploaded directly and are stored uncompressed — serve them inline.
            if (ImageExtensions.Contains(ext))
            {
                var safeImgName = System.Text.RegularExpressions.Regex.Replace(originalName, @"[^\x20-\x7E.\-]", "_");
                Response.Headers.Append("Content-Disposition", $"inline; filename=\"{safeImgName}\"");
                return File(new FileStream(file.FilePath, FileMode.Open, FileAccess.Read, FileShare.Read, 65536, FileOptions.Asynchronous),
                    GetMimeType(ext));
            }

            if (file.FileType != "document")
                return BadRequest(new ApiResponse<object>("هذا الملف ليس مستنداً", "NOT_A_DOCUMENT", false));

            var contentType = GetMimeType(ext);

            // Decompress if: was compressed by us OR is already a .gz file
            var needsDecompression = (file.CompressionType == "gzipped") || 
                                     (file.FilePath.EndsWith(".gz", StringComparison.OrdinalIgnoreCase));

            if (needsDecompression)
            {
                var safeName1 = System.Text.RegularExpressions.Regex.Replace(originalName.Replace(".gz", ""), @"[^\x20-\x7E.\-]", "_");
                Response.Headers.Append("Content-Disposition", $"inline; filename=\"{safeName1}\"");
                Response.ContentType = contentType;

                var gzStream = new FileStream(
                    file.FilePath, FileMode.Open, FileAccess.Read,
                    FileShare.Read, 65536, FileOptions.Asynchronous);
                var decompressStream = new System.IO.Compression.GZipStream(
                    gzStream, System.IO.Compression.CompressionMode.Decompress);

                return File(decompressStream, contentType);
            }

            var safeName2 = System.Text.RegularExpressions.Regex.Replace(originalName, @"[^\x20-\x7E.\-]", "_");
            Response.Headers.Append("Content-Disposition", $"inline; filename=\"{safeName2}\"");
            var fileStream = new FileStream(
                file.FilePath, FileMode.Open, FileAccess.Read,
                FileShare.Read, 65536, FileOptions.Asynchronous);

            return File(fileStream, contentType);
        }

        [HttpGet("stats")]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<ApiResponse<CompressionStatsDto>>> GetCompressionStats()
        {
            try
            {
                var stats = await _mediaService.GetCompressionStatsAsync();
                return Ok(new ApiResponse<CompressionStatsDto>(stats));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving compression stats");
                return StatusCode(500, new ApiResponse<object>(
                    "فشل في استرجاع إحصائيات الضغط",
                    "STATS_ERROR",
                    false));
            }
        }

        // ── Helper Methods ──────────────────────────────────────────────────────

        private Guid GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? User.FindFirst("sub")?.Value
                     ?? User.FindFirst("id")?.Value;
            return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
        }

        private string GetMimeType(string ext)
        {
            return ext switch
            {
                ".mp4" => "video/mp4",
                ".webm" => "video/webm",
                ".avi" => "video/x-msvideo",
                ".mov" => "video/quicktime",
                ".mkv" => "video/x-matroska",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".webp" => "image/webp",
                ".gif" => "image/gif",
                ".bmp" => "image/bmp",
                ".tif" or ".tiff" => "image/tiff",
                ".pdf" => "application/pdf",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".xls" => "application/vnd.ms-excel",
                ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".ppt" => "application/vnd.ms-powerpoint",
                ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                ".txt" => "text/plain; charset=utf-8",
                _ => "application/octet-stream"
            };
        }

        /// <summary>Returns the on-disk path of a PDF (decompressing .gz storage when
        /// needed). When it returns a temp file that must be deleted, sets
        /// needsCleanup to true so the caller can remove it.</summary>
        private async Task<(string? Path, bool NeedsCleanup)> ResolvePdfAsync(Guid id)
        {
            var file = await _mediaService.GetMediaFileInternalAsync(id);
            if (file == null || !System.IO.File.Exists(file.FilePath))
                return (null, false);

            var isGz = file.CompressionType == "gzipped"
                       || file.FilePath.EndsWith(".gz", StringComparison.OrdinalIgnoreCase);
            if (!isGz)
                return (file.FilePath, false);

            var tmp = Path.Combine(Path.GetTempPath(), $"elmanassa-pdf-{Guid.NewGuid():N}.pdf");
            await using (var inStream = new FileStream(file.FilePath, FileMode.Open, FileAccess.Read,
                FileShare.Read, 65536, FileOptions.Asynchronous))
            await using (var gz = new System.IO.Compression.GZipStream(inStream, System.IO.Compression.CompressionMode.Decompress))
            await using (var outStream = new FileStream(tmp, FileMode.Create, FileAccess.Write,
                FileShare.None, 65536, FileOptions.Asynchronous))
            {
                await gz.CopyToAsync(outStream);
            }
            return (tmp, true);
        }

        private static void TryDeleteTempFile(string path)
        {
            try
            {
                if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
            }
            catch
            {
                // best-effort cleanup
            }
        }

        private IActionResult HandleRangeRequest(FileStream fileStream, FileInfo fileInfo, string rangeHeader)
        {
            const long chunkSize = 2 * 1024 * 1024; // 2MB chunks
            var totalLength = fileInfo.Length;
            var rangeStart = 0L;
            var rangeEnd = Math.Min(chunkSize - 1, totalLength - 1);

            var match = System.Text.RegularExpressions.Regex.Match(rangeHeader, @"bytes=(\d+)-(\d*)");
            if (match.Success)
            {
                rangeStart = long.Parse(match.Groups[1].Value);
                rangeEnd = match.Groups[2].Value.Length > 0
                    ? long.Parse(match.Groups[2].Value)
                    : Math.Min(rangeStart + chunkSize - 1, totalLength - 1);
                rangeEnd = Math.Min(rangeEnd, totalLength - 1);
            }

            var bytesToSend = rangeEnd - rangeStart + 1;
            Response.StatusCode = 206;
            Response.Headers.Append("Content-Range", $"bytes {rangeStart}-{rangeEnd}/{totalLength}");
            Response.Headers.Append("Content-Length", bytesToSend.ToString());
            Response.Headers.Append("Accept-Ranges", "bytes");
            Response.Headers.Append("Cache-Control", "no-cache");

            fileStream.Seek(rangeStart, SeekOrigin.Begin);
            return File(fileStream, "video/mp4", enableRangeProcessing: false);
        }

        private async Task<IActionResult> HandleCompressedDocument(string filePath, string originalFileName, bool download = false)
        {
            var displayName = originalFileName.Replace(".gz", "");
            var ext = Path.GetExtension(displayName).ToLowerInvariant();
            var contentType = GetMimeType(ext);

            var disposition = download ? "attachment" : "inline";
            Response.Headers.Append("Content-Disposition", $"{disposition}; filename=\"{displayName}\"");
            Response.ContentType = contentType;

            var gzStream = System.IO.File.OpenRead(filePath);
            var decompressStream = new System.IO.Compression.GZipStream(
                gzStream, System.IO.Compression.CompressionMode.Decompress);

            return File(decompressStream, contentType);
        }
    }
}
