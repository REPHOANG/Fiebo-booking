using Fiebo.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Persistence.QuerySort
{
    public static class ReviewSortMap
    {
        public static readonly Dictionary<string,
            Func<IQueryable<Review>, IOrderedQueryable<Review>>> Map
            = new()
            {
                ["rating:asc"] =
                q => q.OrderBy(x => x.Rating),

                ["rating:desc"] =
                q => q.OrderByDescending(x => x.Rating),

                ["createdAt:asc"] =
                q => q.OrderBy(x => x.CreatedAt),

                ["createdAt:desc"] =
                q => q.OrderByDescending(x => x.CreatedAt)
            };
    }
}
