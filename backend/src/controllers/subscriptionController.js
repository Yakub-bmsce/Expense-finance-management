const db = require('../config/db');

// Helper: Calculate next billing date based on cycle
const calculateNextBillingDate = (currentDateStr, cycle) => {
  const date = new Date(currentDateStr);
  if (cycle === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (cycle === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    // Default monthly
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString().split('T')[0];
};

// Helper: Run subscription scheduler hook
const runSchedulerHook = async (roomId) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    // Fetch all active subscriptions
    const subRes = await db.query('SELECT * FROM subscriptions WHERE room_id = $1', [roomId]);
    const subscriptions = subRes.rows;

    // Fetch room members
    const membersRes = await db.query('SELECT user_id FROM room_members WHERE room_id = $1', [roomId]);
    const roomMembers = membersRes.rows.map(m => m.user_id);

    if (roomMembers.length === 0) return;

    for (const sub of subscriptions) {
      let nextBilling = new Date(sub.next_billing_date);

      // Loop in case multiple cycles passed while server was offline
      while (nextBilling <= today) {
        console.log(`⏰ [Scheduler] Triggering subscription renewal for: ${sub.name} ($${sub.amount})`);

        // 1. Insert new Expense
        const desc = `Subscription Renewal: ${sub.name}`;
        const expRes = await db.query(
          `INSERT INTO expenses (room_id, payer_id, description, amount, category, is_private)
           VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
          [roomId, sub.payer_id, desc, sub.amount, sub.category]
        );
        const newExpense = expRes.rows[0];

        // Fetch payer name
        const payerUserRes = await db.query('SELECT full_name FROM users WHERE id = $1', [sub.payer_id]);
        const payerName = payerUserRes.rows.length > 0 ? payerUserRes.rows[0].full_name : 'Roommate';

        // 2. Insert equal splits
        const baseShare = Math.floor((parseFloat(sub.amount) / roomMembers.length) * 100) / 100;
        let totalDistributed = baseShare * roomMembers.length;
        const remainder = Math.round((parseFloat(sub.amount) - totalDistributed) * 100);

        await Promise.all(
          roomMembers.map(async (userId, index) => {
            let share = baseShare;
            if (index < remainder) {
              share = Math.round((share + 0.01) * 100) / 100;
            }
            await db.query(
              `INSERT INTO expense_splits (expense_id, user_id, share_amount)
               VALUES ($1, $2, $3)`,
              [newExpense.id, userId, share]
            );

            // Log notification for other members
            if (userId !== sub.payer_id) {
              const alertMsg = `Recurring subscription "${sub.name}" was automatically renewed. Your share is $${share.toFixed(2)}.`;
              await db.query(
                `INSERT INTO notifications (user_id, room_id, title, message, type)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, roomId, 'Subscription Auto-Bill', alertMsg, 'bill_added']
              );
            }
          })
        );

        // 3. Update next billing date on subscription
        const newNextBillingStr = calculateNextBillingDate(sub.next_billing_date, sub.billing_cycle);
        await db.query(
          'UPDATE subscriptions SET next_billing_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newNextBillingStr, sub.id]
        );

        sub.next_billing_date = newNextBillingStr;
        nextBilling = new Date(newNextBillingStr);
      }
    }
  } catch (error) {
    console.error('Subscription Scheduler Hook error:', error);
  }
};

// @desc    Get subscriptions for the user's room (runs auto-bill scheduler on-demand)
// @route   GET /api/subscriptions
// @access  Private
const getSubscriptions = async (req, res) => {
  try {
    const memberRes = await db.query('SELECT room_id FROM room_members WHERE user_id = $1', [req.user.id]);
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ message: 'You must belong to a room to view subscriptions' });
    }
    const roomId = memberRes.rows[0].room_id;

    // Run scheduler checks
    await runSchedulerHook(roomId);

    // Fetch active subscriptions with payer full name
    const subRes = await db.query(
      `SELECT s.*, u.full_name AS payer_name 
       FROM subscriptions s
       JOIN users u ON s.payer_id = u.id
       WHERE s.room_id = $1
       ORDER BY s.created_at DESC`,
      [roomId]
    );

    return res.json(subRes.rows);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return res.status(500).json({ message: 'Server error retrieving subscriptions' });
  }
};

// @desc    Create a recurring subscription
// @route   POST /api/subscriptions/create
// @access  Private
const createSubscription = async (req, res) => {
  const { name, amount, category, billingCycle = 'monthly', nextBillingDate } = req.body;

  if (!name || !amount || !category || !nextBillingDate) {
    return res.status(400).json({ message: 'Name, amount, category, and next billing date are required' });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  try {
    const memberRes = await db.query('SELECT room_id FROM room_members WHERE user_id = $1', [req.user.id]);
    if (memberRes.rows.length === 0) {
      return res.status(400).json({ message: 'You must belong to a room to track subscriptions.' });
    }
    const roomId = memberRes.rows[0].room_id;

    const subRes = await db.query(
      `INSERT INTO subscriptions (room_id, payer_id, name, amount, category, billing_cycle, next_billing_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [roomId, req.user.id, name, numericAmount, category, billingCycle, nextBillingDate]
    );
    const newSubscription = subRes.rows[0];

    // Notify roommates that a subscription was added
    const roomMembersRes = await db.query('SELECT user_id FROM room_members WHERE room_id = $1', [roomId]);
    const members = roomMembersRes.rows.map(m => m.user_id).filter(uid => uid !== req.user.id);
    
    const notifyMsg = `${req.user.full_name} added a recurring subscription: "${name}" ($${numericAmount.toFixed(2)} / ${billingCycle})`;
    await Promise.all(
      members.map(async (userId) => {
        await db.query(
          `INSERT INTO notifications (user_id, room_id, title, message, type)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, roomId, 'Subscription Tracked', notifyMsg, 'system']
        );
      })
    );

    return res.status(201).json({
      ...newSubscription,
      payer_name: req.user.full_name
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    return res.status(500).json({ message: 'Server error saving subscription' });
  }
};

// @desc    Delete a recurring subscription
// @route   DELETE /api/subscriptions/:id
// @access  Private
const deleteSubscription = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if subscription exists
    const subCheck = await db.query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    if (subCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    const sub = subCheck.rows[0];

    // Validate ownership or admin
    if (sub.payer_id !== req.user.id) {
      const memberRes = await db.query('SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2', [sub.room_id, req.user.id]);
      const isAdmin = memberRes.rows.length > 0 && memberRes.rows[0].role === 'admin';
      
      if (!isAdmin) {
        return res.status(403).json({ message: 'Unauthorized: Only the payer or room admin can remove subscriptions.' });
      }
    }

    await db.query('DELETE FROM subscriptions WHERE id = $1', [id]);
    return res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Delete subscription error:', error);
    return res.status(500).json({ message: 'Server error removing subscription' });
  }
};

module.exports = {
  getSubscriptions,
  createSubscription,
  deleteSubscription
};
