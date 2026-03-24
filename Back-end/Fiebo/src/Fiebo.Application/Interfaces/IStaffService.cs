using Fiebo.Application.DTOs.Owner;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IStaffService
    {
        Task<List<OwnerStaffListResponse>> GetOwnerStaffListAsync(string ownerId);
        Task<bool> CreateStaffAsync(string ownerId, OwnerCreateStaffRequest request);
        Task<bool> DeactivateStaffAsync(string ownerId, string staffId);
    }
}
