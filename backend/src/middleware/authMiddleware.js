const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  // Retrieve token from httpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token session found' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user details from database (mock or real)
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user (excluding password) to request
    const { password_hash, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Not authorized, token validation failed' });
  }
};

module.exports = { protect };
