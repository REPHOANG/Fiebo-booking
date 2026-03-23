import { Navigate, useParams } from "react-router-dom";

/**
 * Route cũ `/event/:id/register` — chuyển về trang all-in-one `/event/:id`.
 */
const EventRegisterRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/event/${id}`} replace />;
};

export default EventRegisterRedirect;
