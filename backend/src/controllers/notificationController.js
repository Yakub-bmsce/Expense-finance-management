const db = require('../config/db');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const alertsRes = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    return res.json(alertsRes.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: 'Server error retrieving notifications' });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const updateRes = await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.json(updateRes.rows[0]);
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ message: 'Server error updating notification status' });
  }
};

// @desc    Mark all user notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ message: 'Server error clearing notifications' });
  }
};

// @desc    Send a direct debt reminder to a roommate
// @route   POST /api/notifications/remind
// @access  Private
const sendReminder = async (req, res) => {
  const { debtorId, amount } = req.body;

  if (!debtorId || !amount) {
    return res.status(400).json({ message: 'Debtor User ID and amount are required' });
  }

  try {
    // 1. Get room details for the sender
    const senderRoomRes = await db.query('SELECT room_id FROM room_members WHERE user_id = $1', [req.user.id]);
    if (senderRoomRes.rows.length === 0) {
      return res.status(400).json({ message: 'You must belong to a room to send reminders.' });
    }
    const roomId = senderRoomRes.rows[0].room_id;

    // 2. Validate debtor is in the same room
    const debtorRoomRes = await db.query(
      'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, debtorId]
    );
    if (debtorRoomRes.rows.length === 0) {
      return res.status(400).json({ message: 'Target user is not a member of your room.' });
    }

    // 3. Dispatch notification to debtor
    const msg = `${req.user.full_name} sent you a friendly reminder to settle your balance of $${parseFloat(amount).toFixed(2)}.`;
    const notifyRes = await db.query(
      `INSERT INTO notifications (user_id, room_id, title, message, type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [debtorId, roomId, 'Payment Reminder', msg, 'debt_reminder']
    );

    return res.status(201).json({
      message: 'Reminder notification sent successfully',
      notification: notifyRes.rows[0]
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    return res.status(500).json({ message: 'Server error sending reminder' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendReminder
};
