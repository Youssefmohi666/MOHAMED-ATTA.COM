namespace elmanassa.DTOs
{
    public class InquiryDTO
    {
        public Guid SubjectId { get; set; }
        public string SubjectTitle { get; set; }
        public Guid TeacherId { get; set; }
        public string TeacherName { get; set; }
        public string WhatsAppNumber { get; set; }
        public string PreFormattedMessage { get; set; }
    }
}
