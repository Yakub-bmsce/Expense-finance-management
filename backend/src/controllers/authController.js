const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Helper: Generate JWT and Set secure cookie
const generateTokenAndCookie = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d' // Supports persistent remember me
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  return token;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ message: 'Please provide email, password, and full name' });
  }

  try {
    // Check if user exists
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const insertRes = await db.query(
      'INSERT INTO users (email, password_hash, full_name, onboarded) VALUES ($1, $2, $3, false) RETURNING *',
      [email.toLowerCase(), passwordHash, fullName]
    );

    const newUser = insertRes.rows[0];

    // Generate JWT cookie
    generateTokenAndCookie(res, newUser.id);

    // Exclude password from response
    const { password_hash, ...userResponse } = newUser;
    return res.status(201).json(userResponse);
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter email and password' });
  }

  try {
    // Check if user exists
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT cookie
    generateTokenAndCookie(res, user.id);

    const { password_hash, ...userResponse } = user;
    return res.json(userResponse);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Demo Login
// @route   POST /api/auth/demo
// @access  Public
const demoLogin = async (req, res) => {
  try {
    const demoEmail = 'demo@flatsplit.pro';
    
    // Check if demo user exists
    let userRes = await db.query('SELECT * FROM users WHERE email = $1', [demoEmail]);
    let demoUser = userRes.rows[0];

    if (!demoUser) {
      // Create demo user if they don't exist
      const defaultHash = await bcrypt.hash('demo1234', 10);
      const insertRes = await db.query(
        `INSERT INTO users (email, password_hash, full_name, gender, age, college, mobile, living_type, living_details, onboarded)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
        [demoEmail, defaultHash, 'Alex Mercer', 'Male', 22, 'State College', '+1555123456', 'bachelor', { pg_hostel_flat: 'flat', rooms: '3' }]
      );
      demoUser = insertRes.rows[0];

      // Create demo room as well
      const roomRes = await db.query(
        `INSERT INTO rooms (name, join_code) VALUES ($1, $2) RETURNING *`,
        ['Flat 404', 'FLATSPLIT99']
      );
      const demoRoom = roomRes.rows[0];

      // Associate demo user as admin of demo room
      await db.query(
        `INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3)`,
        [demoRoom.id, demoUser.id, 'admin']
      );
    }

    // Log in demo user
    generateTokenAndCookie(res, demoUser.id);

    const { password_hash, ...userResponse } = demoUser;
    return res.json(userResponse);
  } catch (error) {
    console.error('Demo login error:', error);
    return res.status(500).json({ message: 'Server error during demo login' });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  return res.json({ message: 'Logged out successfully' });
};

// @desc    Check authentication status
// @route   GET /api/auth/me
// @access  Private (Protected by middleware)
const checkAuth = async (req, res) => {
  // Check if user is associated with a room
  try {
    const roomMemberRes = await db.query(
      'SELECT room_id, role FROM room_members WHERE user_id = $1',
      [req.user.id]
    );

    let room = null;
    if (roomMemberRes.rows.length > 0) {
      const roomId = roomMemberRes.rows[0].room_id;
      const role = roomMemberRes.rows[0].role;
      const roomDetailRes = await db.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
      if (roomDetailRes.rows.length > 0) {
        room = {
          ...roomDetailRes.rows[0],
          role
        };
      }
    }

    return res.json({
      ...req.user,
      room
    });
  } catch (error) {
    console.error('Check auth error:', error);
    return res.status(500).json({ message: 'Server error checking auth status' });
  }
};

// @desc    Forgot Password Flow Mock
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Please provide email' });
  }

  // Simulated email send
  return res.json({
    message: 'Reset password link sent! Please check your email inbox.'
  });
};

module.exports = {
  register,
  login,
  demoLogin,
  logout,
  checkAuth,
  forgotPassword
};
