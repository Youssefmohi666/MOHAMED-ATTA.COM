namespace elmanassa.DTOs
{
    public class PdfInfoDTO
    {
        public int PageCount { get; set; }
    }

    public class PdfSnipDTO
    {
        /// <summary>Page number (1-based) to snip from.</summary>
        public int Page { get; set; } = 1;
        /// <summary>Crop area in rendered-page pixels (same DPI as GET pdf/{id}/page/{page}).</summary>
        public int X { get; set; }
        public int Y { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
    }

    public class PdfSnipResultDTO
    {
        public string MediaFileId { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
    }
}