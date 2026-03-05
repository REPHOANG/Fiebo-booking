using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Repositories
{
    public class SportTypeRepository : Repository<SportType>, ISportTypeRepository
    {
        public SportTypeRepository(FieboDbContext context) : base(context)
        {
        }

        
    }
}
