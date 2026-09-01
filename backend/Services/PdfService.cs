using System.Diagnostics;
using System.Text.RegularExpressions;

namespace elmanassa.Services
{
    public interface IPdfService
    {
        Task<int> GetPageCountAsync(string pdfPath);
        Task<byte[]> RenderPageAsync(string pdfPath, int page, int dpi);
        Task<byte[]?> CropPageAsync(string pdfPath, int page, int dpi, int x, int y, int width, int height);
    }

    /// <summary>
    /// Renders PDF pages to PNG and produces cropped "snips" using
    /// poppler-utils (pdfinfo / pdftoppm) and ImageMagick (identify / convert).
    /// All processes run without a shell and use ArgumentList to avoid injection.
    /// </summary>
    public class PdfService : IPdfService
    {
        private readonly ILogger<PdfService> _logger;

        public PdfService(ILogger<PdfService> logger)
        {
            _logger = logger;
        }

        public async Task<int> GetPageCountAsync(string pdfPath)
        {
            try
            {
                using var process = new Process { StartInfo = StartPoppler("pdfinfo", pdfPath) };
                process.Start();
                var output = await process.StandardOutput.ReadToEndAsync();
                await process.WaitForExitAsync();

                var match = Regex.Match(output, @"Pages:\s*(\d+)", RegexOptions.IgnoreCase);
                if (match.Success && int.TryParse(match.Groups[1].Value, out var pages))
                    return Math.Max(1, pages);

                _logger.LogWarning("pdfinfo returned no page count for {Path}", pdfPath);
                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "pdfinfo failed for {Path}", pdfPath);
                return 0;
            }
        }

        public async Task<byte[]> RenderPageAsync(string pdfPath, int page, int dpi)
        {
            var bytes = await RenderPageToPngAsync(pdfPath, page, dpi);
            return bytes ?? Array.Empty<byte>();
        }

        public async Task<byte[]?> CropPageAsync(string pdfPath, int page, int dpi, int x, int y, int width, int height)
        {
            var workDir = CreateTempDir();
            try
            {
                var baseName = Path.Combine(workDir, "q");
                var rendered = await RenderPageToPngAsync(pdfPath, page, dpi, baseName);
                if (rendered == null)
                {
                    _logger.LogWarning("pdftoppm failed while preparing snip for page {Page}", page);
                    return null;
                }

                var (imgW, imgH) = await GetImageDimensionsAsync(baseName + ".png");
                if (imgW <= 0 || imgH <= 0) return null;

                var cropX = Math.Clamp(x, 0, Math.Max(0, imgW - 1));
                var cropY = Math.Clamp(y, 0, Math.Max(0, imgH - 1));
                var cropW = Math.Min(width, imgW - cropX);
                var cropH = Math.Min(height, imgH - cropY);
                if (cropW < 1 || cropH < 1) return null;

                var outPng = Path.Combine(workDir, "snip.png");
                var convert = new ProcessStartInfo
                {
                    FileName = "convert",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };
                convert.ArgumentList.Add(baseName + ".png");
                convert.ArgumentList.Add("-crop");
                convert.ArgumentList.Add($"{cropW}x{cropH}+{cropX}+{cropY}");
                convert.ArgumentList.Add("+repage");
                convert.ArgumentList.Add("-background");
                convert.ArgumentList.Add("white");
                convert.ArgumentList.Add("-flatten");
                convert.ArgumentList.Add(outPng);

                using var proc = new Process { StartInfo = convert };
                proc.Start();
                var convertErr = await proc.StandardError.ReadToEndAsync();
                await proc.WaitForExitAsync();

                if (proc.ExitCode != 0 || !File.Exists(outPng))
                {
                    _logger.LogWarning("convert crop failed: {Err}", convertErr);
                    return null;
                }

                return await File.ReadAllBytesAsync(outPng);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to crop PDF page {Page}", page);
                return null;
            }
            finally
            {
                DeleteTempDir(workDir);
            }
        }

        /// <summary>
        /// Renders a single PDF page to PNG. When <paramref name="baseName"/> is null a
        /// unique temp file is used and the returned bytes are then loaded from it.
        /// </summary>
        private async Task<byte[]?> RenderPageToPngAsync(string pdfPath, int page, int dpi, string? baseName = null)
        {
            var workDir = CreateTempDir();
            try
            {
                baseName ??= Path.Combine(workDir, "page");
                var psi = new ProcessStartInfo
                {
                    FileName = "pdftoppm",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };
                psi.ArgumentList.Add("-f");
                psi.ArgumentList.Add(page.ToString());
                psi.ArgumentList.Add("-l");
                psi.ArgumentList.Add(page.ToString());
                psi.ArgumentList.Add("-r");
                psi.ArgumentList.Add(dpi.ToString());
                psi.ArgumentList.Add("-png");
                psi.ArgumentList.Add("-singlefile");
                psi.ArgumentList.Add(pdfPath);
                psi.ArgumentList.Add(baseName);

                using var proc = new Process { StartInfo = psi };
                proc.Start();
                var err = await proc.StandardError.ReadToEndAsync();
                await proc.WaitForExitAsync();

                var png = baseName + ".png";
                if (proc.ExitCode != 0 || !File.Exists(png))
                {
                    _logger.LogWarning("pdftoppm failed for {Path} page {Page}: {Err}", pdfPath, page, err);
                    return null;
                }

                return await File.ReadAllBytesAsync(png);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "pdftoppm render failed for page {Page}", page);
                return null;
            }
            finally
            {
                DeleteTempDir(workDir);
            }
        }

        private static ProcessStartInfo StartPoppler(string tool, string pdfPath)
        {
            var psi = new ProcessStartInfo
            {
                FileName = tool,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            psi.ArgumentList.Add(pdfPath);
            return psi;
        }

        private async Task<(int Width, int Height)> GetImageDimensionsAsync(string pngPath)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "identify",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };
                psi.ArgumentList.Add("-format");
                psi.ArgumentList.Add("%wx%h");
                psi.ArgumentList.Add(pngPath);

                using var proc = new Process { StartInfo = psi };
                proc.Start();
                var output = await proc.StandardOutput.ReadToEndAsync();
                await proc.WaitForExitAsync();

                var match = Regex.Match(output.Trim(), @"^(\d+)x(\d+)$");
                if (match.Success && int.TryParse(match.Groups[1].Value, out var w) && int.TryParse(match.Groups[2].Value, out var h))
                    return (w, h);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "identify failed for {Path}", pngPath);
            }
            return (0, 0);
        }

        private static string CreateTempDir()
        {
            var dir = Path.Combine(Path.GetTempPath(), "elmanassa-pdf-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(dir);
            return dir;
        }

        private void DeleteTempDir(string dir)
        {
            try
            {
                if (Directory.Exists(dir)) Directory.Delete(dir, true);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to clean temp dir {Dir}", dir);
            }
        }
    }
}