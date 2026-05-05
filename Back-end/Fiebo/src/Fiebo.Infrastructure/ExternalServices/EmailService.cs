using Fiebo.Application.Interfaces;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;
using System;
using System.Collections.Generic;
using System.Linq;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.ExternalServices
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            var email = new MimeMessage();
            email.From.Add(new MailboxAddress(_config["EmailSettings:SenderName"], _config["EmailSettings:SenderEmail"]));
            email.To.Add(new MailboxAddress("", to));
            email.Subject = subject;
            email.Body = new TextPart("html") { Text = body };

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(_config["EmailSettings:SmtpServer"], int.Parse(_config["EmailSettings:Port"]!), SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(_config["EmailSettings:SenderEmail"], _config["EmailSettings:Password"]);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }
        public async Task SendEmailsAsync(IEnumerable<(string To, string Subject, string Body)> emails)
        {
            if (emails == null || !emails.Any()) return;

            using var smtp = new SmtpClient();
            try
            {
                _logger.LogInformation("Connecting to SMTP server for bulk sending...");
                await smtp.ConnectAsync(_config["EmailSettings:SmtpServer"], int.Parse(_config["EmailSettings:Port"]!), SecureSocketOptions.StartTls);
                
                _logger.LogInformation("Authenticating SMTP user...");
                await smtp.AuthenticateAsync(_config["EmailSettings:SenderEmail"], _config["EmailSettings:Password"]);

                foreach (var (to, subject, body) in emails)
                {
                    try
                    {
                        var email = new MimeMessage();
                        email.From.Add(new MailboxAddress(_config["EmailSettings:SenderName"], _config["EmailSettings:SenderEmail"]));
                        email.To.Add(new MailboxAddress("", to));
                        email.Subject = subject;
                        email.Body = new TextPart("html") { Text = body };

                        _logger.LogInformation("Sending email to {To}...", to);
                        await smtp.SendAsync(email);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send individual email to {To} in bulk process", to);
                    }
                }

                await smtp.DisconnectAsync(true);
                _logger.LogInformation("Bulk email sending completed.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Critical failure during bulk SMTP process");
                throw;
            }
        }
    }
}
