using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IBookingDetailRepository : IRepository<BookingDetail>
    {
        public Task<Dictionary<int, int>> CountCompletedBookingByFieldsAsync(List<int> fieldIds);

        Task<int> CountCompletedBookingByVenueAsync(int venueId);
        Task<Dictionary<int, int>> CountCompletedBookingsByVenueAsync(List<int> venueId);
        Task<bool> IsSlotAvailable(int slotId, int fieldId, DateOnly bookingDate);
        Task AddBookingDetailsAsync(IEnumerable<BookingDetail> details);
        Task<BookingDetail?> GetEarliestDetailAsync(int bookingId);
        Task<bool> HasUpcomingBookingsForFieldAsync(int fieldId);

        Task<bool> HasUpcomingBookingsForVenueAsync(int venueId);
        Task<List<(int SlotId, int FieldId)>> GetUnavailableSlots(
            List<(int SlotId, int FieldId)> requestedSlots,
            DateOnly bookingDate);
    }
}
