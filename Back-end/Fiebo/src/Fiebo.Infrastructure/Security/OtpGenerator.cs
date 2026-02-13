using Fiebo.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Security
{
    public class OtpGenerator : IOtpGenerator
    {
        private readonly IConfiguration _config;

        public OtpGenerator(IConfiguration config)
        {
            _config = config;
        }

        public int GetOtpLength()
        {
            return int.Parse(
                _config["OtpSettings:Length"] ?? "6"
            );
        }

        public string Generate()
        {
            var length = GetOtpLength();

            var bytes = new byte[length];
            RandomNumberGenerator.Fill(bytes);

            var sb = new StringBuilder();

            foreach (var b in bytes)
            {
                sb.Append(b % 10);
            }

            return sb.ToString();
        }

        public int GetLength()
        {
            return GetOtpLength();
        }

        public TimeSpan GetExpireTime()
        {
            return TimeSpan.FromMinutes(GetExpireMinutes());
        }

        public int GetExpireMinutes()
        {
            return int.Parse(
                 _config["OtpSettings:ExpireMinutes"] ?? "5"
             );
        }
    }
}
