using Fiebo.Domain.DTOs.Field;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Repositories;
using Fiebo.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Infrastructure.Repositories
{
    public class FieldRepository : Repository<Field>, IFieldRepository
    {
        public FieldRepository(FieboDbContext context) : base(context)
        {

        }

        public async Task<List<FieldsDetailDTO>> GetFieldsByVenue(int venueId)
        {
            return await _context.Fields
                .Where(f => f.VenueId == venueId && f.Status == FieldStatus.Active)
                .Select(f => new FieldsDetailDTO
                {
                    Name = f.Name,
                    AverageRating = f.BookingDetails
                                     .SelectMany(b => b.Reviews)
                                     .Average(r => (double?)r.Rating) ?? 0,
                    Description = f.Description,
                    SportType = f.SportType!.Name,
                    Images = f.Images.Select(i => i.ImageUrl).ToList(),
                    Reviews = f.BookingDetails.SelectMany(b => b.Reviews)
                                              .Join(_context.Users,
                                              r => r.UserId, u => u.Id, (r, u) => new ReviewDTO
                                              {
                                                  Name = u.FullName,
                                                  Rating = r.Rating,
                                                  Comment = r.Comment
                                              }).ToList(),
                }).ToListAsync();
        }
    }
}
