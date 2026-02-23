using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;
using System.Text;

namespace Fiebo.Infrastructure.ExternalServices
{
    public class SpeedSmsService : ISmsService
    {
        public const int TYPE_QC = 1;
        public const int TYPE_CSKH = 2;
        public const int TYPE_BRANDNAME = 3;
        public const int TYPE_OTP = 4; // Gửi sms sử dụng brandname Notify
        public const int TYPE_GATEWAY = 5; // Gửi sms sử dụng app android từ số di động cá nhân, download app tại đây: https://speedsms.vn/sms-gateway-service/

        const string rootURL = "https://api.speedsms.vn/index.php";
        private string accessToken;

        private readonly IConfiguration _config;

        public SpeedSmsService(IConfiguration config)
        {
            _config = config;

            accessToken = _config["SpeedSms:AccessToken"]
                ?? throw new Exception("SpeedSms AccessToken not found");
        }


        public string EncodeNonAsciiCharacters(string value)
        {
            System.Text.StringBuilder sb = new System.Text.StringBuilder();
            foreach (char c in value)
            {
                if (c > 127)
                {
                    // This character is too big for ASCII
                    string encodedValue = "\\u" + ((int)c).ToString("x4");
                    sb.Append(encodedValue);
                }
                else
                {
                    sb.Append(c);
                }
            }
            return sb.ToString();
        }

        public async Task<string> getUserInfo()
        {
            string url = rootURL + "/user/info";
            using var client = new HttpClient();
            var authToken = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{accessToken}:x"));
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authToken);

            return await client.GetStringAsync(url);
        }

        public async Task<string> SendSMS(string[] phones, string content, int type, string sender)
        {
            string url = rootURL + "/sms/send";
            if (phones.Length <= 0)
                return "";
            if (content.Equals(""))
                return "";

            if (type == TYPE_BRANDNAME && sender.Equals(""))
                return "";

            using var client = new HttpClient
            {
                DefaultRequestHeaders =
                {
                    Authorization = new AuthenticationHeaderValue("Basic",
                        Convert.ToBase64String(Encoding.ASCII.GetBytes($"{accessToken}:x")))
                }
            };

            string builder = "{\"to\":[";

            for (int i = 0; i < phones.Length; i++)
            {
                builder += "\"" + phones[i] + "\"";
                if (i < phones.Length - 1)
                {
                    builder += ",";
                }
            }
            builder += "], \"content\": \"" + Uri.EscapeDataString(content) + "\", \"type\":" + type + ", \"sender\": \"" + sender + "\"}";

            string json = builder.ToString();

            var httpContent = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PostAsync(url, httpContent);
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> SendMMS(string[] phones, string content, string link, string sender)
        {
            string url = rootURL + "/mms/send";
            if (phones.Length <= 0)
                return "";
            if (content.Equals(""))
                return "";

            using var client = new HttpClient
            {
                DefaultRequestHeaders =
                {
                    Authorization = new AuthenticationHeaderValue("Basic",
                        Convert.ToBase64String(Encoding.ASCII.GetBytes($"{accessToken}:x")))
                }
            };

            string builder = "{\"to\":[";

            for (int i = 0; i < phones.Length; i++)
            {
                builder += "\"" + phones[i] + "\"";
                if (i < phones.Length - 1)
                {
                    builder += ",";
                }
            }
            builder += "], \"content\": \"" + Uri.EscapeDataString(content) + "\", \"link\": \"" + link + "\", \"sender\": \"" + sender + "\"}";

            string json = builder.ToString();
            var httpContent = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PostAsync(url, httpContent);
            return await response.Content.ReadAsStringAsync();
        }
        public async Task<ServiceResponse> SendSmsAsync(string phoneNumber, string message)
        {
            var result = await SendSMS(
                    [phoneNumber],
                    message,
                    TYPE_GATEWAY,
                    _config["SpeedSms:Sender"]!
                );
            return new ServiceResponse
            {
                IsSuccess = true,
                Message = "SMS has been sent successfully!"
            };
        }
    }
}
