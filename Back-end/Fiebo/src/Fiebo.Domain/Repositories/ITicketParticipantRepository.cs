using Fiebo.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface ITicketParticipantRepository : IRepository<TicketParticipant>
    {
        Task<int> GetCurrentPlayer(int eventId);
        Task<TicketParticipant?> GetTicketDetailAsync(int participantId);
        Task<(List<TicketParticipant> Items, int TotalCount)> GetCustomerEventHistoryAsync(
            string userId,
            int pageIndex,
            int pageSize);
    }
}
