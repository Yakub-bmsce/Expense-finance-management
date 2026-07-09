import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Configure axios base defaults
const API_URL = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

// Proactively run in mock mode if hosted on a remote server (like Vercel) without VITE_API_URL configured
const isMockMode = !import.meta.env.VITE_API_URL && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth session on boot
  useEffect(() => {
    const checkSession = async () => {
      if (isMockMode) {
        console.log('🌴 Running in static Mock Mode on Vercel (Local Storage)');
        const savedUser = localStorage.getItem('fs_user');
        setUser(savedUser ? JSON.parse(savedUser) : null);
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('/api/auth/me');
        setUser(response.data);
      } catch (err) {
        const savedUser = localStorage.getItem('fs_user');
        if (savedUser) {
          console.warn('⚠️ Server check failed. Loading local session fallback.');
          setUser(JSON.parse(savedUser));
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    
    if (isMockMode) {
      const mockUser = {
        id: 'mock-user-id',
        email: email.toLowerCase(),
        full_name: email.split('@')[0],
        onboarded: false,
        room: null
      };
      localStorage.setItem('fs_user', JSON.stringify(mockUser));
      setUser(mockUser);
      return mockUser;
    }

    try {
      const res = await axios.post('/api/auth/login', { email, password });
      setUser(res.data);
      await checkAuthMe();
      return res.data;
    } catch (err) {
      // Local client-only mock fallback if local server is down
      if (!err.response || err.response.status === 404 || err.response.status === 405) {
        const mockUser = {
          id: 'mock-user-id',
          email: email.toLowerCase(),
          full_name: email.split('@')[0],
          onboarded: false,
          room: null
        };
        localStorage.setItem('fs_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return mockUser;
      }
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Register handler
  const register = async (email, password, fullName) => {
    setError(null);

    if (isMockMode) {
      const mockUser = {
        id: 'mock-user-id-' + Date.now(),
        email: email.toLowerCase(),
        full_name: fullName,
        onboarded: false,
        room: null
      };
      localStorage.setItem('fs_user', JSON.stringify(mockUser));
      setUser(mockUser);
      return mockUser;
    }

    try {
      const res = await axios.post('/api/auth/register', { email, password, fullName });
      setUser(res.data);
      return res.data;
    } catch (err) {
      if (!err.response || err.response.status === 404 || err.response.status === 405) {
        const mockUser = {
          id: 'mock-user-id-' + Date.now(),
          email: email.toLowerCase(),
          full_name: fullName,
          onboarded: false,
          room: null
        };
        localStorage.setItem('fs_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return mockUser;
      }
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Demo Login handler
  const demoLogin = async () => {
    setError(null);

    if (isMockMode) {
      const demoUser = {
        id: 'd3b07384-d113-4ec9-a2e6-a241e73722a4',
        email: 'demo@flatsplit.pro',
        full_name: 'Alex Mercer',
        gender: 'Male',
        age: 22,
        college: 'State University',
        mobile: '+1555123456',
        living_type: 'bachelor',
        living_details: { pg_hostel_flat: 'flat', rooms: '3' },
        onboarded: true,
        room: {
          id: 'e4b07384-d113-4ec9-a2e6-a241e73722a5',
          name: 'Flat 404',
          join_code: 'FLATSPLIT99',
          role: 'admin',
          members: [
            { id: 'd3b07384-d113-4ec9-a2e6-a241e73722a4', email: 'demo@flatsplit.pro', full_name: 'Alex Mercer', role: 'admin' },
            { id: 'mock-member-1', email: 'jordan@flatsplit.pro', full_name: 'Jordan Lee', role: 'member' },
            { id: 'mock-member-2', email: 'sam@flatsplit.pro', full_name: 'Sam Smith', role: 'member' }
          ]
        }
      };
      localStorage.setItem('fs_user', JSON.stringify(demoUser));
      setUser(demoUser);
      return demoUser;
    }

    try {
      const res = await axios.post('/api/auth/demo');
      setUser(res.data);
      await checkAuthMe();
      return res.data;
    } catch (err) {
      if (!err.response || err.response.status === 404 || err.response.status === 405) {
        const demoUser = {
          id: 'd3b07384-d113-4ec9-a2e6-a241e73722a4',
          email: 'demo@flatsplit.pro',
          full_name: 'Alex Mercer',
          gender: 'Male',
          age: 22,
          college: 'State University',
          mobile: '+1555123456',
          living_type: 'bachelor',
          living_details: { pg_hostel_flat: 'flat', rooms: '3' },
          onboarded: true,
          room: {
            id: 'e4b07384-d113-4ec9-a2e6-a241e73722a5',
            name: 'Flat 404',
            join_code: 'FLATSPLIT99',
            role: 'admin',
            members: [
              { id: 'd3b07384-d113-4ec9-a2e6-a241e73722a4', email: 'demo@flatsplit.pro', full_name: 'Alex Mercer', role: 'admin' },
              { id: 'mock-member-1', email: 'jordan@flatsplit.pro', full_name: 'Jordan Lee', role: 'member' },
              { id: 'mock-member-2', email: 'sam@flatsplit.pro', full_name: 'Sam Smith', role: 'member' }
            ]
          }
        };
        localStorage.setItem('fs_user', JSON.stringify(demoUser));
        setUser(demoUser);
        return demoUser;
      }
      const msg = err.response?.data?.message || 'Demo login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Logout handler
  const logout = async () => {
    if (isMockMode) {
      localStorage.removeItem('fs_user');
      setUser(null);
      return;
    }

    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.warn('Server logout failed, clearing local session.');
    } finally {
      localStorage.removeItem('fs_user');
      setUser(null);
    }
  };

  // Helper: check auth details
  const checkAuthMe = async () => {
    if (isMockMode) {
      const savedUser = localStorage.getItem('fs_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      return;
    }

    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data);
    } catch (err) {
      const savedUser = localStorage.getItem('fs_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  };

  // Onboarding submit
  const submitOnboarding = async (onboardingData) => {
    setError(null);

    if (isMockMode) {
      const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
      const updatedUser = {
        ...currentUser,
        full_name: onboardingData.fullName,
        gender: onboardingData.gender,
        age: onboardingData.age,
        college: onboardingData.college,
        mobile: onboardingData.mobile,
        living_type: onboardingData.livingType,
        living_details: onboardingData.livingDetails,
        onboarded: true
      };
      localStorage.setItem('fs_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    }

    try {
      const res = await axios.post('/api/onboarding', onboardingData);
      setUser(res.data);
      await checkAuthMe();
      return res.data;
    } catch (err) {
      if (!err.response || err.response.status === 404 || err.response.status === 405) {
        const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
        const updatedUser = {
          ...currentUser,
          full_name: onboardingData.fullName,
          gender: onboardingData.gender,
          age: onboardingData.age,
          college: onboardingData.college,
          mobile: onboardingData.mobile,
          living_type: onboardingData.livingType,
          living_details: onboardingData.livingDetails,
          onboarded: true
        };
        localStorage.setItem('fs_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return updatedUser;
      }
      const msg = err.response?.data?.message || 'Onboarding submit failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Create Room
  const createRoom = async (name) => {
    setError(null);

    if (isMockMode) {
      const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
      const mockRoom = {
        id: 'mock-room-id-' + Date.now(),
        name,
        join_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        role: 'admin',
        members: [
          { id: currentUser.id, email: currentUser.email, full_name: currentUser.full_name, role: 'admin' }
        ]
      };
      const updatedUser = {
        ...currentUser,
        room: mockRoom
      };
      localStorage.setItem('fs_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return mockRoom;
    }

    try {
      const res = await axios.post('/api/rooms/create', { name });
      await checkAuthMe();
      return res.data;
    } catch (err) {
      if (!err.response || err.response.status === 404 || err.response.status === 405) {
        const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
        const mockRoom = {
          id: 'mock-room-id-' + Date.now(),
          name,
          join_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
          role: 'admin',
          members: [
            { id: currentUser.id, email: currentUser.email, full_name: currentUser.full_name, role: 'admin' }
          ]
        };
        const updatedUser = {
          ...currentUser,
          room: mockRoom
        };
        localStorage.setItem('fs_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return mockRoom;
      }
      const msg = err.response?.data?.message || 'Create room failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Join Room
  const joinRoom = async (joinCode) => {
    setError(null);

    if (isMockMode) {
      const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
      const mockRoom = {
        id: 'mock-room-id-joined',
        name: 'Flatmates Shared Flat',
        join_code: joinCode.toUpperCase(),
        role: 'member',
        members: [
          { id: 'mock-admin-id', email: 'admin@flatsplit.pro', full_name: 'Host Admin', role: 'admin' },
          { id: currentUser.id, email: currentUser.email, full_name: currentUser.full_name, role: 'member' }
        ]
      };
      const updatedUser = {
        ...currentUser,
        room: mockRoom
      };
      localStorage.setItem('fs_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return mockRoom;
    }

    try {
      const res = await axios.post('/api/rooms/join', { joinCode });
      await checkAuthMe();
      return res.data;
    } catch (err) {
      if (!err.response || err.response.status === 404 || err.response.status === 405) {
        const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
        const mockRoom = {
          id: 'mock-room-id-joined',
          name: 'Flatmates Shared Flat',
          join_code: joinCode.toUpperCase(),
          role: 'member',
          members: [
            { id: 'mock-admin-id', email: 'admin@flatsplit.pro', full_name: 'Host Admin', role: 'admin' },
            { id: currentUser.id, email: currentUser.email, full_name: currentUser.full_name, role: 'member' }
          ]
        };
        const updatedUser = {
          ...currentUser,
          room: mockRoom
        };
        localStorage.setItem('fs_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return mockRoom;
      }
      const msg = err.response?.data?.message || 'Join room failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Regenerate Join Code
  const regenerateJoinCode = async () => {
    if (isMockMode) {
      const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
      if (currentUser.room) {
        currentUser.room.join_code = Math.random().toString(36).substring(2, 10).toUpperCase();
        localStorage.setItem('fs_user', JSON.stringify(currentUser));
        setUser({ ...currentUser });
      }
      return;
    }

    try {
      await axios.post('/api/rooms/regenerate-code');
      await checkAuthMe();
    } catch (err) {
      if (!err.response || err.response.status === 404 || err.response.status === 405) {
        const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
        if (currentUser.room) {
          currentUser.room.join_code = Math.random().toString(36).substring(2, 10).toUpperCase();
          localStorage.setItem('fs_user', JSON.stringify(currentUser));
          setUser({ ...currentUser });
        }
      } else {
        const msg = err.response?.data?.message || 'Regenerating code failed';
        throw new Error(msg);
      }
    }
  };

  // Evict member
  const removeMember = async (userIdToRemove) => {
    if (isMockMode) {
      const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
      if (currentUser.room) {
        currentUser.room.members = currentUser.room.members.filter(m => m.id !== userIdToRemove);
        localStorage.setItem('fs_user', JSON.stringify(currentUser));
        setUser({ ...currentUser });
      }
      return;
    }

    try {
      await axios.post('/api/rooms/remove-member', { userIdToRemove });
      await checkAuthMe();
    } catch (err) {
      if (!err.response || err.response.status === 404 || err.response.status === 405) {
        const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
        if (currentUser.room) {
          currentUser.room.members = currentUser.room.members.filter(m => m.id !== userIdToRemove);
          localStorage.setItem('fs_user', JSON.stringify(currentUser));
          setUser({ ...currentUser });
        }
      } else {
        const msg = err.response?.data?.message || 'Removing member failed';
        throw new Error(msg);
      }
    }
  };

  // Leave room
  const leaveRoom = async () => {
    if (isMockMode) {
      const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
      const updatedUser = {
        ...currentUser,
        room: null
      };
      localStorage.setItem('fs_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return;
    }

    try {
      await axios.post('/api/rooms/leave');
      await checkAuthMe();
    } catch (err) {
      if (!err.response || err.response.status === 404 || err.response.status === 405) {
        const currentUser = JSON.parse(localStorage.getItem('fs_user') || '{}');
        const updatedUser = {
          ...currentUser,
          room: null
        };
        localStorage.setItem('fs_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        const msg = err.response?.data?.message || 'Leaving room failed';
        throw new Error(msg);
      }
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
