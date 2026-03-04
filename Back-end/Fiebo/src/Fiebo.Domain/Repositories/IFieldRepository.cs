using Fiebo.Domain.DTOs.Field;
using Fiebo.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Repositories
{
    public interface IFieldRepository : IRepository<Field>
    {
        Task<List<FieldsDetailDTO>> GetFieldsByVenue(int venueId);
    }
}
