using Fiebo.Application.DTOs.Address;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class AddressService : IAddressService
    {
        private readonly IUnitOfWork _unitOfWork;
        public AddressService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }
        public async Task<List<AddressListResponse>> GetWardByProvinceAsync(int provinceId)
        {
            return [.. (await _unitOfWork.Wards.FindAsync(w => w.ProvinceId == provinceId))
                .Select(w => new AddressListResponse
                {
                    Id = w.Id,
                    Name = w.Name
                })];
        }

        public async Task<List<AddressListResponse>> GetProvinceListsAsync()
        {
            return [.. (await _unitOfWork.Provinces.GetAllAsync())
                .Select(p => new AddressListResponse
                {
                    Id = p.Id,
                    Name = p.Name
                })];
        }
    }
}
