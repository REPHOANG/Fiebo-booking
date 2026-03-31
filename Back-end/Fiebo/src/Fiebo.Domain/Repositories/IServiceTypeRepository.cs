using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Fiebo.Domain.Entities;

namespace Fiebo.Domain.Repositories;

public interface IServiceTypeRepository
{
    Task<List<ServiceType>> GetAllAsync(CancellationToken cancellationToken = default);
}