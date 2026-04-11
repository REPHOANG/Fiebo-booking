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
    public class SportTypeRepository : Repository<SportType>, ISportTypeRepository
    {
        public SportTypeRepository(FieboDbContext context) : base(context)
        {
        }
        public void Add(SportType sportType)
        {
            _context.SportTypes.Add(sportType);
        }

        public async Task<SportType?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            return await _context.SportTypes
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }
        public void Update(SportType sportType)
        {
            _context.SportTypes.Update(sportType);
        }

        public async Task<bool> IsNameExistsAsync(string name, int? excludeId = null, CancellationToken cancellationToken = default)
        {
            var query = _context.SportTypes.Where(s => s.Name.ToLower() == name.ToLower());
            if (excludeId.HasValue)
            {
                query = query.Where(s => s.Id != excludeId.Value);
            }

            return await query.AnyAsync(cancellationToken);
        }
    }
}
