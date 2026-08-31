using System.Collections.Generic;

namespace elmanassa.DTOs
{
    /// <summary>
    /// Compact, sitemap-oriented metadata for a published subject.
    /// Used by the SEO endpoint to power sitemap generation without
    /// exposing full course details.
    /// </summary>
    public class SeoSubjectDTO
    {
        public System.Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        /// <summary>Absolute URL to the subject detail page.</summary>
        public string Url { get; set; } = string.Empty;
        /// <summary>ISO-8601 last-modified date (created/updated).</summary>
        public string LastMod { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response payload for <c>GET /api/v1/seo/sitemap</c>.
    /// </summary>
    public class SeoSitemapDTO
    {
        public string SiteName { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = string.Empty;
        public int StaticRouteCount { get; set; }
        public List<SeoSubjectDTO> Courses { get; set; } = new();
    }
}
