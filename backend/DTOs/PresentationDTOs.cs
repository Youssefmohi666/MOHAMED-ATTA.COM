namespace elmanassa.DTOs
{
    public class PresentationGenerateDTO
    {
        public string Topic { get; set; } = string.Empty;
        public int SlideCount { get; set; } = 10;
        public string Style { get; set; } = "professional";
        public string Language { get; set; } = "ar";
    }

    public class PresentationDTO
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Topic { get; set; } = string.Empty;
        public int SlideCount { get; set; }
        public string Style { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class PresentationDetailDTO : PresentationDTO
    {
        public List<PresentationSlideDTO> Slides { get; set; } = new();
    }

    public class PresentationSlideDTO
    {
        public int Index { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }

    public class PresentationListItemDTO
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Topic { get; set; } = string.Empty;
        public int SlideCount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
