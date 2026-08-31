using elmanassa.DTOs;
using elmanassa.Models;
using elmanassa.ApplicationDbContext;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace elmanassa.Services
{
    public interface IPresentationService
    {
        Task<PresentationDetailDTO?> GeneratePresentationAsync(Guid userId, PresentationGenerateDTO dto);
        Task<PresentationDetailDTO?> GetPresentationAsync(Guid id, Guid userId);
        Task<List<PresentationListItemDTO>> GetUserPresentationsAsync(Guid userId);
        Task<bool> DeletePresentationAsync(Guid id, Guid userId);
        Task<string> GenerateHtmlAsync(Guid id, Guid userId);
        Task<string> GeneratePptxAsync(Guid id, Guid userId);
    }

    public class PresentationService : IPresentationService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<PresentationService> _logger;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        public PresentationService(
            AppDbContext context,
            ILogger<PresentationService> logger,
            IConfiguration config,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _logger = logger;
            _config = config;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<PresentationDetailDTO?> GeneratePresentationAsync(Guid userId, PresentationGenerateDTO dto)
        {
            try
            {
                var apiKey = _config["OpenAI:ApiKey"];
                var baseUrl = _config["OpenAI:BaseUrl"] ?? "https://api.openai.com/v1";
                var model = _config["OpenAI:Model"] ?? "gpt-4o-mini";

                if (string.IsNullOrEmpty(apiKey))
                    throw new InvalidOperationException("OpenCode Zen API key not configured");

                var styleGuide = dto.Style switch
                {
                    "professional" => "professional style with clear headings and bullet points",
                    "creative" => "creative style with visual layouts and innovative examples",
                    "educational" => "educational style with simple explanations and practical examples",
                    "minimalist" => "minimalist style with main headings and quick points",
                    _ => "professional style with clear headings and bullet points"
                };

                var lang = dto.Language == "en" ? "English" : "Arabic";

                var prompt = $@"Create a presentation about: {dto.Topic}

Number of slides: {dto.SlideCount}
Style: {styleGuide}
Language: {lang}

You MUST respond with ONLY a JSON array. Each object MUST have exactly these three string fields:
- title: slide title
- content: bullet point content  
- notes: speaker notes

No nested objects, no extra fields. Example format:
[{{""title"": ""Slide Title"", ""content"": ""• point 1\n• point 2\n• point 3"", ""notes"": ""Speaker notes here""}}]";

                var messages = new List<object>
                {
                    new { role = "system", content = "You are a presentation generator. Respond ONLY with a valid JSON array. No markdown, no code blocks, only raw JSON." },
                    new { role = "user", content = prompt }
                };

                var payload = JsonSerializer.Serialize(new
                {
                    model,
                    messages,
                    temperature = 0.7,
                    max_tokens = 4096
                });

                var httpClient = _httpClientFactory.CreateClient();
                var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

                var response = await httpClient.SendAsync(request);
                response.EnsureSuccessStatusCode();

                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var content = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString() ?? "[]";
                content = content.Trim();
                if (content.StartsWith("```json")) content = content[7..];
                if (content.StartsWith("```")) content = content[3..];
                if (content.EndsWith("```")) content = content[..^3];
                content = content.Trim();

                List<PresentationSlideDTO> slides;
                try
                {
                    slides = JsonSerializer.Deserialize<List<PresentationSlideDTO>>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                }
                catch
                {
                    slides = new List<PresentationSlideDTO>
                    {
                        new PresentationSlideDTO
                        {
                            Index = 0,
                            Title = dto.Topic,
                            Content = content,
                            Notes = ""
                        }
                    };
                }

                for (int i = 0; i < slides.Count; i++)
                    slides[i].Index = i;

                var presentation = new Presentation
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Title = dto.Topic,
                    Topic = dto.Topic,
                    SlideCount = slides.Count,
                    Style = dto.Style,
                    ContentJson = JsonSerializer.Serialize(slides),
                    Status = "completed",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Set<Presentation>().Add(presentation);
                await _context.SaveChangesAsync();

                return new PresentationDetailDTO
                {
                    Id = presentation.Id,
                    Title = presentation.Title,
                    Topic = presentation.Topic,
                    SlideCount = presentation.SlideCount,
                    Style = presentation.Style,
                    Status = presentation.Status,
                    CreatedAt = presentation.CreatedAt,
                    UpdatedAt = presentation.UpdatedAt,
                    Slides = slides
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating presentation");
                throw;
            }
        }

        public async Task<PresentationDetailDTO?> GetPresentationAsync(Guid id, Guid userId)
        {
            var presentation = await _context.Set<Presentation>()
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

            if (presentation == null) return null;

            List<PresentationSlideDTO> slides;
            try
            {
                slides = JsonSerializer.Deserialize<List<PresentationSlideDTO>>(presentation.ContentJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
            }
            catch
            {
                slides = new();
            }

            return new PresentationDetailDTO
            {
                Id = presentation.Id,
                Title = presentation.Title,
                Topic = presentation.Topic,
                SlideCount = presentation.SlideCount,
                Style = presentation.Style,
                Status = presentation.Status,
                CreatedAt = presentation.CreatedAt,
                UpdatedAt = presentation.UpdatedAt,
                Slides = slides
            };
        }

        public async Task<List<PresentationListItemDTO>> GetUserPresentationsAsync(Guid userId)
        {
            return await _context.Set<Presentation>()
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new PresentationListItemDTO
                {
                    Id = p.Id,
                    Title = p.Title,
                    Topic = p.Topic,
                    SlideCount = p.SlideCount,
                    Status = p.Status,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<bool> DeletePresentationAsync(Guid id, Guid userId)
        {
            var presentation = await _context.Set<Presentation>()
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

            if (presentation == null) return false;

            _context.Set<Presentation>().Remove(presentation);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<string> GenerateHtmlAsync(Guid id, Guid userId)
        {
            var dto = await GetPresentationAsync(id, userId);
            if (dto == null) throw new KeyNotFoundException("Presentation not found");

            var slidesHtml = string.Join("\n", dto.Slides.Select(s => $@"
        <div class=""slide"">
            <div class=""slide-header"">
                <span class=""slide-number"">{s.Index + 1}/{dto.Slides.Count}</span>
                <h2>{EscapeHtml(s.Title)}</h2>
            </div>
            <div class=""slide-content"">
                <p>{EscapeHtml(s.Content).Replace("\n", "<br>")}</p>
            </div>
            {(string.IsNullOrEmpty(s.Notes) ? "" : $@"<div class=""slide-notes"">
                <strong>ملاحظات:</strong> {EscapeHtml(s.Notes)}
            </div>")}
        </div>"));

            return $@"<!DOCTYPE html>
<html lang=""ar"" dir=""rtl"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{EscapeHtml(dto.Title)}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Segoe UI', Tahoma, sans-serif; background: #1a1a2e; color: #eee; }}
        .slide {{ max-width: 1000px; margin: 20px auto; padding: 40px; background: #16213e; border-radius: 12px; min-height: 500px; display: flex; flex-direction: column; page-break-after: always; }}
        .slide-header {{ border-bottom: 2px solid #0f3460; padding-bottom: 15px; margin-bottom: 25px; }}
        .slide-number {{ color: #e94560; font-size: 14px; }}
        .slide-header h2 {{ font-size: 28px; margin-top: 8px; color: #fff; }}
        .slide-content {{ flex: 1; font-size: 18px; line-height: 1.8; }}
        .slide-content p {{ margin-bottom: 10px; }}
        .slide-notes {{ margin-top: 20px; padding: 15px; background: #0f3460; border-radius: 8px; font-size: 14px; color: #a0a0b0; }}
        @media print {{ .slide {{ page-break-after: always; box-shadow: none; margin: 0; border-radius: 0; }} }}
    </style>
</head>
<body>
    <div class=""presentation"">{slidesHtml}
    </div>
</body>
</html>";
        }

        public async Task<string> GeneratePptxAsync(Guid id, Guid userId)
        {
            var html = await GenerateHtmlAsync(id, userId);
            return html;
        }

        private static string EscapeHtml(string text)
        {
            return System.Net.WebUtility.HtmlEncode(text ?? "");
        }
    }
}
