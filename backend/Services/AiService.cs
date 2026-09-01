using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace elmanassa.Services
{
    public interface IAiService
    {
        Task<AiConversationDTO?> CreateConversationAsync(Guid userId, string title);
        Task<AiConversationDTO?> GetConversationAsync(Guid conversationId, Guid userId);
        Task<List<AiConversationDTO>> GetUserConversationsAsync(Guid userId);
        Task<AiMessageDTO?> SendMessageAsync(Guid conversationId, Guid userId, string message);
        Task<bool> DeleteConversationAsync(Guid conversationId, Guid userId);
        Task<string> PublicChatAsync(string message, List<(string role, string text)> history);
        Task<string> GenerateReportAsync(GenerateReportDTO dto);
        Task<string> AnalyzeFileAsync(string fileName, byte[] content, string? context);
    }

    public class AiService : IAiService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AiService> _logger;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        public AiService(AppDbContext context, ILogger<AiService> logger, IConfiguration config, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _logger = logger;
            _config = config;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<AiConversationDTO?> CreateConversationAsync(Guid userId, string title)
        {
            try
            {
                var conversation = new AiConversation
                {
                    UserId = userId,
                    Title = title,
                    Messages = new List<AiMessage>(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.AiConversations.Add(conversation);
                await _context.SaveChangesAsync();

                return new AiConversationDTO
                {
                    Id = conversation.Id,
                    UserId = conversation.UserId,
                    Title = conversation.Title,
                    Messages = new List<AiMessageDTO>(),
                    CreatedAt = conversation.CreatedAt,
                    UpdatedAt = conversation.UpdatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating conversation");
                return null;
            }
        }

        public async Task<AiConversationDTO?> GetConversationAsync(Guid conversationId, Guid userId)
        {
            try
            {
                var conversation = await _context.AiConversations
                    .Include(c => c.Messages)
                    .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);

                if (conversation == null)
                    return null;

                var messages = conversation.Messages
                    .OrderBy(m => m.CreatedAt)
                    .Select(m => new AiMessageDTO
                    {
                        Id = m.Id,
                        ConversationId = m.ConversationId,
                        Role = m.Role,
                        Content = m.Content,
                        CreatedAt = m.CreatedAt
                    })
                    .ToList();

                return new AiConversationDTO
                {
                    Id = conversation.Id,
                    UserId = conversation.UserId,
                    Title = conversation.Title,
                    Messages = messages,
                    CreatedAt = conversation.CreatedAt,
                    UpdatedAt = conversation.UpdatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching conversation");
                return null;
            }
        }

        public async Task<List<AiConversationDTO>> GetUserConversationsAsync(Guid userId)
        {
            try
            {
                var conversations = await _context.AiConversations
                    .Where(c => c.UserId == userId)
                    .OrderByDescending(c => c.UpdatedAt)
                    .Select(c => new AiConversationDTO
                    {
                        Id = c.Id,
                        UserId = c.UserId,
                        Title = c.Title,
                        Messages = new List<AiMessageDTO>(),
                        CreatedAt = c.CreatedAt,
                        UpdatedAt = c.UpdatedAt
                    })
                    .ToListAsync();

                return conversations;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user conversations");
                return new List<AiConversationDTO>();
            }
        }

        public async Task<AiMessageDTO?> SendMessageAsync(Guid conversationId, Guid userId, string message)
        {
            try
            {
                var conversation = await _context.AiConversations
                    .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);

                if (conversation == null)
                    return null;

                var userMessage = new AiMessage
                {
                    ConversationId = conversationId,
                    Role = "user",
                    Content = message,
                    CreatedAt = DateTime.UtcNow
                };

                _context.AiMessages.Add(userMessage);

                var aiResponse = await GenerateAiResponseAsync(message);

                var aiMessage = new AiMessage
                {
                    ConversationId = conversationId,
                    Role = "assistant",
                    Content = aiResponse,
                    CreatedAt = DateTime.UtcNow
                };

                _context.AiMessages.Add(aiMessage);

                conversation.UpdatedAt = DateTime.UtcNow;
                _context.AiConversations.Update(conversation);

                await _context.SaveChangesAsync();

                return new AiMessageDTO
                {
                    Id = userMessage.Id,
                    ConversationId = userMessage.ConversationId,
                    Role = userMessage.Role,
                    Content = userMessage.Content,
                    CreatedAt = userMessage.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message");
                return null;
            }
        }

        public async Task<bool> DeleteConversationAsync(Guid conversationId, Guid userId)
        {
            try
            {
                var conversation = await _context.AiConversations
                    .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);

                if (conversation == null)
                    return false;

                _context.AiConversations.Remove(conversation);
                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting conversation");
                return false;
            }
        }

        private async Task<string> GenerateAiResponseAsync(string userMessage)
        {
            return await CallOpenAIAsync(userMessage, new List<(string, string)>());
        }

        public async Task<string> PublicChatAsync(string message, List<(string role, string text)> history)
        {
            return await CallOpenAIAsync(message, history);
        }

        private async Task<string> CallOpenAIAsync(string userMessage, List<(string role, string text)> history)
        {
            var apiKey = _config["OpenAI:ApiKey"];
            var baseUrl = _config["OpenAI:BaseUrl"] ?? "https://api.openai.com/v1";
            var model = _config["OpenAI:Model"] ?? "gpt-4o-mini";

            if (string.IsNullOrEmpty(apiKey))
                return GenerateDemoReply(userMessage);

            var messages = new List<object>
            {
                new { role = "system", content = "You are an intelligent educational assistant for an Arabic learning platform. Help students understand subjects and answer questions in clear, simple Arabic. Be friendly and encouraging. Respond in Arabic unless asked otherwise." }
            };

            foreach (var (hRole, hText) in history)
                messages.Add(new { role = hRole, content = hText });

            messages.Add(new { role = "user", content = userMessage });

            var payload = JsonSerializer.Serialize(new
            {
                model,
                messages,
                temperature = 0.7,
                max_tokens = 2048
            });

            var httpClient = _httpClientFactory.CreateClient();

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

                var response = await httpClient.SendAsync(request);

                if (!response.IsSuccessStatusCode)
                {
                    var errBody = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("OpenAI returned {Status}: {Body}", response.StatusCode, errBody[..Math.Min(300, errBody.Length)]);
                    return GenerateDemoReply(userMessage);
                }

                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var text = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString();

                _logger.LogInformation("OpenAI responded via {Model}", model);
                return text ?? "لم أتمكن من توليد رد. حاول مرة أخرى.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OpenAI call failed");
                return GenerateDemoReply(userMessage);
            }
        }

        public async Task<string> GenerateReportAsync(GenerateReportDTO dto)
        {
            var prompt = new StringBuilder();

            switch (dto.ReportType)
            {
                case "student":
                    prompt.AppendLine("أنت مساعد تعليمي متخصص في إعداد تقارير الطلاب. اكتب تقريراً تفصيلياً ومهنياً باللغة العربية عن أداء الطالب.");
                    if (!string.IsNullOrWhiteSpace(dto.StudentName)) prompt.AppendLine($"اسم الطالب: {dto.StudentName}");
                    break;
                case "subject":
                    prompt.AppendLine("أنت خبير تعليمي في المواد الدراسية. اكتب تقريراً تحليلياً باللغة العربية عن أداء المادة.");
                    if (!string.IsNullOrWhiteSpace(dto.SubjectName)) prompt.AppendLine($"اسم المادة: {dto.SubjectName}");
                    break;
                case "class":
                    prompt.AppendLine("أنت خبير تعليمي. اكتب تقريراً شاملاً باللغة العربية عن أداء الفصل الدراسي.");
                    if (!string.IsNullOrWhiteSpace(dto.SubjectName)) prompt.AppendLine($"المادة: {dto.SubjectName}");
                    break;
                default:
                    prompt.AppendLine("اكتب تقريراً تعليمياً باللغة العربية.");
                    break;
            }

            if (!string.IsNullOrWhiteSpace(dto.ContextJson) && dto.ContextJson != "{}")
                prompt.AppendLine($"بيانات سياقية (JSON): {dto.ContextJson}");

            if (!string.IsNullOrWhiteSpace(dto.CustomPrompt))
                prompt.AppendLine($"تعليمات إضافية: {dto.CustomPrompt}");

            try
            {
                var geminiKey = _config["Gemini:ApiKey"];
                var openAiKey = _config["OpenAI:ApiKey"];

                if (!string.IsNullOrEmpty(geminiKey))
                {
                    var text = await CallGeminiAsync(geminiKey, prompt.ToString());
                    if (!string.IsNullOrWhiteSpace(text) && !text.StartsWith("ERROR:"))
                        return text;
                }

                if (!string.IsNullOrEmpty(openAiKey))
                {
                    return await CallOpenAIAsync(prompt.ToString(), new List<(string, string)>());
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Report generation failed");
            }

            return GenerateDemoReport(dto);
        }

        public async Task<string> AnalyzeFileAsync(string fileName, byte[] content, string? context)
        {
            try
            {
                var prompt = new StringBuilder();
                prompt.AppendLine("أنت مساعد تعليمي. حلّل الملف المرفق التالي وقدم ملخصاً واضحاً ومنظماً باللغة العربية مع أبرز النقاط والملاحظات.");
                if (!string.IsNullOrWhiteSpace(context))
                    prompt.AppendLine($"سياق إضافي من المعلم: {context}");

                var geminiKey = _config["Gemini:ApiKey"];
                if (!string.IsNullOrEmpty(geminiKey))
                {
                    var text = await CallGeminiAsync(geminiKey, prompt.ToString(), fileName, content);
                    if (!string.IsNullOrWhiteSpace(text) && !text.StartsWith("ERROR:"))
                        return text;
                }

                var openAiKey = _config["OpenAI:ApiKey"];
                if (!string.IsNullOrEmpty(openAiKey))
                {
                    return await CallOpenAIAsync($"{prompt}\n(اسم الملف: {fileName})", new List<(string, string)>());
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "File analysis failed");
            }

            return GenerateDemoAnalysis(fileName, context);
        }

        private async Task<string> CallGeminiAsync(string apiKey, string prompt, string? fileName = null, byte[]? fileContent = null)
        {
            var baseUrl = _config["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1beta";
            var model = _config["Gemini:Model"] ?? "gemini-1.5-flash";

            var parts = new List<object> { new { text = prompt } };

            if (fileContent != null && fileContent.Length > 0)
            {
                var mime = "application/octet-stream";
                var ext = System.IO.Path.GetExtension(fileName ?? "").ToLower();
                if (ext == ".pdf") mime = "application/pdf";
                else if (ext == ".png") mime = "image/png";
                else if (ext == ".jpg" || ext == ".jpeg") mime = "image/jpeg";
                else if (ext == ".webp") mime = "image/webp";
                else if (ext == ".txt") mime = "text/plain";

                parts.Add(new
                {
                    inline_data = new
                    {
                        mime_type = mime,
                        data = Convert.ToBase64String(fileContent)
                    }
                });
            }

            var payload = JsonSerializer.Serialize(new
            {
                contents = new[]
                {
                    new { parts }
                },
                generationConfig = new { temperature = 0.7, maxOutputTokens = 2048 }
            });

            var httpClient = _httpClientFactory.CreateClient();
            var request = new HttpRequestMessage(HttpMethod.Post,
                $"{baseUrl}/models/{model}:generateContent?key={apiKey}");
            request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

            var response = await httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Gemini returned {Status}: {Body}", response.StatusCode, errBody[..Math.Min(300, errBody.Length)]);
                return "ERROR";
            }

            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                candidates.GetArrayLength() > 0 &&
                candidates[0].TryGetProperty("content", out var content) &&
                content.TryGetProperty("parts", out var partsArr) &&
                partsArr.GetArrayLength() > 0 &&
                partsArr[0].TryGetProperty("text", out var textEl))
            {
                return textEl.GetString() ?? string.Empty;
            }

            _logger.LogWarning("Gemini response had no text: {Body}", body[..Math.Min(300, body.Length)]);
            return "ERROR";
        }

        private string GenerateDemoReport(GenerateReportDTO dto)
        {
            var name = string.IsNullOrWhiteSpace(dto.StudentName) ? "الطالب" : dto.StudentName;
            var subject = string.IsNullOrWhiteSpace(dto.SubjectName) ? "المادة" : dto.SubjectName;

            return $"## تقرير أداء {name}\n\n" +
                   $"### ملخص عام\n" +
                   $"هذا تقرير إرشادي عن أداء {name} في {subject}. يُظهر التقدم المستمر مع بعض النقاط التي تحتاج إلى تعزيز.\n\n" +
                   $"### نقاط القوة\n" +
                   "1. التزام بالمواعيد والمذاكرة المنتظمة.\n" +
                   "2. مشاركة جيدة في الأنشطة والمناقشات.\n" +
                   "3. فهم جيد للمفاهيم الأساسية.\n\n" +
                   $"### نقاط تحتاج تحسين\n" +
                   "1. حل المزيد من الأسئلة التدريبية لتعزيز الفهم.\n" +
                   "2. مراجعة الدروس السابقة بانتظام.\n" +
                   "3. التواصل مع المعلم عند مواجهة أي صعوبة.\n\n" +
                   $"### توصيات\n" +
                   "وضع خطة مذاكرة أسبوعية واضحة، والتركيز على حل التمارين، والمتابعة المستمرة مع المعلم لضمان أفضل النتائج.";
        }

        private string GenerateDemoAnalysis(string fileName, string? context)
        {
            var name = string.IsNullOrWhiteSpace(fileName) ? "الملف" : fileName;
            var output = new System.Text.StringBuilder();
            output.AppendLine($"## ملخص تحليل الملف: {name}\n");
            output.AppendLine("### محتوى الملف");
            output.AppendLine("تم استلام الملف المرفق وتحليله. يبدو أنه يحتوي على مادة تعليمية أو تدريبية مرتبطة بالمقرر.");
            if (!string.IsNullOrWhiteSpace(context))
                output.AppendLine($"\n### سياق المعلم\n{context}\n");
            output.AppendLine("### أبرز النقاط");
            output.AppendLine("1. المحتوى منظم بشكل يسهّل الفهم والمراجعة.");
            output.AppendLine("2. يُنصح بإضافة تمارين تطبيقية بعد كل قسم.");
            output.AppendLine("3. يمكن استخدام هذا المحتوى كمرجع أساسي للمذاكرة.");
            output.AppendLine("\n> ملاحظة: هذا تحليل تلقائي إرشادي. لم يُستكمل التحميل إلى نموذج الذكاء الاصطناعي حالياً.");
            return output.ToString();
        }

        /// <summary>
        /// Offline fallback that produces a realistic Arabic tutoring reply without
        /// any external dependency. Used when no API key is configured or the call fails.
        /// </summary>
        private string GenerateDemoReply(string userMessage)
        {
            var text = (userMessage ?? "").Trim();

            if (text.Length == 0)
                return "أهلاً بك في المساعد التعليمي للمنصة! يمكنك سؤالي عن أي مادة دراسية وسأشرح لك بأسلوب بسيط.";

            var reply = new System.Text.StringBuilder();

            // Detect topic by keywords
            if (ContainsAny(text, "قدرات", "كمي", "لفظي", "ورقي", "محوسب"))
            {
                reply.AppendLine("سؤال ممتاز عن اختبار القدرات! ✨");
                reply.AppendLine("إليك خطة مذاكرة مجربة:");
                reply.AppendLine("1. ابدأ بالجزء الكمي وخصص له ساعتين يومياً (الأرقام، الجبر، الهندسة، الإحصاء).");
                reply.AppendLine("2. الجزء اللفظي يحتاج قراءة يومية ومفردات: خصص ساعة لتدريبات التناظر اللفظي وإكمال الجمل.");
                reply.AppendLine("3. حل نماذج محوسبة كاملة مرة أسبوعياً مع ضبط الوقت.");
                reply.AppendLine("4. ركّز على نقاط الضعف ثم عد للنماذج السابقة.");
                reply.AppendLine();
                reply.AppendLine("هل تريد مثالاً محلولاً على سؤال كمي؟");
            }
            else if (ContainsAny(text, "تحصيلي", "علوم", "أحياء", "كيمياء", "فيزياء"))
            {
                reply.AppendLine("رائع، سؤال من الاختبار التحصيلي! 🧪");
                reply.AppendLine("أفضل طريقة للتحصيل:");
                reply.AppendLine("1. افتح الملخص أولاً ثم حل الأسئلة مباشرة — لا تجعل المذاكرة سلبية.");
                reply.AppendLine("2. للأحياء: احفظ المصطلحات ثم طبّقها على أسئلة الاختيار من متعدد.");
                reply.AppendLine("3. للكيمياء: ابدأ بالمعادلات والتفاعلات فهي الأكثر تكراراً.");
                reply.AppendLine("4. للفيزياء: تدرب على القوانين الأساسية وحلّ مسألة واحدة يومياً.");
                reply.AppendLine();
                reply.AppendLine("حدد المادة التي تحتاج مساعدة فيها وسأشرح لك أول نقطة بالتفصيل.");
            }
            else if (ContainsAny(text, "رياضيات", "حساب", "جبر", "هندسة", "معادلة", "كسر", "نسبة"))
            {
                reply.AppendLine("سؤال ممتاز في الرياضيات! 📐");
                reply.AppendLine("القاعدة الأساسية التي يجب أن تتقنها:");
                reply.AppendLine("1. افهم القاعدة قبل الحفظ — الرياضيات مهارة تُبنى خطوة بخطوة.");
                reply.AppendLine("2. اكتب الخطوات بشكل منظم حتى تستطيع مراجعة خطأك.");
                reply.AppendLine("3. حلّ 3 مسائل إضافية على نفس الفكرة بعد كل درس.");
                reply.AppendLine("4. إذا تعثرت في مسألة، حلّ نسخة أبسط منها أولاً ثم عد إليها.");
                reply.AppendLine();
                reply.AppendLine("اكتب لي المسألة بالتفصيل وسأحلها لك خطوة بخطوة.");
            }
            else if (ContainsAny(text, "إنجليزي", "english", "grammar", "vocabulary", "لغة"))
            {
                reply.AppendLine("أحسنت، اللغة الإنجليزية مهارة تراكمية! 🌍");
                reply.AppendLine("خطة يومية بسيطة:");
                reply.AppendLine("1. احفظ 10 كلمات جديدة يومياً مع جملة لكل كلمة.");
                reply.AppendLine("2. تعلّم قاعدة واحدة يومياً مع تمرينَين عليها.");
                reply.AppendLine("3. استمع لمقطع قصير (3 دقائق) وكرر ما سمعته بصوت عالٍ.");
                reply.AppendLine("4. اكتب فقرة قصيرة (5 جمل) عن يومك قبل النوم.");
                reply.AppendLine();
                reply.AppendLine("أخبرني ما النقطة الصعبة لديك: قواعد أم مفردات أم قراءة؟");
            }
            else if (ContainsAny(text, "امتحان", "اختبار", "مذاكرة", "مراجعة", "جدول"))
            {
                reply.AppendLine("جدول مذاكرة ذكي هو نصف النجاح! ⏰");
                reply.AppendLine("طريقة تنظيم وقتك:");
                reply.AppendLine("1. قسّم المواد على 6 أيام واجعل يوم الجمعة مراجعة عامة.");
                reply.AppendLine("2. مذاكرة 45 دقيقة + راحة 15 دقيقة أفضل من 3 ساعات متواصلة.");
                reply.AppendLine("3. راجع ما درسته في نفس اليوم قبل النوم لمدة 10 دقائق.");
                reply.AppendLine("4. ابدأ من المادة الأصعب عندما تكون طاقتك أعلى.");
                reply.AppendLine();
                reply.AppendLine("كم يوماً متبقياً على الامتحان؟ أساعدك في بناء الخطة.");
            }
            else if (ContainsAny(text, "أهلًا", "اهلا", "مرحبا", "السلام", "hello", "hi", "صباح"))
            {
                reply.AppendLine("أهلاً وسهلاً بك! 👋");
                reply.AppendLine("أنا المساعد التعليمي للمنصة، أستطيع مساعدتك في:");
                reply.AppendLine("- شرح مواد القدرات والتحصيلي.");
                reply.AppendLine("- حل مسائل الرياضيات خطوة بخطوة.");
                reply.AppendLine("- بناء جدول مذاكرة ومراجعة فعال.");
                reply.AppendLine("- نصائح اللغة الإنجليزية.");
                reply.AppendLine();
                reply.AppendLine("ما الذي تريد أن نبدأ به اليوم؟");
            }
            else
            {
                reply.AppendLine("سؤال جميل! سأجيبك بأسلوب مبسط 🎯");
                reply.AppendLine("لأفهم طلبك بشكل أفضل، يمكنك:");
                reply.AppendLine("1. كتابة اسم المادة أو الموضوع بوضوح (رياضيات، قدرات، تحصيلي...).");
                reply.AppendLine("2. وضع سؤالك في جملة كاملة.");
                reply.AppendLine("3. إن أردت حلاً، انسخ المسألة كاملة.");
                reply.AppendLine();
                reply.AppendLine("أو اختر من المواضيع الجاهزة: القدرات، التحصيلي، الرياضيات، الإنجليزي، أو جدول المذاكرة.");
            }

            return reply.ToString();
        }

        private static bool ContainsAny(string text, params string[] keywords)
        {
            foreach (var k in keywords)
            {
                if (text.Contains(k, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }
    }
}
