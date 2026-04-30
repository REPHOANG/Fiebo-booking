using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Fiebo.Application.DTOs.Common;
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

        public async Task<UploadImageResultDto> UploadImageAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File không hợp lệ");

            ImageUploadResult uploadResult;

            using (var stream = file.OpenReadStream())
            {
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    Folder = "Fiebo_Image",
                    // Transformation = new Transformation().Width(800).Height(800).Crop("limit")
                };

                uploadResult = await _cloudinary.UploadAsync(uploadParams);
            }

            if (uploadResult.Error != null)
            {
                throw new Exception($"Cloudinary Upload Error: {uploadResult.Error.Message}");
            }

            return new UploadImageResultDto
            {
                Url = uploadResult.SecureUrl.ToString(),
                PublicId = uploadResult.PublicId
            };
        }

        public async Task DeleteImageAsync(string publicId)
        {
            if (string.IsNullOrWhiteSpace(publicId))
                throw new ArgumentException("publicId không hợp lệ");

            var deleteParams = new DeletionParams(publicId)
            {
                Invalidate = true
            };

            var result = await _cloudinary.DestroyAsync(deleteParams);

            if (result.Error != null)
            {
                throw new Exception($"Cloudinary Delete Error: {result.Error.Message}");
            }

            // result.Result có thể là: "ok", "not found"
            if (result.Result != "ok" && result.Result != "not found")
            {
                throw new Exception($"Xoá ảnh thất bại: {result.Result}");
            }
        }
    }
}
