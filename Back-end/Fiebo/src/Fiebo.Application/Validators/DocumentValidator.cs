using Fiebo.Application.DTOs.Venue;
using Fiebo.Domain.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Metadata;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Validators
{
    public static class DocumentValidator
    {
        public static void ValidateDocument(VenueDocumentDto doc, DateTime now, string name)
        {
            if (doc.IssueDate > now)
            {
                throw new BadRequestException($"{name}: Ngày cấp không được vượt quá ngày hiện tại");
            }

            if (doc.ExpiryDate <= now)
            {
                throw new BadRequestException($"{name}: Ngày hết hạn không được nhỏ hơn hoặc bằng ngày hiện tại");
            }

            if (doc.ExpiryDate <= doc.IssueDate)
            {
                throw new BadRequestException($"{name}: Ngày hết hạn phải sau ngày cấp");
            }
        }
    }
}
