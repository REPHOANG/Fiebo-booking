import React from "react";
import OwnerEventDetail from "../../Owner/Event/OwnerEventDetail";
import { getStaffEventDetail } from "../../../services/staffService";

const StaffEventDetail = () => (
  <OwnerEventDetail
    eventListPath="/staff/events"
    fetchEventFn={getStaffEventDetail}
    isStaff={true}
  />
);

export default StaffEventDetail;
