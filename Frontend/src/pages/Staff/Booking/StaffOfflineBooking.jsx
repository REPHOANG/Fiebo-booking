import React from "react";
import OwnerOfflineBooking from "../../Owner/Booking/OwnerOfflineBooking";
import { getStaffVenues } from "../../../services/staffService";

const StaffOfflineBooking = () => (
  <OwnerOfflineBooking
    venueOfflineBasePath="/staff/venues"
    createVenuePath={null}
    noVenueBackPath="/staff"
    fetchVenues={getStaffVenues}
  />
);

export default StaffOfflineBooking;
