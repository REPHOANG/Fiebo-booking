using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.Repositories
{
    public class WardRepository : Repository<Ward>, IWardRepository
    {
        public WardRepository(FieboDbContext context) : base(context)
        {
        }
    }
}
