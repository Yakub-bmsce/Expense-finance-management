const express = require('express');
const { register, login, demoLogin, logout, checkAuth, forgotPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/demo', demoLogin);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.get('/me', protect, checkAuth);

module.exports = router;
