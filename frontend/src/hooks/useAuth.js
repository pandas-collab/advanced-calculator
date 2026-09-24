import { login as authLogin, logout as authLogout, getProfile } from "../services/authService.js";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const { user, isAuthenticated, loading } = context;

  const login = async (credentials) => {
    try {
      const response = await authLogin(credentials);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getUserProfile = async () => {
    try {
      return await getProfile();
    } catch (error) {
      throw error;
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    getUserProfile
  };
};
