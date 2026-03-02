using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class Booking : BaseEntity
    {
        public DateOnly BookingDate {  get; set; }
        public required string UserId { get; set; }
        public string? StaffId { get; set; }
        public decimal TotalPrice { get; set; }
        public BookingStatus Status { get; set; }

        public ICollection<BookingDetail> BookingDetails { get; set; } = [];
    }
}
