import React from "react";
import OwnerBookingDetail from "../../Owner/Booking/OwnerBookingDetail";
import { getStaffBookingDetail } from "../../../services/staffService";

const StaffBookingDetail = () => (
  <OwnerBookingDetail
    bookingsListPath="/staff/bookings"
    fetchDetailFn={getStaffBookingDetail}
    isStaff={true}
  />
);

export default StaffBookingDetail;
