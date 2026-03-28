using Fiebo.Application.DTOs.Address;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Interfaces
{
    public interface IAddressService
    {
        Task<List<AddressListResponse>> GetProvinceListsAsync();
        Task<List<AddressListResponse>> GetWardByProvinceAsync(int provinceId);
    }
}
