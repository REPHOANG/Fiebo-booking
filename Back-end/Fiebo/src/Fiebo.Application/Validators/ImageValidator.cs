using Fiebo.Domain.Exceptions;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Validators
{
    public static class ImageValidator
    {
        public static void ValidateFiles(
            IEnumerable<IFormFile> files,
            int min = 1,
            int max = 5,
            long maxSizeInBytes = 5 * 1024 * 1024)
        {
            if (files == null)
                throw new BadRequestException($"Phải có ít nhất {min} ảnh");

            var fileList = files.ToList();

            if (fileList.Count < min || fileList.Count > max)
                throw new BadRequestException($"Số lượng ảnh phải từ {min} đến {max}");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".svg" };
            var allowedContentTypes = new[]
            {
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/webp",
                "image/svg+xml"
            };

            foreach (var file in fileList)
            {
                if (file.Length == 0)
                    throw new BadRequestException("Ảnh không hợp lệ");

                if (file.Length > maxSizeInBytes)
                    throw new BadRequestException($"Mỗi ảnh không được vượt quá {maxSizeInBytes / (1024 * 1024)}MB");

                var extension = Path.GetExtension(file.FileName).ToLower();

                if (!allowedExtensions.Contains(extension))
                    throw new BadRequestException("Chỉ chấp nhận ảnh jpg, jpeg, png, webp, svg");

                if (!allowedContentTypes.Contains(file.ContentType))
                    throw new BadRequestException("Định dạng ảnh không hợp lệ");
            }
        }
    }
}
