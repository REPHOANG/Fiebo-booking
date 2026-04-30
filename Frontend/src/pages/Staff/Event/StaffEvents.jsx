import React from "react";
import OwnerEvents from "../../Owner/Event/OwnerEvents";
import { getStaffEvents } from "../../../services/staffService";

const StaffEvents = () => (
  <OwnerEvents
    showCreate={false}
    eventDetailBasePath="/staff/events"
    fetchEvents={getStaffEvents}
  />
);

export default StaffEvents;
