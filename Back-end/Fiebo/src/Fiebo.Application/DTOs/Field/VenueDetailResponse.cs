using Fiebo.Domain.DTOs.Field;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.DTOs.Field
{
    public class VenueDetailResponse
    {
        public VenueDetailDTO? Venue { get; set; }

        public List<FieldsDetailDTO>? Fields { get; set; }

    }
}
