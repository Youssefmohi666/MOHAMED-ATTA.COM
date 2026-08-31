namespace elmanassa.Services
{
    public interface IEmailSender
    {
        Task SendEmailAsync(string toEmail, string subject, string htmlBody);
        Task SendVerificationCodeAsync(string toEmail, string code);
        Task SendPasswordResetAsync(string toEmail, string resetLink);
    }
}
