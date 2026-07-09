const db = require('../config/db');

// @desc    Submit user onboarding details
// @route   POST /api/onboarding
// @access  Private
const submitOnboarding = async (req, res) => {
  const { fullName, gender, age, college, mobile, livingType, livingDetails } = req.body;

  // Validate fields
  if (!fullName || !gender || !age || !college || !livingType) {
    return res.status(400).json({ message: 'Please provide all required onboarding details' });
  }

  try {
    // Update user in DB
    const updateRes = await db.query(
      `UPDATE users 
       SET full_name = $1, gender = $2, age = $3, college = $4, mobile = $5, 
           living_type = $6, living_details = $7, onboarded = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 
       RETURNING *`,
      [
        fullName,
        gender,
        parseInt(age, 10),
        college,
        mobile || null,
        livingType,
        JSON.stringify(livingDetails || {}),
        req.user.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = updateRes.rows[0];
    const { password_hash, ...userResponse } = updatedUser;

    return res.json(userResponse);
  } catch (error) {
    console.error('Onboarding update error:', error);
    return res.status(500).json({ message: 'Server error updating onboarding details' });
  }
};

module.exports = { submitOnboarding };
