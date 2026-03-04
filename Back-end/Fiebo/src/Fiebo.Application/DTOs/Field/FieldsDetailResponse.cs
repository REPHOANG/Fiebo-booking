using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Field
{
    public class FieldsDetailResponse
    {
        public int Page {  get; set; }
        public int PageSize { get; set; }
        public List<FieldsDetailDTO> Fields { get; set; } = [];
    }
}
