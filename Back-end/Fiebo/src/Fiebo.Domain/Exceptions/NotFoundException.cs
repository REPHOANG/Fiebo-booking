using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Exceptions
{
    public class NotFoundException : Exception
    {
        public NotFoundException(string? message = "Tài nguyên không tồn tại")
           : base(message)
        {
        }
    }
}
