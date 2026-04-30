using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Enums
{
    public enum PayoutStatus
    {
        Pending = 0,
        Processing = 1,
        Completed = 2,
        Failed = 3,
    }
}
