using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Shared
{
    public class PagedResult<T>
    {
        public int Page { get; init; }
        public int PageSize { get; init; }
        public int TotalItems { get; init; }
        public int TotalPages =>
            (int)Math.Ceiling((double)TotalItems / PageSize);
        public IReadOnlyList<T> Items { get; init; } = [];
    }
}
