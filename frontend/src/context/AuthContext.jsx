import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Configure axios base defaults
const API_URL = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

// Proactively run in mock mode if hosted on a remote server (like Vercel) without VITE_API_URL configured
const isMockMode = !import.meta.env.VITE_API_URL && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

const AuthContext = createContext(null);

// Safe LocalStorage Parser Helper to prevent crashes from corrupted JSON
const safeGetItem = (key, defaultValue = null) => {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === 'undefined') return defaultValue;
    return JSON.parse(val);
  } catch (e) {
    console.warn(`⚠️ Failed to parse localStorage key "${key}":`, e);
    // Remove broken key to heal client state
    localStorage.removeItem(key);
    return defaultValue;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Phase 2 State
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({ balances: [], suggestedPayments: [] });
  
  // Phase 3 State
  const [subscriptions, setSubscriptions] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check auth session on boot
  useEffect(() => {
    const checkSession = async () => {
      if (isMockMode) {
        console.log('🌴 Running in static Mock Mode on Vercel (Local Storage)');
        const parsed = safeGetItem('fs_user', null);
        if (parsed) {
          setUser(parsed);
          seedMockExpensesIfEmpty(parsed);
          seedMockSubscriptionsIfEmpty(parsed);
          seedMockNotificationsIfEmpty(parsed);
        } else {
          setUser(null);
        }
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('/api/auth/me');
        setUser(response.data);
      } catch (err) {
        const parsed = safeGetItem('fs_user', null);
        if (parsed) {
          console.warn('⚠️ Server check failed. Loading local session fallback.');
          setUser(parsed);
          seedMockExpensesIfEmpty(parsed);
          seedMockSubscriptionsIfEmpty(parsed);
          seedMockNotificationsIfEmpty(parsed);
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // Fetch expenses, balances, subscriptions, notifications
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        await getExpenses();
        await getBalances();
        await getSubscriptions();
        await getNotifications();
      } catch (err) {
        console.error('Error auto-fetching dashboard data:', err);
      }
    };
    
    fetchData();
  }, [user, refreshTrigger]);

  // Seed mock expenses for the demo user if they don't exist yet in localStorage
  const seedMockExpensesIfEmpty = (currentUser) => {
    if (!currentUser || !currentUser.room) return;
    const existing = localStorage.getItem('fs_expenses');
    if (!existing) {
      const demoRoomId = currentUser.room.id;
      const demoUserId = currentUser.id;
      
      const mockExpenses = [
        {
          id: 'demo-exp-1',
          room_id: demoRoomId,
          payer_id: 'mock-member-1', // Jordan Lee
          payer_name: 'Jordan Lee',
          description: 'Organic Groceries & Fruits',
          amount: 45.00,
          category: 'groceries',
          receipt_url: null,
          is_private: false,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          splits: [
            { id: 'ds-1', user_id: demoUserId, user_name: 'Alex Mercer', share_amount: 15.00 },
            { id: 'ds-2', user_id: 'mock-member-1', user_name: 'Jordan Lee', share_amount: 15.00 },
            { id: 'ds-3', user_id: 'mock-member-2', user_name: 'Sam Smith', share_amount: 15.00 }
          ]
        },
        {
          id: 'demo-exp-2',
          room_id: demoRoomId,
          payer_id: demoUserId, // Alex Mercer
          payer_name: 'Alex Mercer',
          description: 'Electricity & Gas Bills',
          amount: 120.00,
          category: 'utilities',
          receipt_url: null,
          is_private: false,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          splits: [
            { id: 'ds-4', user_id: demoUserId, user_name: 'Alex Mercer', share_amount: 40.00 },
            { id: 'ds-5', user_id: 'mock-member-1', user_name: 'Jordan Lee', share_amount: 40.00 },
            { id: 'ds-6', user_id: 'mock-member-2', user_name: 'Sam Smith', share_amount: 40.00 }
          ]
        },
        {
          id: 'demo-exp-3',
          room_id: demoRoomId,
          payer_id: 'mock-member-2', // Sam Smith
          payer_name: 'Sam Smith',
          description: 'Monthly Apartment Rent',
          amount: 900.00,
          category: 'rent',
          receipt_url: null,
          is_private: false,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          splits: [
            { id: 'ds-7', user_id: demoUserId, user_name: 'Alex Mercer', share_amount: 300.00 },
            { id: 'ds-8', user_id: 'mock-member-1', user_name: 'Jordan Lee', share_amount: 300.00 },
            { id: 'ds-9', user_id: 'mock-member-2', user_name: 'Sam Smith', share_amount: 300.00 }
          ]
        },
        {
          id: 'demo-exp-4',
          room_id: demoRoomId,
          payer_id: 'mock-member-1', // Jordan Lee
          payer_name: 'Jordan Lee',
          description: 'Weekend Pizza Night',
          amount: 60.00,
          category: 'entertainment',
          receipt_url: null,
          is_private: false,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          splits: [
            { id: 'ds-10', user_id: demoUserId, user_name: 'Alex Mercer', share_amount: 20.00 },
            { id: 'ds-11', user_id: 'mock-member-1', user_name: 'Jordan Lee', share_amount: 20.00 },
            { id: 'ds-12', user_id: 'mock-member-2', user_name: 'Sam Smith', share_amount: 20.00 }
          ]
        }
      ];
      localStorage.setItem('fs_expenses', JSON.stringify(mockExpenses));
    }
  };

  // Seed mock subscriptions for the demo user
  const seedMockSubscriptionsIfEmpty = (currentUser) => {
    if (!currentUser || !currentUser.room) return;
    const existing = localStorage.getItem('fs_subscriptions');
    if (!existing) {
      const demoRoomId = currentUser.room.id;
      const demoUserId = currentUser.id;
      
      const mockSubscriptions = [
        {
          id: 'demo-sub-1',
          room_id: demoRoomId,
          payer_id: demoUserId,
          payer_name: 'Alex Mercer',
          name: 'Netflix Premium 4K',
          amount: 22.99,
          category: 'entertainment',
          billing_cycle: 'monthly',
          next_billing_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-sub-2',
          room_id: demoRoomId,
          payer_id: 'mock-member-1', // Jordan Lee
          payer_name: 'Jordan Lee',
          name: 'Gigabit Fiber WiFi',
          amount: 65.00,
          category: 'utilities',
          billing_cycle: 'monthly',
          next_billing_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('fs_subscriptions', JSON.stringify(mockSubscriptions));
    }
  };

  // Seed mock notifications for the demo user
  const seedMockNotificationsIfEmpty = (currentUser) => {
    if (!currentUser) return;
    const existing = localStorage.getItem('fs_notifications');
    if (!existing) {
      const mockNotifications = [
        {
          id: 'demo-notify-1',
          user_id: currentUser.id,
          room_id: currentUser.room?.id || null,
          title: 'Welcome to FlatSplit Pro!',
          message: 'Get started by inviting your roommates or logging a bill to track splits.',
          type: 'system',
          is_read: false,
          created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'demo-notify-2',
          user_id: currentUser.id,
          room_id: currentUser.room?.id || null,
          title: 'New Bill Logged',
          message: 'Jordan Lee logged a bill: "Organic Groceries & Fruits" ($45.00)',
          type: 'bill_added',
          is_read: false,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      localStorage.setItem('fs_notifications', JSON.stringify(mockNotifications));
    }
  };

  // Helper: check auth details
  const checkAuthMe = async () => {
    if (isMockMode) {
      const parsed = safeGetItem('fs_user', null);
      if (parsed) {
        setUser(parsed);
      }
      return;
    }

    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data);
    } catch (err) {
      const parsed = safeGetItem('fs_user', null);
      if (parsed) {
        setUser(parsed);
      }
    }
  };

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
      seedMockExpensesIfEmpty(demoUser);
      seedMockSubscriptionsIfEmpty(demoUser);
      seedMockNotificationsIfEmpty(demoUser);
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
        seedMockExpensesIfEmpty(demoUser);
        seedMockSubscriptionsIfEmpty(demoUser);
        seedMockNotificationsIfEmpty(demoUser);
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
      localStorage.removeItem('fs_expenses');
      localStorage.removeItem('fs_subscriptions');
      localStorage.removeItem('fs_notifications');
      setUser(null);
      setExpenses([]);
      setBalances({ balances: [], suggestedPayments: [] });
      setSubscriptions([]);
      setNotifications([]);
      return;
    }

    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.warn('Server logout failed, clearing local session.');
    } finally {
      localStorage.removeItem('fs_user');
      localStorage.removeItem('fs_expenses');
      localStorage.removeItem('fs_subscriptions');
      localStorage.removeItem('fs_notifications');
      setUser(null);
      setExpenses([]);
      setBalances({ balances: [], suggestedPayments: [] });
      setSubscriptions([]);
      setNotifications([]);
    }
  };

  // Onboarding submit
  const submitOnboarding = async (onboardingData) => {
    setError(null);

    if (isMockMode) {
      const currentUser = safeGetItem('fs_user', {});
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
        const currentUser = safeGetItem('fs_user', {});
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
      const currentUser = safeGetItem('fs_user', {});
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
        const currentUser = safeGetItem('fs_user', {});
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
      const currentUser = safeGetItem('fs_user', {});
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
        const currentUser = safeGetItem('fs_user', {});
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
      const currentUser = safeGetItem('fs_user', {});
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
        const currentUser = safeGetItem('fs_user', {});
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
    if (balances && balances.balances) {
      const targetBal = balances.balances.find(b => b.userId === userIdToRemove);
      if (targetBal && Math.abs(targetBal.netBalance) > 0.01) {
        throw new Error(`Member eviction blocked: this roommate has active unsettled balances ($${targetBal.netBalance.toFixed(2)}).`);
      }
    }

    if (isMockMode) {
      const currentUser = safeGetItem('fs_user', {});
      if (currentUser.room) {
        currentUser.room.members = currentUser.room.members.filter(m => m.id !== userIdToRemove);
        localStorage.setItem('fs_user', JSON.stringify(currentUser));
        setUser({ ...currentUser });
        setRefreshTrigger(p => p + 1);
      }
      return;
    }

    try {
      await axios.post('/api/rooms/remove-member', { userIdToRemove });
      await checkAuthMe();
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      if (!err.response || err.response.status === 404 || err.response.status === 405) {
        const currentUser = safeGetItem('fs_user', {});
        if (currentUser.room) {
          currentUser.room.members = currentUser.room.members.filter(m => m.id !== userIdToRemove);
          localStorage.setItem('fs_user', JSON.stringify(currentUser));
          setUser({ ...currentUser });
          setRefreshTrigger(p => p + 1);
        }
      } else {
        const msg = err.response?.data?.message || 'Removing member failed';
        throw new Error(msg);
      }
    }
  };

  // Leave room
  const leaveRoom = async () => {
    if (balances && balances.balances && user) {
      const myBal = balances.balances.find(b => b.userId === user.id);
      if (myBal && Math.abs(myBal.netBalance) > 0.01) {
        throw new Error(`Leave room blocked: you have active unsettled balances ($${myBal.netBalance.toFixed(2)}). Please settle first.`);
      }
    }

    if (isMockMode) {
      const currentUser = safeGetItem('fs_user', {});
      const updatedUser = {
        ...currentUser,
        room: null
      };
      localStorage.setItem('fs_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setExpenses([]);
      setBalances({ balances: [], suggestedPayments: [] });
      setSubscriptions([]);
      setNotifications([]);
      return;
    }

    try {
      await axios.post('/api/rooms/leave');
      await checkAuthMe();
      setExpenses([]);
      setBalances({ balances: [], suggestedPayments: [] });
      setSubscriptions([]);
      setNotifications([]);
    } catch (err) {
      if (!err.response || err.response.status === 404 || err.response.status === 405) {
        const currentUser = safeGetItem('fs_user', {});
        const updatedUser = {
          ...currentUser,
          room: null
        };
        localStorage.setItem('fs_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setExpenses([]);
        setBalances({ balances: [], suggestedPayments: [] });
        setSubscriptions([]);
        setNotifications([]);
      } else {
        const msg = err.response?.data?.message || 'Leaving room failed';
        throw new Error(msg);
      }
    }
  };

  // ==========================================
  // PHASE 2 ACTIONS
  // ==========================================

  const getExpenses = async () => {
    if (isMockMode) {
      const list = safeGetItem('fs_expenses', []);
      const roomExpenses = list.filter(e => 
        (user?.room && e.room_id === user.room.id && !e.is_private) || 
        (e.payer_id === user?.id && e.is_private)
      );
      setExpenses(roomExpenses);
      return roomExpenses;
    }

    try {
      const res = await axios.get('/api/expenses');
      setExpenses(res.data);
      return res.data;
    } catch (err) {
      const list = safeGetItem('fs_expenses', []);
      const roomExpenses = list.filter(e => 
        (user?.room && e.room_id === user.room.id && !e.is_private) || 
        (e.payer_id === user?.id && e.is_private)
      );
      setExpenses(roomExpenses);
      return roomExpenses;
    }
  };

  const createExpense = async (expenseData) => {
    if (isMockMode) {
      const list = safeGetItem('fs_expenses', []);
      const id = 'mock-exp-' + Date.now();
      
      let calculatedSplits = [];
      const numericAmount = parseFloat(expenseData.amount);
      const isPrivate = expenseData.isPrivate === true;

      if (isPrivate) {
        calculatedSplits.push({
          id: 'mock-split-1',
          user_id: user.id,
          user_name: user.full_name,
          share_amount: numericAmount
        });
      } else {
        const roomMembers = user.room.members;
        const splitType = expenseData.splitType || 'equal';

        if (splitType === 'equal') {
          const excluded = expenseData.excludedMembers || [];
          const active = roomMembers.filter(m => !excluded.includes(m.id));
          const share = Math.round((numericAmount / active.length) * 100) / 100;
          
          active.forEach((m, idx) => {
            let finalShare = share;
            if (idx === 0) {
              const diff = numericAmount - (share * active.length);
              finalShare = Math.round((share + diff) * 100) / 100;
            }
            calculatedSplits.push({
              id: 'mock-split-' + idx + '-' + Date.now(),
              user_id: m.id,
              user_name: m.full_name,
              share_amount: finalShare
            });
          });
        } else if (splitType === 'unequal') {
          expenseData.splits.forEach((s, idx) => {
            calculatedSplits.push({
              id: 'mock-split-' + idx + '-' + Date.now(),
              user_id: s.userId,
              user_name: roomMembers.find(m => m.id === s.userId)?.full_name || 'Roommate',
              share_amount: parseFloat(s.shareAmount)
            });
          });
        } else if (splitType === 'percentage') {
          expenseData.splits.forEach((s, idx) => {
            const share = Math.round((parseFloat(s.percentage) / 100) * numericAmount * 100) / 100;
            calculatedSplits.push({
              id: 'mock-split-' + idx + '-' + Date.now(),
              user_id: s.userId,
              user_name: roomMembers.find(m => m.id === s.userId)?.full_name || 'Roommate',
              share_amount: share
            });
          });
        } else if (splitType === 'shares') {
          let totalShares = expenseData.splits.reduce((sum, s) => sum + parseFloat(s.shares || 0), 0);
          expenseData.splits.forEach((s, idx) => {
            const share = Math.round((parseFloat(s.shares) / totalShares) * numericAmount * 100) / 100;
            calculatedSplits.push({
              id: 'mock-split-' + idx + '-' + Date.now(),
              user_id: s.userId,
              user_name: roomMembers.find(m => m.id === s.userId)?.full_name || 'Roommate',
              share_amount: share
            });
          });
        }
      }

      const newExpense = {
        id,
        room_id: isPrivate ? null : user.room?.id,
        payer_id: user.id,
        payer_name: user.full_name,
        description: expenseData.description,
        amount: numericAmount,
        category: expenseData.category,
        receipt_url: expenseData.receiptUrl || null,
        is_private: isPrivate,
        created_at: new Date().toISOString(),
        splits: calculatedSplits
      };

      list.unshift(newExpense);
      localStorage.setItem('fs_expenses', JSON.stringify(list));

      // Trigger notification simulation for other members
      if (!isPrivate && user.room) {
        const notifList = safeGetItem('fs_notifications', []);
        user.room.members.forEach(m => {
          if (m.id !== user.id) {
            notifList.unshift({
              id: 'mock-notif-' + Date.now() + Math.random(),
              user_id: m.id,
              room_id: user.room.id,
              title: 'New Bill Logged',
              message: `${user.full_name} logged a bill: "${expenseData.description}" ($${numericAmount.toFixed(2)})`,
              type: 'bill_added',
              is_read: false,
              created_at: new Date().toISOString()
            });
          }
        });
        localStorage.setItem('fs_notifications', JSON.stringify(notifList));
      }

      setRefreshTrigger(p => p + 1);
      return newExpense;
    }

    try {
      const res = await axios.post('/api/expenses/create', expenseData);
      setRefreshTrigger(p => p + 1);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create expense';
      throw new Error(msg);
    }
  };

  const updateExpense = async (id, expenseData) => {
    if (isMockMode) {
      const list = safeGetItem('fs_expenses', []);
      const expIdx = list.findIndex(e => e.id === id);
      if (expIdx !== -1) {
        const expense = list[expIdx];
        const numericAmount = parseFloat(expenseData.amount);
        const isPrivate = expenseData.isPrivate === true;

        let calculatedSplits = [];
        if (isPrivate) {
          calculatedSplits.push({
            id: 'mock-split-1',
            user_id: user.id,
            user_name: user.full_name,
            share_amount: numericAmount
          });
        } else {
          const roomMembers = user.room.members;
          const splitType = expenseData.splitType || 'equal';

          if (splitType === 'equal') {
            const excluded = expenseData.excludedMembers || [];
            const active = roomMembers.filter(m => !excluded.includes(m.id));
            const share = Math.round((numericAmount / active.length) * 100) / 100;
            active.forEach((m, idx) => {
              calculatedSplits.push({
                id: 'mock-split-' + idx + '-' + Date.now(),
                user_id: m.id,
                user_name: m.full_name,
                share_amount: share
              });
            });
          } else {
            expenseData.splits.forEach((s, idx) => {
              calculatedSplits.push({
                id: 'mock-split-' + idx + '-' + Date.now(),
                user_id: s.userId,
                user_name: roomMembers.find(m => m.id === s.userId)?.full_name || 'Roommate',
                share_amount: parseFloat(s.shareAmount)
              });
            });
          }
        }

        list[expIdx] = {
          ...expense,
          description: expenseData.description,
          amount: numericAmount,
          category: expenseData.category,
          is_private: isPrivate,
          splits: calculatedSplits
        };
        localStorage.setItem('fs_expenses', JSON.stringify(list));
        setRefreshTrigger(p => p + 1);
        return list[expIdx];
      }
      throw new Error('Expense not found locally');
    }

    try {
      const res = await axios.put(`/api/expenses/${id}`, expenseData);
      setRefreshTrigger(p => p + 1);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update expense';
      throw new Error(msg);
    }
  };

  const deleteExpense = async (id) => {
    if (isMockMode) {
      const list = safeGetItem('fs_expenses', []);
      const updated = list.filter(e => e.id !== id);
      localStorage.setItem('fs_expenses', JSON.stringify(updated));
      setRefreshTrigger(p => p + 1);
      return { message: 'Expense deleted locally' };
    }

    try {
      const res = await axios.delete(`/api/expenses/${id}`);
      setRefreshTrigger(p => p + 1);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete expense';
      throw new Error(msg);
    }
  };

  const getBalances = async () => {
    if (isMockMode) {
      if (!user?.room) return { balances: [], suggestedPayments: [] };
      const list = safeGetItem('fs_expenses', []);
      
      const roomMembers = user.room.members;
      const roomExpenses = list.filter(e => e.room_id === user.room.id && !e.is_private && e.category !== 'payment_placeholder');

      const roomBalances = {};
      roomMembers.forEach(m => {
        roomBalances[m.id] = {
          userId: m.id,
          fullName: m.full_name,
          email: m.email || '',
          totalPaid: 0.00,
          totalOwed: 0.00,
          netBalance: 0.00
        };
      });

      roomExpenses.forEach(e => {
        if (roomBalances[e.payer_id]) {
          roomBalances[e.payer_id].totalPaid += e.amount;
        }
      });

      roomExpenses.forEach(e => {
        if (e.splits) {
          e.splits.forEach(s => {
            if (roomBalances[s.user_id]) {
              roomBalances[s.user_id].totalOwed += s.share_amount;
            }
          });
        }
      });

      roomMembers.forEach(m => {
        const b = roomBalances[m.id];
        b.netBalance = Math.round((b.totalPaid - b.totalOwed) * 100) / 100;
      });

      const debtorList = [];
      const creditorList = [];

      roomMembers.forEach(m => {
        const net = roomBalances[m.id].netBalance;
        if (net < -0.01) debtorList.push({ userId: m.id, netBalance: net });
        else if (net > 0.01) creditorList.push({ userId: m.id, netBalance: net });
      });

      debtorList.sort((a, b) => a.netBalance - b.netBalance);
      creditorList.sort((a, b) => b.netBalance - a.netBalance);

      const suggestedPayments = [];
      let dIdx = 0;
      let cIdx = 0;

      while (dIdx < debtorList.length && cIdx < creditorList.length) {
        const debtor = debtorList[dIdx];
        const creditor = creditorList[cIdx];

        const owed = Math.abs(debtor.netBalance);
        const credit = creditor.netBalance;

        const settleAmount = Math.round(Math.min(owed, credit) * 100) / 100;

        if (settleAmount > 0) {
          suggestedPayments.push({
            fromUserId: debtor.userId,
            fromUserName: roomBalances[debtor.userId].fullName,
            toUserId: creditor.userId,
            toUserName: roomBalances[creditor.userId].fullName,
            amount: settleAmount
          });
        }

        debtor.netBalance = Math.round((debtor.netBalance + settleAmount) * 100) / 100;
        creditor.netBalance = Math.round((creditor.netBalance - settleAmount) * 100) / 100;

        if (Math.abs(debtor.netBalance) < 0.01) dIdx++;
        if (Math.abs(creditor.netBalance) < 0.01) cIdx++;
      }

      const balObj = {
        balances: Object.values(roomBalances),
        suggestedPayments
      };
      setBalances(balObj);
      return balObj;
    }

    try {
      const res = await axios.get('/api/expenses/balances');
      setBalances(res.data);
      return res.data;
    } catch (err) {
      return { balances: [], suggestedPayments: [] };
    }
  };

  const settleUp = async (toUserId, amount) => {
    if (isMockMode) {
      const list = safeGetItem('fs_expenses', []);
      const numericAmount = parseFloat(amount);
      const recipientName = user.room.members.find(m => m.id === toUserId)?.full_name || 'Roommate';

      const settleExpense = {
        id: 'mock-settle-' + Date.now(),
        room_id: user.room.id,
        payer_id: user.id,
        payer_name: user.full_name,
        description: `Settle Up: ${user.full_name} paid ${recipientName}`,
        amount: numericAmount,
        category: 'payment',
        receipt_url: null,
        is_private: false,
        created_at: new Date().toISOString(),
        splits: [
          {
            id: 'mock-split-settle-' + Date.now(),
            user_id: toUserId,
            user_name: recipientName,
            share_amount: numericAmount
          }
        ]
      };

      list.unshift(settleExpense);
      localStorage.setItem('fs_expenses', JSON.stringify(list));

      // Trigger notification for the recipient
      const notifList = safeGetItem('fs_notifications', []);
      notifList.unshift({
        id: 'mock-notif-' + Date.now(),
        user_id: toUserId,
        room_id: user.room.id,
        title: 'Payment Received',
        message: `${user.full_name} logged a settle-up payment of $${numericAmount.toFixed(2)} to you.`,
        type: 'settlement',
        is_read: false,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('fs_notifications', JSON.stringify(notifList));

      setRefreshTrigger(p => p + 1);
      return { message: 'Logged local settle-up payment', expense: settleExpense };
    }

    try {
      const res = await axios.post('/api/expenses/settle', { toUserId, amount });
      setRefreshTrigger(p => p + 1);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to log settle up';
      throw new Error(msg);
    }
  };

  // ==========================================
  // PHASE 3 ACTIONS
  // ==========================================

  const getSubscriptions = async () => {
    if (isMockMode) {
      if (!user?.room) return [];
      let list = safeGetItem('fs_subscriptions', []);
      let expensesList = safeGetItem('fs_expenses', []);
      let notifList = safeGetItem('fs_notifications', []);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const today = new Date(todayStr);
      let changed = false;

      // Automated Mock Scheduler
      const updatedList = list.map(sub => {
        let nextBilling = new Date(sub.next_billing_date);
        
        while (nextBilling <= today) {
          console.log(`⏰ [Mock Scheduler] Subscription auto-bill triggered for: ${sub.name}`);
          
          const desc = `Subscription Renewal: ${sub.name}`;
          const expenseId = 'mock-sub-bill-' + Date.now() + Math.random();
          const numericAmount = parseFloat(sub.amount);
          
          const roomMembers = user.room.members;
          const share = Math.round((numericAmount / roomMembers.length) * 100) / 100;
          
          const splits = roomMembers.map((m, idx) => {
            let finalShare = share;
            if (idx === 0) {
              const diff = numericAmount - (share * roomMembers.length);
              finalShare = Math.round((share + diff) * 100) / 100;
            }
            
            // Dispatch notifications to other members
            if (m.id !== sub.payer_id) {
              notifList.unshift({
                id: 'mock-notif-sub-' + Date.now() + Math.random(),
                user_id: m.id,
                room_id: user.room.id,
                title: 'Subscription Auto-Bill',
                message: `Recurring subscription "${sub.name}" was automatically renewed. Your share is $${finalShare.toFixed(2)}.`,
                type: 'bill_added',
                is_read: false,
                created_at: new Date().toISOString()
              });
            }

            return {
              id: 'mock-split-' + idx + '-' + Date.now(),
              user_id: m.id,
              user_name: m.full_name,
              share_amount: finalShare
            };
          });

          expensesList.unshift({
            id: expenseId,
            room_id: user.room.id,
            payer_id: sub.payer_id,
            payer_name: sub.payer_name,
            description: desc,
            amount: numericAmount,
            category: sub.category,
            receipt_url: null,
            is_private: false,
            created_at: new Date().toISOString(),
            splits
          });

          const tempDate = new Date(sub.next_billing_date);
          tempDate.setMonth(tempDate.getMonth() + 1);
          sub.next_billing_date = tempDate.toISOString().split('T')[0];
          nextBilling = new Date(sub.next_billing_date);
          changed = true;
        }

        return sub;
      });

      if (changed) {
        localStorage.setItem('fs_subscriptions', JSON.stringify(updatedList));
        localStorage.setItem('fs_expenses', JSON.stringify(expensesList));
        localStorage.setItem('fs_notifications', JSON.stringify(notifList));
        setTimeout(() => setRefreshTrigger(p => p + 1), 100);
      }

      setSubscriptions(updatedList);
      return updatedList;
    }

    try {
      const res = await axios.get('/api/subscriptions');
      setSubscriptions(res.data);
      return res.data;
    } catch (err) {
      const list = safeGetItem('fs_subscriptions', []);
      setSubscriptions(list);
      return list;
    }
  };

  const createSubscription = async (subData) => {
    if (isMockMode) {
      const list = safeGetItem('fs_subscriptions', []);
      const id = 'mock-sub-' + Date.now();
      
      const newSub = {
        id,
        room_id: user.room.id,
        payer_id: user.id,
        payer_name: user.full_name,
        name: subData.name,
        amount: parseFloat(subData.amount),
        category: subData.category,
        billing_cycle: subData.billingCycle || 'monthly',
        next_billing_date: subData.nextBillingDate,
        created_at: new Date().toISOString()
      };

      list.unshift(newSub);
      localStorage.setItem('fs_subscriptions', JSON.stringify(list));
      
      const notifList = safeGetItem('fs_notifications', []);
      user.room.members.forEach(m => {
        if (m.id !== user.id) {
          notifList.unshift({
            id: 'mock-notif-' + Date.now(),
            user_id: m.id,
            room_id: user.room.id,
            title: 'Subscription Tracked',
            message: `${user.full_name} added a recurring subscription: "${subData.name}" ($${parseFloat(subData.amount).toFixed(2)} / ${subData.billingCycle})`,
            type: 'system',
            is_read: false,
            created_at: new Date().toISOString()
          });
        }
      });
      localStorage.setItem('fs_notifications', JSON.stringify(notifList));

      setRefreshTrigger(p => p + 1);
      return newSub;
    }

    try {
      const res = await axios.post('/api/subscriptions/create', subData);
      setRefreshTrigger(p => p + 1);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to track subscription';
      throw new Error(msg);
    }
  };

  const deleteSubscription = async (id) => {
    if (isMockMode) {
      const list = safeGetItem('fs_subscriptions', []);
      const updated = list.filter(s => s.id !== id);
      localStorage.setItem('fs_subscriptions', JSON.stringify(updated));
      setRefreshTrigger(p => p + 1);
      return { message: 'Subscription removed locally' };
    }

    try {
      const res = await axios.delete(`/api/subscriptions/${id}`);
      setRefreshTrigger(p => p + 1);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove subscription';
      throw new Error(msg);
    }
  };

  const getNotifications = async () => {
    if (isMockMode) {
      const list = safeGetItem('fs_notifications', []);
      const userNotifs = list.filter(n => n.user_id === user?.id);
      setNotifications(userNotifs);
      return userNotifs;
    }

    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
      return res.data;
    } catch (err) {
      const list = safeGetItem('fs_notifications', []);
      const userNotifs = list.filter(n => n.user_id === user?.id);
      setNotifications(userNotifs);
      return userNotifs;
    }
  };

  const markNotificationRead = async (id) => {
    if (isMockMode) {
      const list = safeGetItem('fs_notifications', []);
      const idx = list.findIndex(n => n.id === id);
      if (idx !== -1) {
        list[idx].is_read = true;
        localStorage.setItem('fs_notifications', JSON.stringify(list));
        setRefreshTrigger(p => p + 1);
      }
      return;
    }

    try {
      await axios.put(`/api/notifications/${id}/read`);
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    if (isMockMode) {
      const list = safeGetItem('fs_notifications', []);
      list.forEach((n, idx) => {
        if (n.user_id === user?.id) {
          list[idx].is_read = true;
        }
      });
      localStorage.setItem('fs_notifications', JSON.stringify(list));
      setRefreshTrigger(p => p + 1);
      return;
    }

    try {
      await axios.put('/api/notifications/read-all');
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const sendDebtReminder = async (debtorId, amount) => {
    if (isMockMode) {
      const notifList = safeGetItem('fs_notifications', []);
      const debtorName = user.room.members.find(m => m.id === debtorId)?.full_name || 'Roommate';

      notifList.unshift({
        id: 'mock-notif-' + Date.now(),
        user_id: debtorId,
        room_id: user.room.id,
        title: 'Payment Reminder',
        message: `${user.full_name} sent you a friendly reminder to settle your balance of $${parseFloat(amount).toFixed(2)}.`,
        type: 'debt_reminder',
        is_read: false,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('fs_notifications', JSON.stringify(notifList));
      return { message: `Reminder sent to ${debtorName}!` };
    }

    try {
      const res = await axios.post('/api/notifications/remind', { debtorId, amount });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to dispatch reminder';
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
        refreshUser: checkAuthMe,
        
        // Phase 2 Exports
        expenses,
        balances,
        getExpenses,
        createExpense,
        updateExpense,
        deleteExpense,
        getBalances,
        settleUp,

        // Phase 3 Exports
        subscriptions,
        notifications,
        getSubscriptions,
        createSubscription,
        deleteSubscription,
        getNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        sendDebtReminder
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
