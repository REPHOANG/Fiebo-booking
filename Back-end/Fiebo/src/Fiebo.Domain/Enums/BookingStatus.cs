using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Enums
{
    public enum BookingStatus
    {
        Holding = 0,          // Đang giữ slot (5 phút), chờ thanh toán
        Booked = 1,           // Chủ sân đã xác nhận
        Completed = 2,
        OwnerCancelled = 3,
        CustomerCancelled = 4,
        Expired = 5,
        Pending = 6,          // Đã thanh toán, chờ chủ sân xác nhận
        Rejected = 7          // Chủ sân hoặc hệ thống tự từ chối
    }
}
