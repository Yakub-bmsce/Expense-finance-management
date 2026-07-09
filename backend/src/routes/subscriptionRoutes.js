const express = require('express');
const { getSubscriptions, createSubscription, deleteSubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getSubscriptions);
router.post('/create', protect, createSubscription);
router.delete('/:id', protect, deleteSubscription);

module.exports = router;
