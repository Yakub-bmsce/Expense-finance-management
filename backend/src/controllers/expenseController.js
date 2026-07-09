const db = require('../config/db');

// @desc    Get all room expenses and private expenses
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    // 1. Get user room
    const memberRes = await db.query('SELECT room_id FROM room_members WHERE user_id = $1', [req.user.id]);
    const roomId = memberRes.rows.length > 0 ? memberRes.rows[0].room_id : null;

    let expenses = [];

    if (roomId) {
      // Fetch room expenses (non-private, non-deleted) + user's own private expenses
      const expRes = await db.query(
        `SELECT e.*, u.full_name AS payer_name 
         FROM expenses e
         JOIN users u ON e.payer_id = u.id
         WHERE ((e.room_id = $1 AND e.is_private = false) OR (e.payer_id = $2 AND e.is_private = true))
           AND e.deleted_at IS NULL
         ORDER BY e.created_at DESC`,
        [roomId, req.user.id]
      );
      expenses = expRes.rows;
    } else {
      // User is not in a room, fetch only their private expenses
      const expRes = await db.query(
        `SELECT e.*, u.full_name AS payer_name 
         FROM expenses e
         JOIN users u ON e.payer_id = u.id
         WHERE e.payer_id = $1 AND e.is_private = true AND e.deleted_at IS NULL
         ORDER BY e.created_at DESC`,
        [req.user.id]
      );
      expenses = expRes.rows;
    }

    // 2. Fetch splits for each expense
    const expensesWithSplits = await Promise.all(
      expenses.map(async (exp) => {
        const splitsRes = await db.query(
          `SELECT es.*, u.full_name AS user_name 
           FROM expense_splits es
           JOIN users u ON es.user_id = u.id
           WHERE es.expense_id = $1`,
          [exp.id]
        );
        return {
          ...exp,
          splits: splitsRes.rows
        };
      })
    );

    return res.json(expensesWithSplits);
  } catch (error) {
    console.error('Get expenses error:', error);
    return res.status(500).json({ message: 'Server error retrieving expenses' });
  }
};

// @desc    Create a new expense and calculate splits
// @route   POST /api/expenses/create
// @access  Private
const createExpense = async (req, res) => {
  const { 
    description, 
    amount, 
    category, 
    isPrivate = false, 
    splitType = 'equal', 
    splits = [], 
    excludedMembers = [], 
    receiptUrl = null 
  } = req.body;

  if (!description || !amount || !category) {
    return res.status(400).json({ message: 'Description, amount, and category are required' });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  try {
    // 1. Get room details
    const memberRes = await db.query('SELECT room_id FROM room_members WHERE user_id = $1', [req.user.id]);
    const roomId = memberRes.rows.length > 0 ? memberRes.rows[0].room_id : null;

    if (!roomId && !isPrivate) {
      return res.status(400).json({ message: 'You must belong to a room to log shared expenses.' });
    }

    // 2. Insert expense
    const expRes = await db.query(
      `INSERT INTO expenses (room_id, payer_id, description, amount, category, receipt_url, is_private)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [isPrivate ? null : roomId, req.user.id, description, numericAmount, category, receiptUrl, isPrivate]
    );
    const newExpense = expRes.rows[0];

    // 3. Calculate splits
    let calculatedSplits = [];

    if (isPrivate) {
      // Private expenses are 100% splits for the payer
      calculatedSplits.push({
        userId: req.user.id,
        share: numericAmount
      });
    } else {
      // Fetch all room members
      const membersRes = await db.query('SELECT user_id FROM room_members WHERE room_id = $1', [roomId]);
      const roomMembers = membersRes.rows.map(m => m.user_id);

      if (splitType === 'equal') {
        // Filter out excluded members
        const activeMembers = roomMembers.filter(id => !excludedMembers.includes(id));
        if (activeMembers.length === 0) {
          return res.status(400).json({ message: 'At least one member must be included in the split' });
        }

        // Divide amount equally (with rounding corrections)
        const baseShare = Math.floor((numericAmount / activeMembers.length) * 100) / 100;
        let totalDistributed = baseShare * activeMembers.length;
        const remainder = Math.round((numericAmount - totalDistributed) * 100);

        activeMembers.forEach((userId, index) => {
          let share = baseShare;
          // Add 1 cent remainder to early elements
          if (index < remainder) {
            share = Math.round((share + 0.01) * 100) / 100;
          }
          calculatedSplits.push({ userId, share });
        });
      } else if (splitType === 'unequal') {
        let totalSplitsSum = 0;
        splits.forEach(s => {
          const share = parseFloat(s.shareAmount);
          totalSplitsSum += isNaN(share) ? 0 : share;
          calculatedSplits.push({ userId: s.userId, share });
        });

        // Validate sum matches total
        if (Math.abs(totalSplitsSum - numericAmount) > 0.01) {
          return res.status(400).json({ message: `Sum of splits ($${totalSplitsSum.toFixed(2)}) must equal total amount ($${numericAmount.toFixed(2)})` });
        }
      } else if (splitType === 'percentage') {
        let totalPercent = 0;
        splits.forEach(s => {
          const pct = parseFloat(s.percentage);
          totalPercent += isNaN(pct) ? 0 : pct;
          const share = Math.round((pct / 100) * numericAmount * 100) / 100;
          calculatedSplits.push({ userId: s.userId, share });
        });

        if (Math.abs(totalPercent - 100) > 0.01) {
          return res.status(400).json({ message: 'Sum of percentages must equal 100%' });
        }
        
        // Correct rounding cents
        let totalDistributed = calculatedSplits.reduce((sum, s) => sum + s.share, 0);
        let diff = Math.round((numericAmount - totalDistributed) * 100) / 100;
        if (diff !== 0 && calculatedSplits.length > 0) {
          calculatedSplits[0].share = Math.round((calculatedSplits[0].share + diff) * 100) / 100;
        }
      } else if (splitType === 'shares') {
        let totalShares = 0;
        splits.forEach(s => {
          const sh = parseFloat(s.shares);
          totalShares += isNaN(sh) ? 0 : sh;
        });

        if (totalShares <= 0) {
          return res.status(400).json({ message: 'Total shares must be greater than 0' });
        }

        splits.forEach(s => {
          const sh = parseFloat(s.shares);
          const share = Math.round((sh / totalShares) * numericAmount * 100) / 100;
          calculatedSplits.push({ userId: s.userId, share });
        });

        // Correct rounding cents
        let totalDistributed = calculatedSplits.reduce((sum, s) => sum + s.share, 0);
        let diff = Math.round((numericAmount - totalDistributed) * 100) / 100;
        if (diff !== 0 && calculatedSplits.length > 0) {
          calculatedSplits[0].share = Math.round((calculatedSplits[0].share + diff) * 100) / 100;
        }
      }
    }

    // 4. Save splits into database
    await Promise.all(
      calculatedSplits.map(async (split) => {
        await db.query(
          `INSERT INTO expense_splits (expense_id, user_id, share_amount)
           VALUES ($1, $2, $3)`,
          [newExpense.id, split.userId, split.share]
        );
      })
    );

    // Dispatch notifications for other room members
    if (!isPrivate && roomId) {
      const roomMembers = membersRes.rows.map(m => m.user_id).filter(id => id !== req.user.id);
      const notifyMsg = `${req.user.full_name} logged a bill: "${description}" ($${numericAmount.toFixed(2)})`;
      await Promise.all(
        roomMembers.map(async (userId) => {
          await db.query(
            `INSERT INTO notifications (user_id, room_id, title, message, type)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, roomId, 'New Bill Logged', notifyMsg, 'bill_added']
          );
        })
      );
    }

    // 5. Fetch and return full expense details
    const splitsRes = await db.query(
      `SELECT es.*, u.full_name AS user_name 
       FROM expense_splits es
       JOIN users u ON es.user_id = u.id
       WHERE es.expense_id = $1`,
      [newExpense.id]
    );

    return res.status(201).json({
      ...newExpense,
      payer_name: req.user.full_name,
      splits: splitsRes.rows
    });
  } catch (error) {
    console.error('Create expense error:', error);
    return res.status(500).json({ message: 'Server error logging expense' });
  }
};

// @desc    Edit an existing expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res) => {
  const { id } = req.params;
  const { description, amount, category, splits = [], splitType = 'equal', isPrivate = false, excludedMembers = [] } = req.body;

  try {
    // Check if expense exists and belongs to the user
    const checkExp = await db.query('SELECT * FROM expenses WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (checkExp.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const expense = checkExp.rows[0];
    if (expense.payer_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized: Only the payer can edit this expense.' });
    }

    const numericAmount = parseFloat(amount);
    
    // Update main fields
    const updateRes = await db.query(
      `UPDATE expenses 
       SET description = $1, amount = $2, category = $3, is_private = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [description || expense.description, numericAmount || expense.amount, category || expense.category, isPrivate, id]
    );
    const updatedExpense = updateRes.rows[0];

    // Recalculate and replace splits
    await db.query('DELETE FROM expense_splits WHERE expense_id = $1', [id]);

    let calculatedSplits = [];
    const finalAmount = numericAmount || expense.amount;

    if (isPrivate) {
      calculatedSplits.push({ userId: req.user.id, share: finalAmount });
    } else {
      const roomId = expense.room_id;
      const membersRes = await db.query('SELECT user_id FROM room_members WHERE room_id = $1', [roomId]);
      const roomMembers = membersRes.rows.map(m => m.user_id);

      if (splitType === 'equal') {
        const activeMembers = roomMembers.filter(uid => !excludedMembers.includes(uid));
        const baseShare = Math.floor((finalAmount / activeMembers.length) * 100) / 100;
        let totalDistributed = baseShare * activeMembers.length;
        const remainder = Math.round((finalAmount - totalDistributed) * 100);

        activeMembers.forEach((userId, index) => {
          let share = baseShare;
          if (index < remainder) share = Math.round((share + 0.01) * 100) / 100;
          calculatedSplits.push({ userId, share });
        });
      } else {
        // Custom splits passed in body
        splits.forEach(s => {
          calculatedSplits.push({ userId: s.userId, share: parseFloat(s.shareAmount) });
        });
      }
    }

    await Promise.all(
      calculatedSplits.map(async (split) => {
        await db.query(
          `INSERT INTO expense_splits (expense_id, user_id, share_amount)
           VALUES ($1, $2, $3)`,
          [id, split.userId, split.share]
        );
      })
    );

    const splitsRes = await db.query(
      `SELECT es.*, u.full_name AS user_name 
       FROM expense_splits es
       JOIN users u ON es.user_id = u.id
       WHERE es.expense_id = $1`,
      [id]
    );

    return res.json({
      ...updatedExpense,
      splits: splitsRes.rows
    });
  } catch (error) {
    console.error('Update expense error:', error);
    return res.status(500).json({ message: 'Server error updating expense' });
  }
};

// @desc    Soft-delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
  const { id } = req.params;

  try {
    const checkExp = await db.query('SELECT * FROM expenses WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (checkExp.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const expense = checkExp.rows[0];
    if (expense.payer_id !== req.user.id) {
      // Also allow Room Admins to delete expenses if necessary
      const memberRes = await db.query('SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2', [expense.room_id, req.user.id]);
      const isAdmin = memberRes.rows.length > 0 && memberRes.rows[0].role === 'admin';
      
      if (!isAdmin) {
        return res.status(403).json({ message: 'Unauthorized: Only the payer or room admin can delete this expense.' });
      }
    }

    // Soft delete
    await db.query('UPDATE expenses SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    return res.json({ message: 'Expense deleted successfully (soft-delete trace maintained).' });
  } catch (error) {
    console.error('Delete expense error:', error);
    return res.status(500).json({ message: 'Server error deleting expense' });
  }
};

// @desc    Get room balances and suggested simplified payments
// @route   GET /api/expenses/balances
// @access  Private
const getBalances = async (req, res) => {
  try {
    const memberRes = await db.query('SELECT room_id FROM room_members WHERE user_id = $1', [req.user.id]);
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ message: 'You are not in any room' });
    }
    const roomId = memberRes.rows[0].room_id;

    // 1. Fetch room members details
    const membersRes = await db.query(
      `SELECT u.id, u.full_name, u.email 
       FROM room_members rm
       JOIN users u ON rm.user_id = u.id
       WHERE rm.room_id = $1`,
      [roomId]
    );
    const members = membersRes.rows;

    // 2. Initialize positions
    const balances = {};
    members.forEach(m => {
      balances[m.id] = {
        userId: m.id,
        fullName: m.full_name,
        email: m.email,
        totalPaid: 0.00,
        totalOwed: 0.00,
        netBalance: 0.00
      };
    });

    // 3. Fetch all active room expenses (non-deleted, shared only)
    const expRes = await db.query(
      'SELECT id, payer_id, amount FROM expenses WHERE room_id = $1 AND is_private = false AND deleted_at IS NULL',
      [roomId]
    );
    const expenses = expRes.rows;

    // 4. Fetch all splits for active room expenses
    const splitsRes = await db.query(
      `SELECT es.expense_id, es.user_id, es.share_amount 
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.room_id = $1 AND e.is_private = false AND e.deleted_at IS NULL`,
      [roomId]
    );
    const splits = splitsRes.rows;

    // Accumulate total paid
    expenses.forEach(e => {
      if (balances[e.payer_id]) {
        balances[e.payer_id].totalPaid += parseFloat(e.amount);
      }
    });

    // Accumulate total owed
    splits.forEach(s => {
      if (balances[s.user_id]) {
        balances[s.user_id].totalOwed += parseFloat(s.share_amount);
      }
    });

    // Compute net balance
    members.forEach(m => {
      const b = balances[m.id];
      b.netBalance = Math.round((b.totalPaid - b.totalOwed) * 100) / 100;
    });

    // 5. Debt Simplification Algorithm (Greedy algorithm)
    const debtors = [];
    const creditors = [];

    members.forEach(m => {
      const net = balances[m.id].netBalance;
      if (net < -0.01) {
        debtors.push({ userId: m.id, netBalance: net });
      } else if (net > 0.01) {
        creditors.push({ userId: m.id, netBalance: net });
      }
    });

    const suggestedPayments = [];

    let dIdx = 0;
    let cIdx = 0;

    // Clone arrays for mutation during algorithm
    const debtorList = debtors.map(d => ({ ...d }));
    const creditorList = creditors.map(c => ({ ...c }));

    // Sort: debtors ascending (most negative first), creditors descending (most positive first)
    debtorList.sort((a, b) => a.netBalance - b.netBalance);
    creditorList.sort((a, b) => b.netBalance - a.netBalance);

    while (dIdx < debtorList.length && cIdx < creditorList.length) {
      const debtor = debtorList[dIdx];
      const creditor = creditorList[cIdx];

      const owed = Math.abs(debtor.netBalance);
      const credit = creditor.netBalance;

      const settleAmount = Math.round(Math.min(owed, credit) * 100) / 100;

      if (settleAmount > 0) {
        suggestedPayments.push({
          fromUserId: debtor.userId,
          fromUserName: balances[debtor.userId].fullName,
          toUserId: creditor.userId,
          toUserName: balances[creditor.userId].fullName,
          amount: settleAmount
        });
      }

      debtor.netBalance = Math.round((debtor.netBalance + settleAmount) * 100) / 100;
      creditor.netBalance = Math.round((creditor.netBalance - settleAmount) * 100) / 100;

      if (Math.abs(debtor.netBalance) < 0.01) {
        dIdx++;
      }
      if (Math.abs(creditor.netBalance) < 0.01) {
        cIdx++;
      }
    }

    return res.json({
      balances: Object.values(balances),
      suggestedPayments
    });
  } catch (error) {
    console.error('Calculate balances error:', error);
    return res.status(500).json({ message: 'Server error calculating room balances' });
  }
};

// @desc    Settle up debt payment between two users
// @route   POST /api/expenses/settle
// @access  Private
const settleUp = async (req, res) => {
  const { toUserId, amount } = req.body;

  if (!toUserId || !amount) {
    return res.status(400).json({ message: 'Recipient user ID and amount are required' });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  try {
    // 1. Get room details
    const memberRes = await db.query('SELECT room_id FROM room_members WHERE user_id = $1', [req.user.id]);
    if (memberRes.rows.length === 0) {
      return res.status(400).json({ message: 'You must belong to a room to settle up' });
    }
    const roomId = memberRes.rows[0].room_id;

    // Fetch recipient name
    const recipientRes = await db.query('SELECT full_name FROM users WHERE id = $1', [toUserId]);
    if (recipientRes.rows.length === 0) {
      return res.status(404).json({ message: 'Recipient roommate not found' });
    }
    const recipientName = recipientRes.rows[0].full_name;

    // Log settle-up as a special payment category expense
    const desc = `Settle Up: ${req.user.full_name} paid ${recipientName}`;
    const expRes = await db.query(
      `INSERT INTO expenses (room_id, payer_id, description, amount, category, is_private)
       VALUES ($1, $2, $3, $4, 'payment', false) RETURNING *`,
      [roomId, req.user.id, desc, numericAmount]
    );
    const newExpense = expRes.rows[0];

    // Single split: recipient owes 100% of this "expense" back to the payer (reversing the debt)
    await db.query(
      `INSERT INTO expense_splits (expense_id, user_id, share_amount)
       VALUES ($1, $2, $3)`,
      [newExpense.id, toUserId, numericAmount]
    );

    // Log notification for the recipient
    const settleMsg = `${req.user.full_name} logged a settle-up payment of $${numericAmount.toFixed(2)} to you.`;
    await db.query(
      `INSERT INTO notifications (user_id, room_id, title, message, type)
       VALUES ($1, $2, $3, $4, $5)`,
      [toUserId, roomId, 'Payment Received', settleMsg, 'settlement']
    );

    return res.status(201).json({
      message: 'Settle up transaction logged successfully',
      expense: newExpense
    });
  } catch (error) {
    console.error('Settle up error:', error);
    return res.status(500).json({ message: 'Server error processing settle-up' });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getBalances,
  settleUp
};
