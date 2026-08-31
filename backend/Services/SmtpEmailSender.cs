using System.Net;
using System.Net.Mail;
using System.Net.Security;

namespace elmanassa.Services
{
    public class SmtpEmailSender : IEmailSender
    {
        private readonly IConfiguration _config;
        private readonly ILogger<SmtpEmailSender> _logger;

        public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> logger)
        {
            _config = config;
            _logger = logger;
        }

        private string Brand(string key) => _config[$"Branding:{key}"] ?? "";

        public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            var host = _config["Email:Host"] ?? "127.0.0.1";
            var port = int.TryParse(_config["Email:Port"], out var p) ? p : 25;
            var from = _config["Email:FromAddress"] ?? "noreply@elanmassa.com";
            var fromName = _config["Email:FromName"] ?? "منصة تعليمية";

            using var client = new SmtpClient(host, port)
            {
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 30000
            };

            var message = new MailMessage
            {
                From = new MailAddress(from, fromName, System.Text.Encoding.UTF8),
                Subject = subject,
                SubjectEncoding = System.Text.Encoding.UTF8,
                Body = htmlBody,
                IsBodyHtml = true,
                BodyEncoding = System.Text.Encoding.UTF8
            };
            message.To.Add(toEmail);

            try
            {
                await client.SendMailAsync(message);
                _logger.LogInformation("Email sent to {Email}: {Subject}", toEmail, subject);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
                throw;
            }
        }

        public async Task SendVerificationCodeAsync(string toEmail, string code)
        {
            var brand = Brand("EmailBrandName");
            var tagline = Brand("EmailTagline");
            var footerLink = _config["App:FrontendUrl"] ?? "https://elanmassa.com";
            var year = Brand("EmailCopyrightYear");

            var html = $@"
<!DOCTYPE html>
<html dir='rtl' lang='ar'>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>
<body style='margin:0; padding:0; background:#f0f4f8; font-family: Arial, Tahoma, sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f0f4f8; padding:40px 20px;'>
<tr><td align='center'>
<table width='500' cellpadding='0' cellspacing='0' style='background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);'>

    <!-- Header -->
    <tr>
        <td style='background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%); padding:32px 40px; text-align:center;'>
            <div style='font-size:28px; font-weight:bold; color:#ffffff; letter-spacing:2px;'>{brand}</div>
            <div style='font-size:13px; color:rgba(255,255,255,0.7); margin-top:6px;'>{tagline}</div>
        </td>
    </tr>

    <!-- Body -->
    <tr>
        <td style='padding:36px 40px;'>
            <p style='font-size:16px; color:#333; margin:0 0 8px;'>مرحباً،</p>
            <p style='font-size:15px; color:#666; line-height:1.7; margin:0 0 24px;'>
                شكراً لتسجيلك في منصة {brand}. استخدم رمز التحقق أدناه لتفعيل حسابك.
            </p>

            <!-- Code Box -->
            <div style='background:#f8fafb; border:2px dashed #d2e1d9; border-radius:12px; padding:28px; text-align:center; margin:0 0 24px;'>
                <div style='font-size:12px; color:#999; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;'>رمز التحقق</div>
                <div style='font-size:40px; font-weight:bold; color:#1E3A8A; letter-spacing:12px; font-family: monospace;'>{code}</div>
            </div>

            <div style='background:#fff8e1; border-radius:8px; padding:14px 18px; margin:0 0 24px; display:flex; align-items:center;'>
                <span style='font-size:14px; color:#856404;'>
                    ⏱️ هذا الرمز صالح لمدة <strong>10 دقائق</strong> فقط.
                </span>
            </div>

            <p style='font-size:14px; color:#666; line-height:1.7; margin:0;'>
                إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا البريد الإلكتروني بأمان.
            </p>
        </td>
    </tr>

    <!-- Footer -->
    <tr>
        <td style='background:#f8fafb; padding:24px 40px; text-align:center; border-top:1px solid #eee;'>
            <div style='font-size:13px; color:#1E3A8A; font-weight:bold; margin-bottom:6px;'>{brand}</div>
            <div style='font-size:11px; color:#999; line-height:1.6;'>
                © {year} {brand}. جميع الحقوق محفوظة.<br>
                <a href='{footerLink}' style='color:#1E3A8A; text-decoration:none;'>{footerLink}</a>
            </div>
        </td>
    </tr>

</table>
</td></tr>
</table>
</body>
</html>";

            await SendEmailAsync(toEmail, $"رمز التحقق - {brand}", html);
        }

        public async Task SendPasswordResetAsync(string toEmail, string resetLink)
        {
            var brand = Brand("EmailBrandName");
            var footerLink = _config["App:FrontendUrl"] ?? "https://elanmassa.com";
            var year = Brand("EmailCopyrightYear");

            var html = $@"
<!DOCTYPE html>
<html dir='rtl' lang='ar'>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>
<body style='margin:0; padding:0; background:#f0f4f8; font-family: Arial, Tahoma, sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#f0f4f8; padding:40px 20px;'>
<tr><td align='center'>
<table width='500' cellpadding='0' cellspacing='0' style='background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);'>

    <!-- Header -->
    <tr>
        <td style='background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%); padding:32px 40px; text-align:center;'>
            <div style='font-size:28px; font-weight:bold; color:#ffffff; letter-spacing:2px;'>{brand}</div>
            <div style='font-size:13px; color:rgba(255,255,255,0.7); margin-top:6px;'>إعادة تعيين كلمة المرور</div>
        </td>
    </tr>

    <!-- Body -->
    <tr>
        <td style='padding:36px 40px;'>
            <p style='font-size:16px; color:#333; margin:0 0 8px;'>مرحباً،</p>
            <p style='font-size:15px; color:#666; line-height:1.7; margin:0 0 28px;'>
                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط الزر أدناه لتعيين كلمة مرور جديدة.
            </p>

            <!-- CTA Button -->
            <div style='text-align:center; margin:0 0 28px;'>
                <a href='{resetLink}' style='display:inline-block; background: linear-gradient(135deg, #4F8751 0%, #3a6b3d 100%); color:#ffffff; padding:16px 40px; border-radius:10px; text-decoration:none; font-weight:bold; font-size:16px; letter-spacing:0.5px;'>
                    إعادة تعيين كلمة المرور
                </a>
            </div>

            <div style='background:#fff8e1; border-radius:8px; padding:14px 18px; margin:0 0 24px;'>
                <span style='font-size:14px; color:#856404;'>
                    ⏱️ هذا الرابط صالح لمدة <strong>ساعة واحدة</strong> فقط.
                </span>
            </div>

            <p style='font-size:14px; color:#666; line-height:1.7; margin:0;'>
                إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني.
            </p>
        </td>
    </tr>

    <!-- Footer -->
    <tr>
        <td style='background:#f8fafb; padding:24px 40px; text-align:center; border-top:1px solid #eee;'>
            <div style='font-size:13px; color:#1E3A8A; font-weight:bold; margin-bottom:6px;'>{brand}</div>
            <div style='font-size:11px; color:#999; line-height:1.6;'>
                © {year} {brand}. جميع الحقوق محفوظة.<br>
                <a href='{footerLink}' style='color:#1E3A8A; text-decoration:none;'>{footerLink}</a>
            </div>
        </td>
    </tr>

</table>
</td></tr>
</table>
</body>
</html>";

            await SendEmailAsync(toEmail, $"إعادة تعيين كلمة المرور - {brand}", html);
        }
    }
}
