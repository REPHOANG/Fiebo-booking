using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Common
{
    public class UploadImageResultDto
    {
        public string Url { get; set; } = default!;
        public string PublicId { get; set; } = default!;
    }
}
