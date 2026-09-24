import api from "./api.js";
class AuthService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.tokenKey = 'authToken';
    this.refreshTokenKey = 'refreshToken';
    this.userKey = 'currentUser';
  }

  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      if (data.token) {
        this.setToken(data.token);
        if (data.refreshToken) {
          this.setRefreshToken(data.refreshToken);
        }
        if (data.user) {
          this.setUser(data.user);
        }
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      
      if (data.token) {
        this.setToken(data.token);
        if (data.refreshToken) {
          this.setRefreshToken(data.refreshToken);
        }
        if (data.user) {
          this.setUser(data.user);
        }
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      const token = this.getToken();
      
      if (token) {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      if (data.token) {
        this.setToken(data.token);
        if (data.refreshToken) {
          this.setRefreshToken(data.refreshToken);
        }
        if (data.user) {
          this.setUser(data.user);
        }
      }

      return data;
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  isTokenValid() {
    const token = this.getToken();
    
    if (!token) {
      return false;
    }

    try {
      const payload = this.parseJWT(token);
      const currentTime = Date.now() / 1000;
      
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  clearTokens() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.refreshTokenKey);
    sessionStorage.removeItem(this.userKey);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
  }

  setToken(token) {
    const storage = this.getPreferredStorage();
    storage.setItem(this.tokenKey, token);
  }

  getRefreshToken() {
    return localStorage.getItem(this.refreshTokenKey) || sessionStorage.getItem(this.refreshTokenKey);
  }

  setRefreshToken(refreshToken) {
    const storage = this.getPreferredStorage();
    storage.setItem(this.refreshTokenKey, refreshToken);
  }

  setUser(user) {
    const storage = this.getPreferredStorage();
    storage.setItem(this.userKey, JSON.stringify(user));
  }

  getPreferredStorage() {
    try {
      if (localStorage.getItem('rememberMe') === 'true') {
        return localStorage;
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
    return sessionStorage;
  }

  parseJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid token format');
    }
  }

  async makeAuthenticatedRequest(url, options = {}) {
    let token = this.getToken();
    
    if (!this.isTokenValid() && this.getRefreshToken()) {
      try {
        await this.refreshToken();
        token = this.getToken();
      } catch (error) {
        throw new Error('Authentication required');
      }
    }

    const authHeaders = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(url, {
      ...options,
      headers: authHeaders,
    });

    if (response.status === 401) {
      try {
        await this.refreshToken();
        const newToken = this.getToken();
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
          },
        });
      } catch (error) {
        this.clearTokens();
        throw new Error('Authentication required');
      }
    }

    return response;
  }
}

const authService = new AuthService();

export const login = (credentials) => authService.login(credentials);
export const register = (userData) => authService.register(userData);
export const logout = () => authService.logout();
export const refreshToken = () => authService.refreshToken();
export const getCurrentUser = () => authService.getCurrentUser();
export const isTokenValid = () => authService.isTokenValid();
export const clearTokens = () => authService.clearTokens();

export default authService;