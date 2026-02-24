using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Exceptions
{
    public class ResourceConflictException : Exception
    {
        public ResourceConflictException(string? message = "Tài nguyên đã tồn tại.")
           : base(message)
        {
        }
    }
}
