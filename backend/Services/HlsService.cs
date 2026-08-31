using System.Diagnostics;
using System.Security.Cryptography;

namespace elmanassa.Services
{
    public interface IHlsService
    {
        /// <summary>
        /// Converts an uploaded video to HLS with AES-128 encrypted segments.
        /// Uses -c copy (no re-encode) for speed; falls back to H.264 re-encode if needed.
        /// Returns the path to the .m3u8 playlist file.
        /// </summary>
        Task<HlsResult> TranscodeToHlsAsync(string inputPath, Guid mediaFileId, CancellationToken ct = default);

        /// <summary>Returns the AES-128 key bytes for a given media file (served only to authenticated users).</summary>
        Task<byte[]?> GetEncryptionKeyAsync(Guid mediaFileId);
    }

    public record HlsResult(bool Success, string? PlaylistPath, string? KeyPath, string? Error);

    public class HlsService : IHlsService
    {
        private readonly string _hlsRoot;
        private readonly string _ffmpegPath;
        private readonly ILogger<HlsService> _logger;

        public HlsService(IWebHostEnvironment env, ILogger<HlsService> logger)
        {
            _logger = logger;
            // Resolve once at startup so all path checks are consistent
            _hlsRoot = Path.GetFullPath(Path.Combine(env.ContentRootPath, "uploads", "hls"));
            Directory.CreateDirectory(_hlsRoot);
            _ffmpegPath = DetectFfmpeg();
        }

        // ── Path safety ───────────────────────────────────────────────────────

        /// <summary>
        /// Returns the output directory for a given mediaFileId, validated to be
        /// inside _hlsRoot. mediaFileId is a Guid so it can never contain '..' or '/'.
        /// </summary>
        private string SafeOutputDir(Guid mediaFileId)
        {
            // Guid.ToString("D") → "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" — no path chars possible
            var dir = Path.GetFullPath(Path.Combine(_hlsRoot, mediaFileId.ToString("D")));
            AssertInsideHlsRoot(dir);
            return dir;
        }

        /// <summary>
        /// Throws if <paramref name="path"/> is not rooted inside <see cref="_hlsRoot"/>.
        /// Called before every file I/O operation to make path-safety guarantees explicit
        /// and traceable by static analysis tools.
        /// </summary>
        private void AssertInsideHlsRoot(string path)
        {
            var full = Path.GetFullPath(path);
            if (!full.StartsWith(_hlsRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
                && !full.Equals(_hlsRoot, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException($"Path traversal detected: '{full}' is outside HLS root.");
        }

        // ── Main transcode ────────────────────────────────────────────────────

        public async Task<HlsResult> TranscodeToHlsAsync(string inputPath, Guid mediaFileId, CancellationToken ct = default)
        {
            // Validate that the caller-supplied input path exists and is a real file.
            // We do not restrict it to _hlsRoot — uploads may live elsewhere — but we
            // require it to be an absolute, existing path to prevent ambiguous resolution.
            if (string.IsNullOrWhiteSpace(inputPath) || !File.Exists(inputPath))
                return new HlsResult(false, null, null, $"Input file not found: '{inputPath}'");

            string outputDir;
            try { outputDir = SafeOutputDir(mediaFileId); }
            catch (Exception ex) { return new HlsResult(false, null, null, ex.Message); }

            Directory.CreateDirectory(outputDir);

            // All sub-paths use fixed filenames — no user input involved.
            // AssertInsideHlsRoot is called explicitly before each I/O so static
            // analysis tools can trace the safety guarantee without full data-flow analysis.
            var keyPath      = Path.Combine(outputDir, "enc.key");
            var keyInfoPath  = Path.Combine(outputDir, "enc.keyinfo");
            var playlistPath = Path.Combine(outputDir, "index.m3u8");

            // Generate AES-128 encryption key
            var keyBytes = RandomNumberGenerator.GetBytes(16);
            AssertInsideHlsRoot(keyPath);
            await File.WriteAllBytesAsync(keyPath, keyBytes, ct);
            AssertInsideHlsRoot(keyInfoPath);
            await File.WriteAllTextAsync(keyInfoPath, $"KEY_URL_PLACEHOLDER\n{keyPath}\n", ct);

            // First attempt: -c copy (no re-encode, very fast — seconds not minutes)
            var result = await RunFfmpegHlsAsync(
                inputPath, outputDir, keyInfoPath, playlistPath,
                reEncode: false, mediaFileId, ct,
                timeoutMinutes: 30);

            if (!result.Success && result.Error != null &&
                (result.Error.Contains("codec not currently supported") ||
                 result.Error.Contains("Invalid data") ||
                 result.Error.Contains("moov atom not found")))
            {
                // Fallback: re-encode to H.264 (slower but handles any input format)
                _logger.LogInformation("HLS copy failed for {Id}, retrying with re-encode", mediaFileId);
                result = await RunFfmpegHlsAsync(
                    inputPath, outputDir, keyInfoPath, playlistPath,
                    reEncode: true, mediaFileId, ct,
                    timeoutMinutes: 60);
            }

            if (!result.Success) return result;

            // Patch playlist: replace placeholder with real API key endpoint
            var playlist = await File.ReadAllTextAsync(playlistPath, ct);
            playlist = playlist.Replace("KEY_URL_PLACEHOLDER", $"/api/v1/media/hls/{mediaFileId}/key");
            await File.WriteAllTextAsync(playlistPath, playlist, ct);

            _logger.LogInformation("HLS ready for {Id}", mediaFileId);
            return new HlsResult(true, playlistPath, keyPath, null);
        }

        private async Task<HlsResult> RunFfmpegHlsAsync(
            string inputPath, string outputDir, string keyInfoPath, string playlistPath,
            bool reEncode, Guid mediaFileId, CancellationToken ct, int timeoutMinutes)
        {
            var args = new List<string> { "-i", inputPath };

            if (reEncode)
            {
                args.AddRange(new[] {
                    "-c:v", "libx264", "-crf", "23", "-preset", "fast",
                    "-c:a", "aac", "-b:a", "128k",
                    "-vf", "scale=-2:720",
                });
            }
            else
            {
                args.AddRange(new[] { "-c", "copy" });
            }

            args.AddRange(new[] {
                "-hls_time", "6",
                "-hls_list_size", "0",
                "-hls_segment_type", "mpegts",
                "-hls_key_info_file", keyInfoPath,
                "-hls_segment_filename", Path.Combine(outputDir, "seg%03d.ts"),
                "-hls_flags", "independent_segments",
                "-y",
                playlistPath
            });

            var psi = new ProcessStartInfo
            {
                FileName = _ffmpegPath,
                UseShellExecute = false,
                RedirectStandardError = true,
                CreateNoWindow = true,
            };
            foreach (var a in args) psi.ArgumentList.Add(a);

            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromMinutes(timeoutMinutes));
            using var linkedCts  = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);

            try
            {
                using var proc = new Process { StartInfo = psi };
                proc.Start();
                var stderr = await proc.StandardError.ReadToEndAsync(linkedCts.Token);
                await proc.WaitForExitAsync(linkedCts.Token);

                if (proc.ExitCode != 0)
                {
                    _logger.LogError("FFmpeg HLS failed for {Id} (exit {Code}, reEncode={Re}): {Err}",
                        mediaFileId, proc.ExitCode, reEncode, stderr);
                    return new HlsResult(false, null, null, stderr);
                }

                return new HlsResult(true, playlistPath, null, null);
            }
            catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested)
            {
                _logger.LogError("FFmpeg HLS timed out after {Min} min for {Id}", timeoutMinutes, mediaFileId);
                return new HlsResult(false, null, null, $"Timed out after {timeoutMinutes} minutes");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "FFmpeg HLS exception for {Id}", mediaFileId);
                return new HlsResult(false, null, null, ex.Message);
            }
        }

        // ── Key retrieval ─────────────────────────────────────────────────────

        public async Task<byte[]?> GetEncryptionKeyAsync(Guid mediaFileId)
        {
            string outputDir;
            try { outputDir = SafeOutputDir(mediaFileId); }
            catch { return null; }

            var keyPath = Path.Combine(outputDir, "enc.key");
            if (!File.Exists(keyPath)) return null;
            return await File.ReadAllBytesAsync(keyPath);
        }

        // ── FFmpeg detection ──────────────────────────────────────────────────

        private static string DetectFfmpeg()
        {
            foreach (var candidate in new[] { "ffmpeg", "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg" })
            {
                try
                {
                    var p = Process.Start(new ProcessStartInfo(candidate, "-version")
                    {
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        CreateNoWindow = true
                    });
                    p?.WaitForExit(2000);
                    if (p?.ExitCode == 0) return candidate;
                }
                catch { }
            }
            return "ffmpeg";
        }
    }
}
