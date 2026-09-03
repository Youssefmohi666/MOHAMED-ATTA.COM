using elmanassa.ApplicationDbContext;
using elmanassa.DTOs;
using elmanassa.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace elmanassa.Services
{
    public interface IStudyLibraryService
    {
        Task<StudyResourceDTO?> UploadAsync(Guid teacherId, StudyResource model, IFormFile file);
        Task<StudyResourceDTO?> GetAsync(Guid id, Guid userId, bool staff);
        Task<PagedResult<StudyResourceDTO>> ListAsync(Guid userId, bool staff, string? grade, string? term, string? subjectId, string? search, int page, int perPage);
        Task<List<StudyResourceDTO>> ListMineAsync(Guid userId);
        Task<(byte[]? content, string fileName, string contentType)> DownloadAsync(Guid id, Guid userId, bool staff);
        Task<bool> DeleteAsync(Guid id, Guid userId);
        Task<bool> UserCanAccessAsync(Guid userId, StudyResource resource);
        Task<List<StudyResourceDTO>> SearchRagAsync(string query, int maxResults = 5);
    }

    public class StudyLibraryService : IStudyLibraryService
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<StudyLibraryService> _logger;
        private readonly string _uploadPath;

        public StudyLibraryService(AppDbContext context, IWebHostEnvironment env, ILogger<StudyLibraryService> logger)
        {
            _context = context;
            _env = env;
            _logger = logger;
            _uploadPath = Path.Combine(env.ContentRootPath, "uploads", "study-library");
            if (!Directory.Exists(_uploadPath))
                Directory.CreateDirectory(_uploadPath);
        }

        public async Task<StudyResourceDTO?> UploadAsync(Guid teacherId, StudyResource model, IFormFile file)
        {
            try
            {
                var id = Guid.NewGuid();
                var ext = Path.GetExtension(file.FileName).ToLower();
                var safeName = $"{id:N}{ext}";
                var dir = Path.Combine(_uploadPath, id.ToString("N"));
                Directory.CreateDirectory(dir);
                var fullPath = Path.Combine(dir, safeName);

                using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                model.Id = id;
                model.FileName = file.FileName;
                model.FilePath = Path.Combine(id.ToString("N"), safeName);
                model.ContentType = file.ContentType ?? "application/octet-stream";
                model.FileType = ext.TrimStart('.');
                model.SizeBytes = new FileInfo(fullPath).Length;
                model.UploadedAt = DateTime.UtcNow;
                model.UpdatedAt = DateTime.UtcNow;
                model.ExtractedText = TryExtractText(file, fullPath);

                _context.StudyResources.Add(model);
                await _context.SaveChangesAsync();

                return ToDto(model);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Study library upload failed");
                return null;
            }
        }

        public async Task<StudyResourceDTO?> GetAsync(Guid id, Guid userId, bool staff)
        {
            var res = await _context.StudyResources
                .Include(r => r.Subject)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (res == null) return null;

            if (!staff && !res.Public && !await UserCanAccessAsync(userId, res))
                return null;

            return ToDto(res);
        }

        public async Task<PagedResult<StudyResourceDTO>> ListAsync(Guid userId, bool staff, string? grade, string? term, string? subjectId, string? search, int page, int perPage)
        {
            var query = _context.StudyResources.AsQueryable();

            if (!staff)
            {
                // Students only see public resources OR resources of subjects/courses they are enrolled in
                var student = await FindStudentAsync(userId);
                var enrolledSubjectIds = new HashSet<Guid>();
                var enrolledCourseIds = new HashSet<int>();
                if (student != null)
                {
                    enrolledSubjectIds = (await _context.Enrollments
                        .Where(e => e.UserId == userId && e.SubjectId != null)
                        .Select(e => e.SubjectId!.Value)
                        .ToListAsync()).ToHashSet();
                    enrolledCourseIds = (await _context.Enrollments
                        .Where(e => e.UserId == userId && e.CourseId != null)
                        .Select(e => e.CourseId!.Value)
                        .ToListAsync()).ToHashSet();
                }

                query = query.Where(r => r.Public
                    || (r.SubjectId != null && enrolledSubjectIds.Contains(r.SubjectId.Value))
                    || (r.CourseId != null && enrolledCourseIds.Contains(r.CourseId.Value)));
            }

            if (!string.IsNullOrWhiteSpace(grade)) query = query.Where(r => r.Grade == grade);
            if (!string.IsNullOrWhiteSpace(term)) query = query.Where(r => r.Term == term);
            if (Guid.TryParse(subjectId, out var sid2)) query = query.Where(r => r.SubjectId == sid2);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(r => r.Title.Contains(s) || (r.Description != null && r.Description.Contains(s)) || (r.SubjectName != null && r.SubjectName.Contains(s)));
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.UploadedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .Select(ToDtoExpr())
                .ToListAsync();

            return new PagedResult<StudyResourceDTO>
            {
                items = items,
                total = total,
                page = page,
                perPage = perPage
            };
        }

        public async Task<List<StudyResourceDTO>> ListMineAsync(Guid userId)
        {
            var items = await _context.StudyResources
                .Where(r => r.TeacherId == userId)
                .OrderByDescending(r => r.UploadedAt)
                .ToListAsync();
            return items.Select(ToDto).ToList();
        }

        public async Task<(byte[]? content, string fileName, string contentType)> DownloadAsync(Guid id, Guid userId, bool staff)
        {
            var res = await _context.StudyResources.FirstOrDefaultAsync(r => r.Id == id);
            if (res == null) return (null, "", "");

            if (!staff && !res.Public && !await UserCanAccessAsync(userId, res))
                return (null, "", "");

            var fullPath = Path.Combine(_uploadPath, res.FilePath);
            if (!System.IO.File.Exists(fullPath))
                return (null, "", "");

            var bytes = await System.IO.File.ReadAllBytesAsync(fullPath);
            return (bytes, res.FileName, res.ContentType);
        }

        public async Task<bool> DeleteAsync(Guid id, Guid userId)
        {
            var res = await _context.StudyResources.FirstOrDefaultAsync(r => r.Id == id && r.TeacherId == userId);
            if (res == null) return false;

            var fullPath = Path.Combine(_uploadPath, res.FilePath);
            if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);
            var dir = Path.GetDirectoryName(fullPath);
            if (dir != null && Directory.Exists(dir) && !Directory.EnumerateFileSystemEntries(dir).Any())
                Directory.Delete(dir);

            _context.StudyResources.Remove(res);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UserCanAccessAsync(Guid userId, StudyResource resource)
        {
            if (resource.Public) return true;

            var student = await FindStudentAsync(userId);
            if (student == null) return false;

            if (resource.SubjectId != null)
            {
                var sub = await _context.Enrollments.AnyAsync(e => e.UserId == userId && e.SubjectId == resource.SubjectId);
                if (sub) return true;
            }
            if (resource.CourseId != null)
            {
                var course = await _context.Enrollments.AnyAsync(e => e.UserId == userId && e.CourseId == resource.CourseId);
                if (course) return true;
            }
            return false;
        }

        public async Task<List<StudyResourceDTO>> SearchRagAsync(string query, int maxResults = 5)
        {
            var q = query.Trim();
            var results = await _context.StudyResources
                .Where(r => !string.IsNullOrEmpty(r.ExtractedText) ||
                            r.Title.Contains(q) ||
                            (r.Description != null && r.Description.Contains(q)))
                .OrderByDescending(r => r.UploadedAt)
                .Take(maxResults * 2)
                .ToListAsync();

            // simple scoring: prefer title/description matches, then extracted text word overlap
            var scored = results.Select(r =>
            {
                var score = 0f;
                if (r.Title.Contains(q, StringComparison.OrdinalIgnoreCase)) score += 3;
                if (r.Description != null && r.Description.Contains(q, StringComparison.OrdinalIgnoreCase)) score += 2;
                if (!string.IsNullOrEmpty(r.ExtractedText))
                {
                    var words = q.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    var hits = words.Count(w => r.ExtractedText.Contains(w, StringComparison.OrdinalIgnoreCase));
                    score += hits;
                }
                return (r, score);
            }).Where(x => x.score > 0).OrderByDescending(x => x.score).Take(maxResults).ToList();

            return scored.Select(x => ToDto(x.r)).ToList();
        }

        private async Task<Student?> FindStudentAsync(Guid userId)
        {
            return await _context.Students.FirstOrDefaultAsync(s => s.UserId == userId);
        }

        private static System.Linq.Expressions.Expression<Func<StudyResource, StudyResourceDTO>> ToDtoExpr()
        {
            return r => new StudyResourceDTO
            {
                Id = r.Id,
                Title = r.Title,
                Description = r.Description,
                FileName = r.FileName,
                SubjectId = r.SubjectId,
                SubjectName = r.SubjectName,
                CourseId = r.CourseId,
                CourseName = r.CourseName,
                Grade = r.Grade,
                Term = r.Term,
                FileType = r.FileType,
                SizeBytes = r.SizeBytes,
                Public = r.Public,
                UploadedAt = r.UploadedAt
            };
        }

        private static StudyResourceDTO ToDto(StudyResource r)
        {
            return new StudyResourceDTO
            {
                Id = r.Id,
                Title = r.Title,
                Description = r.Description,
                FileName = r.FileName,
                SubjectId = r.SubjectId,
                SubjectName = r.SubjectName,
                CourseId = r.CourseId,
                CourseName = r.CourseName,
                Grade = r.Grade,
                Term = r.Term,
                FileType = r.FileType,
                SizeBytes = r.SizeBytes,
                Public = r.Public,
                UploadedAt = r.UploadedAt
            };
        }

        private static string? TryExtractText(IFormFile file, string fullPath)
        {
            try
            {
                var ext = Path.GetExtension(file.FileName).ToLower();
                if (ext == ".txt" || ext == ".md" || ext == ".csv" || ext == ".log")
                {
                    return System.IO.File.ReadAllText(fullPath, System.Text.Encoding.UTF8);
                }
                // For PDFs/images we can't extract plaintext reliably without a library;
                // leave null so the chat RAG can pass the file to Gemini directly if needed.
                return null;
            }
            catch
            {
                return null;
            }
        }
    }
}
