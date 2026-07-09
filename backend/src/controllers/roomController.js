const crypto = require('crypto');
const db = require('../config/db');

// Helper: Generate secure 8-character join code
const generateJoinCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Helper: Check if member has unsettled balances
const hasUnsettledBalances = async (roomId, userId) => {
  try {
    const expRes = await db.query(
      'SELECT id, payer_id, amount FROM expenses WHERE room_id = $1 AND is_private = false AND deleted_at IS NULL',
      [roomId]
    );
    const expenses = expRes.rows;

    const splitsRes = await db.query(
      `SELECT es.expense_id, es.user_id, es.share_amount 
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.room_id = $1 AND e.is_private = false AND e.deleted_at IS NULL`,
      [roomId]
    );
    const splits = splitsRes.rows;

    let totalPaid = 0;
    expenses.forEach(e => {
      if (e.payer_id === userId) {
        totalPaid += parseFloat(e.amount);
      }
    });

    let totalOwed = 0;
    splits.forEach(s => {
      if (s.user_id === userId) {
        totalOwed += parseFloat(s.share_amount);
      }
    });

    return Math.abs(totalPaid - totalOwed) > 0.01;
  } catch (err) {
    console.error('Error checking user balances:', err);
    return false;
  }
};

// @desc    Create a new room
// @route   POST /api/rooms/create
// @access  Private
const createRoom = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Room name is required' });
  }

  try {
    // Check if user is already in a room (Phase 1 constraint: exactly one active room)
    const checkMember = await db.query('SELECT * FROM room_members WHERE user_id = $1', [req.user.id]);
    if (checkMember.rows.length > 0) {
      return res.status(400).json({ message: 'You are already a member of another room. Leave it before creating a new one.' });
    }

    // Generate secure join code
    let joinCode = generateJoinCode();
    
    // Ensure code is unique (rare collision possibility)
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const codeCheck = await db.query('SELECT * FROM rooms WHERE join_code = $1', [joinCode]);
      if (codeCheck.rows.length === 0) {
        isUnique = true;
      } else {
        joinCode = generateJoinCode();
        attempts++;
      }
    }

    // Create Room
    const roomRes = await db.query(
      'INSERT INTO rooms (name, join_code) VALUES ($1, $2) RETURNING *',
      [name, joinCode]
    );
    const newRoom = roomRes.rows[0];

    // Associate creator as Admin
    await db.query(
      'INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3)',
      [newRoom.id, req.user.id, 'admin']
    );

    return res.status(201).json({
      ...newRoom,
      role: 'admin'
    });
  } catch (error) {
    console.error('Create room error:', error);
    return res.status(500).json({ message: 'Server error creating room' });
  }
};

// @desc    Join an existing room using a join code
// @route   POST /api/rooms/join
// @access  Private
const joinRoom = async (req, res) => {
  const { joinCode } = req.body;

  if (!joinCode) {
    return res.status(400).json({ message: 'Room join code is required' });
  }

  try {
    // Check if user is already in a room
    const checkMember = await db.query('SELECT * FROM room_members WHERE user_id = $1', [req.user.id]);
    if (checkMember.rows.length > 0) {
      return res.status(400).json({ message: 'You are already a member of another room. Leave it before joining a new one.' });
    }

    // Validate Join Code
    const roomRes = await db.query('SELECT * FROM rooms WHERE join_code = $1', [joinCode.toUpperCase().trim()]);
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ message: 'Invalid room join code. Room not found.' });
    }

    const targetRoom = roomRes.rows[0];

    // Check if user was previously in this room (highly unlikely, but safe guard)
    const checkPrevious = await db.query(
      'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
      [targetRoom.id, req.user.id]
    );

    if (checkPrevious.rows.length > 0) {
      return res.json({
        ...targetRoom,
        role: checkPrevious.rows[0].role
      });
    }

    // Add user as standard member
    await db.query(
      'INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3)',
      [targetRoom.id, req.user.id, 'member']
    );

    return res.json({
      ...targetRoom,
      role: 'member'
    });
  } catch (error) {
    console.error('Join room error:', error);
    return res.status(500).json({ message: 'Server error joining room' });
  }
};

// @desc    Get current room details and members
// @route   GET /api/rooms/me
// @access  Private
const getRoomDetails = async (req, res) => {
  try {
    // Find room relation
    const memberRes = await db.query('SELECT * FROM room_members WHERE user_id = $1', [req.user.id]);
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ message: 'You are not in any room currently' });
    }

    const { room_id, role } = memberRes.rows[0];

    // Fetch Room info
    const roomRes = await db.query('SELECT * FROM rooms WHERE id = $1', [room_id]);
    if (roomRes.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }
    const room = roomRes.rows[0];

    // Fetch Room members
    const membersRes = await db.query(
      `SELECT users.id, users.email, users.full_name, users.profile_photo_url, room_members.role 
       FROM room_members 
       JOIN users ON room_members.user_id = users.id 
       WHERE room_members.room_id = $1`,
      [room_id]
    );

    return res.json({
      ...room,
      role,
      members: membersRes.rows
    });
  } catch (error) {
    console.error('Get room details error:', error);
    return res.status(500).json({ message: 'Server error retrieving room details' });
  }
};

// @desc    Regenerate Room Join Code
// @route   POST /api/rooms/regenerate-code
// @access  Private
const regenerateJoinCode = async (req, res) => {
  try {
    // Validate role is admin
    const memberRes = await db.query('SELECT * FROM room_members WHERE user_id = $1', [req.user.id]);
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ message: 'You are not in any room' });
    }

    const { room_id, role } = memberRes.rows[0];

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Room Admin privileges required' });
    }

    // Generate new code
    const newCode = generateJoinCode();
    await db.query('UPDATE rooms SET join_code = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newCode, room_id]);

    return res.json({ join_code: newCode });
  } catch (error) {
    console.error('Regenerate join code error:', error);
    return res.status(500).json({ message: 'Server error regenerating join code' });
  }
};

// @desc    Remove a member from the room
// @route   POST /api/rooms/remove-member
// @access  Private
const removeMember = async (req, res) => {
  const { userIdToRemove } = req.body;

  if (!userIdToRemove) {
    return res.status(400).json({ message: 'User ID to remove is required' });
  }

  if (userIdToRemove === req.user.id) {
    return res.status(400).json({ message: 'You cannot remove yourself. To leave, please contact support or delete the room (Phase 4).' });
  }

  try {
    // Validate role is admin
    const memberRes = await db.query('SELECT * FROM room_members WHERE user_id = $1', [req.user.id]);
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ message: 'You are not in any room' });
    }

    const { room_id, role } = memberRes.rows[0];

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Room Admin privileges required' });
    }

    // Eviction Balance Rule: Check active unsettled balances before eviction
    const hasUnsettled = await hasUnsettledBalances(room_id, userIdToRemove);
    if (hasUnsettled) {
      return res.status(400).json({ message: 'Member eviction blocked: this roommate has active, unsettled balances in this room.' });
    }

    // Delete relation from room_members
    const deleteRes = await db.query(
      'DELETE FROM room_members WHERE room_id = $1 AND user_id = $2',
      [room_id, userIdToRemove]
    );

    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ message: 'Member not found in this room' });
    }

    return res.json({ message: 'Room member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    return res.status(500).json({ message: 'Server error removing member' });
  }
};

// @desc    Leave current room
// @route   POST /api/rooms/leave
// @access  Private
const leaveRoom = async (req, res) => {
  try {
    // Find room member record
    const memberRes = await db.query('SELECT * FROM room_members WHERE user_id = $1', [req.user.id]);
    if (memberRes.rows.length === 0) {
      return res.status(400).json({ message: 'You are not a member of any room' });
    }

    const { room_id, role } = memberRes.rows[0];

    // Eviction Balance Rule: Check active unsettled balances before leaving
    const hasUnsettled = await hasUnsettledBalances(room_id, req.user.id);
    if (hasUnsettled) {
      return res.status(400).json({ message: 'Leave room blocked: you have active, unsettled balances in this room. Settle all debts first.' });
    }

    // If they are an admin, check if they are the last admin or if there are other admins.
    // In Phase 1, the creator is admin. If there are other members, they can leave but let's see.
    // If they are the only member, we can delete the room. If there are others, they should delegate admin first (Phase 4).
    // For Phase 1, let's keep it simple: they can leave. If they are the last admin, we delete the room.
    const allMembersRes = await db.query('SELECT * FROM room_members WHERE room_id = $1', [room_id]);
    
    if (allMembersRes.rows.length === 1) {
      // Last member, delete the room
      await db.query('DELETE FROM rooms WHERE id = $1', [room_id]);
    } else if (role === 'admin') {
      // If admin leaves and there are other members, make the oldest member admin
      const nextMember = allMembersRes.rows.find(m => m.user_id !== req.user.id);
      if (nextMember) {
        await db.query('UPDATE room_members SET role = \'admin\' WHERE id = $1', [nextMember.id]);
      }
    }

    // Delete membership
    await db.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [room_id, req.user.id]);

    return res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Leave room error:', error);
    return res.status(500).json({ message: 'Server error leaving room' });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  getRoomDetails,
  regenerateJoinCode,
  removeMember,
  leaveRoom
};
