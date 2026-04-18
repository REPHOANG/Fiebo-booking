import React from "react";
import OwnerOfflineBooking from "../../Owner/Booking/OwnerOfflineBooking";

const StaffOfflineBooking = () => (
  <OwnerOfflineBooking
    venueOfflineBasePath="/staff/venues"
    createVenuePath={null}
    noVenueBackPath="/staff"
  />
);

export default StaffOfflineBooking;
