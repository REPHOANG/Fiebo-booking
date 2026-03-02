using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Enums
{
    public enum BookingStatus
    {
        Pending = 0,
        Booked = 1,
        Completed = 2,
        Expired = 3,
        Cancelled = 4,
    }
}
