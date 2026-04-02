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
    public class FieldImageRepository : Repository<FieldImage>, IFieldImageRepository
    {
        public FieldImageRepository(FieboDbContext context) : base(context)
        {
        }
    }
}
