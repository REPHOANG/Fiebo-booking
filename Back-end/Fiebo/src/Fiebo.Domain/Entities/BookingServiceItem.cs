using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities;

public class BookingServiceItem
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public int VenueServiceItemId { get; set; }

    public int Quantity { get; set; }
    public decimal Price { get; set; }  
    public Booking Booking { get; set; } = null!;
    public VenueServiceItem VenueServiceItem { get; set; } = null!;
}