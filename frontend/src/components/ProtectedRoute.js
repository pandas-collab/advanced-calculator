import React from "react";
import { useAuth } from "../hooks/useAuth.js";

export const ProtectedRoute = ({ children, redirectTo = "/login" }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // In a real app, this would use React Router's Navigate component
    // For now, we'll just show a message
    return (
      <div>
        <p>Please log in to access this page.</p>
        <p>Redirect to: {redirectTo}</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
