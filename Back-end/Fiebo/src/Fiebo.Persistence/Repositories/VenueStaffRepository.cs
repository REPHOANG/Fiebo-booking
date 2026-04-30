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
    public class VenueStaffRepository : Repository<VenueStaff>, IVenueStaffRepository
    {
        public VenueStaffRepository(FieboDbContext context) : base(context)
        {
        }

        public async Task<List<Venue>> GetVenuesByStaffIdAsync(string staffId)
        {
            return await _context.VenueStaff.Where(vs => vs.StaffId == staffId)
                .AsNoTracking()
                .Include(vs => vs.Venue)
                .ThenInclude(v => v.Province)
                .Include(vs => vs.Venue)
                .ThenInclude(v => v.Ward)
                .Select(vs => vs.Venue)
                .ToListAsync();
        }
    }
}
