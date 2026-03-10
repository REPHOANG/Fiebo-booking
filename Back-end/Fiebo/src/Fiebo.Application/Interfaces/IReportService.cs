using Fiebo.Application.DTOs.Report;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IReportService
    {
        Task<bool> CreateReportAsync(CreateReportRequest request, string userId);
    }
}
