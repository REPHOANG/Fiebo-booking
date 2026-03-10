using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Fiebo.Application.Interfaces
{
    public interface ICloudinaryService
    {
        Task<string> UploadImageAsync(IFormFile file);
    }
}
