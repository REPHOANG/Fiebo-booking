import React from "react";
import OwnerBookings from "../../Owner/Booking/OwnerBookings";
import { getStaffBookings } from "../../../services/staffService";
import { getStaffVenues } from "../../../services/staffService";

const StaffBookings = () => (
  <OwnerBookings
    bookingDetailBasePath="/staff/bookings"
    fetchBookings={getStaffBookings}
    fetchVenues={getStaffVenues}
    isStaff={true}
  />
);

export default StaffBookings;
