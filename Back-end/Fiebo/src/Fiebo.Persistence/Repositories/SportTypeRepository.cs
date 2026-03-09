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

        
    }
}
