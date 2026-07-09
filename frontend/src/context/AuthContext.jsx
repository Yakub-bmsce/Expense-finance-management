import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Configure axios base defaults
const API_URL = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth session on boot
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get('/api/auth/me');
        setUser(response.data);
      } catch (err) {
        // Not logged in or expired token
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      setUser(res.data);
      // Fetch full details including room after login
      await checkAuthMe();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Register handler
  const register = async (email, password, fullName) => {
    setError(null);
    try {
      const res = await axios.post('/api/auth/register', { email, password, fullName });
      setUser(res.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Demo Login handler
  const demoLogin = async () => {
    setError(null);
    try {
      const res = await axios.post('/api/auth/demo');
      setUser(res.data);
      await checkAuthMe();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Demo login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      setUser(null);
    }
  };

  // Helper: check auth details
  const checkAuthMe = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error('Error checking auth', err);
    }
  };

  // Onboarding submit
  const submitOnboarding = async (onboardingData) => {
    setError(null);
    try {
      const res = await axios.post('/api/onboarding', onboardingData);
      setUser(res.data);
      await checkAuthMe();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Onboarding submit failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Create Room
  const createRoom = async (name) => {
    setError(null);
    try {
      const res = await axios.post('/api/rooms/create', { name });
      await checkAuthMe();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Create room failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Join Room
  const joinRoom = async (joinCode) => {
    setError(null);
    try {
      const res = await axios.post('/api/rooms/join', { joinCode });
      await checkAuthMe();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Join room failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Regenerate Join Code
  const regenerateJoinCode = async () => {
    try {
      await axios.post('/api/rooms/regenerate-code');
      await checkAuthMe();
    } catch (err) {
      const msg = err.response?.data?.message || 'Regenerating code failed';
      throw new Error(msg);
    }
  };

  // Evict member
  const removeMember = async (userIdToRemove) => {
    try {
      await axios.post('/api/rooms/remove-member', { userIdToRemove });
      await checkAuthMe();
    } catch (err) {
      const msg = err.response?.data?.message || 'Removing member failed';
      throw new Error(msg);
    }
  };

  // Leave room
  const leaveRoom = async () => {
    try {
      await axios.post('/api/rooms/leave');
      await checkAuthMe();
    } catch (err) {
      const msg = err.response?.data?.message || 'Leaving room failed';
      throw new Error(msg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        demoLogin,
        logout,
        submitOnboarding,
        createRoom,
        joinRoom,
        regenerateJoinCode,
        removeMember,
        leaveRoom,
        refreshUser: checkAuthMe
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
