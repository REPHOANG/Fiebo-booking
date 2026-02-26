import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ element }) => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const user = useSelector((state) => state.auth.user);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after Redux is ready
    setIsHydrated(true);
  }, []);

  console.log('🔐 ProtectedRoute:', { isAuthenticated, userExists: !!user, isHydrated });

  // Wait for hydration
  if (!isHydrated) {
    return <div style={{ display: 'none' }} />;
  }

  // Check Redux state
  if (isAuthenticated && user) {
    console.log('✅ Access granted to', user.email);
    return element;
  }

  // Fallback to localStorage if Redux shows unauthenticated
  try {
    const authState = localStorage.getItem('authState');
    if (authState) {
      const parsed = JSON.parse(authState);
      if (parsed.isAuthenticated && parsed.user) {
        console.log('✅ Access granted via localStorage:', parsed.user.email);
        return element;
      }
    }
  } catch (error) {
    console.error('Failed to check localStorage:', error);
  }

  // Not authenticated
  console.log('❌ Access denied, redirecting to login');
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
