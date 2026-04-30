using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Repositories
{
    public class ReportRepository : Repository<Report>, IReportRepository
    {
        public ReportRepository(FieboDbContext context) : base(context) { }

        public async Task<IEnumerable<Report>> GetReportsWithDetailsAsync()
        {
            return await _context.Reports
                .Include(r => r.Booking)
                .Include(r => r.Venue)
                .OrderByDescending(r => r.CreatedAt) 
                .ToListAsync();
        }
    }
}
