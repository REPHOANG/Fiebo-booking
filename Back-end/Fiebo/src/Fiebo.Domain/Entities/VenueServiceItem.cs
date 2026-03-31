using System;
using System.Collections.Generic;

namespace Fiebo.Domain.Entities;

public class VenueServiceItem : BaseEntity
{
    public int VenueId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string ServiceType { get; set; } = null!;
    public string? ImageUrl { get; set; }
    public bool IsDeleted { get; set; } = false;

    public virtual Venue Venue { get; set; } = null!;
    public ICollection<BookingServiceItem> BookingServiceItems { get; set; } = [];
}