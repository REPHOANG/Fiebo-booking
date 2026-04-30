using Fiebo.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface ISportTypeRepository : IRepository<SportType>
    {
        void Add(SportType sportType);
        Task<SportType?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
        void Update(SportType sportType);
        Task<bool> IsNameExistsAsync(string name, int? excludeId = null, CancellationToken cancellationToken = default);
    }
}
