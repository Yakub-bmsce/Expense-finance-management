const express = require('express');
const { createRoom, joinRoom, getRoomDetails, regenerateJoinCode, removeMember, leaveRoom } = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', protect, createRoom);
router.post('/join', protect, joinRoom);
router.get('/me', protect, getRoomDetails);
router.post('/regenerate-code', protect, regenerateJoinCode);
router.post('/remove-member', protect, removeMember);
router.post('/leave', protect, leaveRoom);

module.exports = router;
