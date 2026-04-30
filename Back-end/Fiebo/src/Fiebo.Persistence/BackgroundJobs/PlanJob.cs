using Fiebo.Application.Interfaces;
using Fiebo.Domain.Enums;
using Fiebo.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MySqlConnector;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.BackgroundJobs
{
    public class PlanJob : IPlanJob
    {
        private readonly FieboDbContext _context;
        private readonly ILogger<PlanJob> _logger;

        public PlanJob(FieboDbContext context, ILogger<PlanJob> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task ExpireOwnerPlansAsync()
        {
            _logger.LogInformation("Starting PlanJob to expire owner plans...");
            var expired = (int)OwnerPlanStatus.Expired; // = 0
            var active = (int)OwnerPlanStatus.Active;   // = 1

            await _context.Database.ExecuteSqlRawAsync(@"
    UPDATE OwnerPlans
    SET Status = @expired
    WHERE EndDate < UTC_DATE()
      AND Status = @active
",
new MySqlParameter("@expired", expired),
new MySqlParameter("@active", active));
        }
    }
}
