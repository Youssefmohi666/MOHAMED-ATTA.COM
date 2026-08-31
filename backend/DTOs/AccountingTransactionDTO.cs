namespace elmanassa.DTOs
{
    public class AccountingTransactionDTO
    {
        public string? Id { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? Date { get; set; }
        public string? Service { get; set; }
        public decimal Amount { get; set; }
        public string? Currency { get; set; }
        public string Type { get; set; } = "income";
        public string? InvoiceNumber { get; set; }
        public string? PaymentMethod { get; set; }
        public string? ContactNumber { get; set; }
        public string? Notes { get; set; }
        public Guid? TeacherId { get; set; }
    }
}
