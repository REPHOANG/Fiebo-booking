using Fiebo.Application.DTOs.Common;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface ICloudinaryService
    {
        Task<UploadImageResultDto> UploadImageAsync(IFormFile file);
        Task DeleteImageAsync(string publicId);
    }
}
