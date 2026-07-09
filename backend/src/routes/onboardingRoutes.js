const express = require('express');
const { submitOnboarding } = require('../controllers/onboardingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, submitOnboarding);

module.exports = router;
