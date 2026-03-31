using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;

namespace Fiebo.Persistence.Repositories;

public class ServiceTypeRepository : IServiceTypeRepository
{
    private readonly FieboDbContext _context;

    public ServiceTypeRepository(FieboDbContext context)
    {
        _context = context;
    }

    public async Task<List<ServiceType>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.ServiceTypes
            .AsNoTracking() 
            .ToListAsync(cancellationToken);
    }
}