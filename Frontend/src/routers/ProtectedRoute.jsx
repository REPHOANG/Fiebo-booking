import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { OPEN_AUTH_STATE_KEY } from "../context/AuthModalContext";
import { hasRole } from "../utils/roleUtils";

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
      if (!hasRole(user, requiredRole)) {
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
