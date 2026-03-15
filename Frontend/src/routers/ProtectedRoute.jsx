import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ element }) => {
  const { isAuthenticated, user, profileLoading } = useSelector(
    (state) => state.auth,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after Redux is ready
    setIsHydrated(true);
  }, []);

  console.log("🔐 ProtectedRoute:", {
    isAuthenticated,
    userExists: !!user,
    isHydrated,
  });

  // Wait for hydration
  if (!isHydrated) {
    return <div style={{ display: "none" }} />;
  }
  if (profileLoading) {
    return null; // hoặc spinner
  }

  // Check Redux state
  if (isAuthenticated && user) {
    console.log("✅ Access granted to", user.email);
    return element;
  }

  // Not authenticated
  console.log("Access denied, redirecting to login");
  return <Navigate to="/" replace />;
};

export default ProtectedRoute;
