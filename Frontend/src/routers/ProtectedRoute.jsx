import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { OPEN_AUTH_STATE_KEY } from "../context/AuthModalContext";

const ProtectedRoute = ({ element, requiredRole }) => {
  const { isAuthenticated, user, profileLoading } = useSelector(
    (state) => state.auth,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <div style={{ display: "none" }} />;
  }
  if (profileLoading) {
    return null; // hoặc spinner
  }

  if (isAuthenticated && user) {
    if (requiredRole) {
      const roleVal = (user?.role || user?.roles || "").toString().toLowerCase();
      if (roleVal !== requiredRole.toString().toLowerCase()) {
        return <Navigate to="/" replace />;
      }
    }
    return element;
  }

  return (
    <Navigate to="/" replace state={{ [OPEN_AUTH_STATE_KEY]: "login" }} />
  );
};

export default ProtectedRoute;
