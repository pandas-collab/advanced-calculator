import { useState, useEffect } from 'react';

const MOCK_USER = {
  email: 'demo@calculator.com',
  password: 'demo123',
  name: 'Demo User'
};

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setUser(MOCK_USER);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    if (email === MOCK_USER.email && password === MOCK_USER.password) {
      const mockToken = 'mock_jwt_token_' + Date.now();
      localStorage.setItem('auth_token', mockToken);
      setUser(MOCK_USER);
      return Promise.resolve();
    } else {
      return Promise.reject(new Error('Invalid credentials'));
    }
  };

  const register = async (name, email, password) => {
    const mockToken = 'mock_jwt_token_' + Date.now();
    localStorage.setItem('auth_token', mockToken);
    const newUser = { name, email };
    setUser(newUser);
    return Promise.resolve();
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    register,
    logout
  };
};

export default useAuth;
