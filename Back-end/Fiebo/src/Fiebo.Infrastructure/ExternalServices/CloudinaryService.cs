using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Fiebo.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System;
using System.Security.Principal;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.ExternalServices
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IConfiguration configuration)
        {
            var account = new Account(
                configuration["Cloudinary:CloudName"],
                configuration["Cloudinary:ApiKey"],
                configuration["Cloudinary:ApiSecret"]);
            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;

            //var cloudName = "dlcemggaf";
            //    var apiKey = "754167386276174";
            //    var apiSecret = "msGlO4t9QvdJmy6fvv9FUjcM5Qs";
        }

        public async Task<string> UploadImageAsync(IFormFile file)
        {
            if (file == null || file.Length == 0) return string.Empty;

            var uploadResult = new ImageUploadResult();

            using (var stream = file.OpenReadStream())
            {
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    Folder = "Fiebo_Image", // Tự động tạo Folder nếu chưa có
                    //Transformation = new Transformation().Width(800).Height(800).Crop("limit")
                };

                uploadResult = await _cloudinary.UploadAsync(uploadParams);
            }

            if (uploadResult.Error != null)
            {
                throw new Exception($"Cloudinary Upload Error: {uploadResult.Error.Message}");
            }

            return uploadResult.SecureUrl.ToString();
        }
    }
}
