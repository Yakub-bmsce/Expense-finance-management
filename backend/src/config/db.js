const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

let useMock = false;
let pool;

// Seed the mock database in-memory
const mockDb = {
  users: [],
  rooms: [],
  room_members: [],
  expenses: [],
  expense_splits: []
};

// Seed demo data into mock DB
(async () => {
  const demoPasswordHash = await bcrypt.hash('demo1234', 10);
  const demoUserId = 'd3b07384-d113-4ec9-a2e6-a241e73722a4';
  const demoRoomId = 'e4b07384-d113-4ec9-a2e6-a241e73722a5';
  
  mockDb.users.push({
    id: demoUserId,
    email: 'demo@flatsplit.pro',
    password_hash: demoPasswordHash,
    google_id: null,
    full_name: 'Alex Mercer',
    gender: 'Male',
    age: 22,
    college: 'State University',
    mobile: '+1555123456',
    profile_photo_url: '',
    living_type: 'bachelor',
    living_details: { pg_hostel_flat: 'flat', rooms: '3' },
    onboarded: true,
    created_at: new Date(),
    updated_at: new Date()
  });

  mockDb.rooms.push({
    id: demoRoomId,
    name: 'Flat 404',
    join_code: 'FLATSPLIT99',
    created_at: new Date(),
    updated_at: new Date()
  });

  mockDb.room_members.push({
    id: 'f5b07384-d113-4ec9-a2e6-a241e73722a6',
    room_id: demoRoomId,
    user_id: demoUserId,
    role: 'admin',
    joined_at: new Date()
  });
})();

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('neon.tech') || isProduction
      ? { rejectUnauthorized: false }
      : false
  });

  // Verify connection
  pool.connect((err, client, release) => {
    if (err) {
      console.warn('⚠️ PostgreSQL connection failed. Falling back to IN-MEMORY database mock.');
      useMock = true;
    } else {
      console.log('✅ Connected to PostgreSQL successfully.');
      release();
    }
  });
} else {
  console.warn('⚠️ No DATABASE_URL specified. Running with IN-MEMORY database mock.');
  useMock = true;
}

// In-Memory query handler to mimic PostgreSQL queries
function executeMockQuery(text, params = []) {
  const normalizedSql = text.replace(/\s+/g, ' ').trim();
  
  // 1. SELECT * FROM users WHERE email = $1
  if (normalizedSql.startsWith('SELECT * FROM users WHERE email =')) {
    const email = params[0];
    const user = mockDb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return { rows: user ? [user] : [] };
  }

  // 2. SELECT * FROM users WHERE id = $1
  if (normalizedSql.startsWith('SELECT * FROM users WHERE id =')) {
    const id = params[0];
    const user = mockDb.users.find(u => u.id === id);
    return { rows: user ? [user] : [] };
  }

  // 3. INSERT INTO users ... RETURNING *
  if (normalizedSql.startsWith('INSERT INTO users')) {
    // fields: email, password_hash, full_name, onboarded...
    // Match fields and values
    const id = crypto.randomUUID();
    const email = params[0];
    const password_hash = params[1];
    const full_name = params[2];
    
    // For general signup or google signup
    let google_id = null;
    let gender = null;
    let age = null;
    let college = null;
    let mobile = null;
    let profile_photo_url = null;
    let living_type = null;
    let living_details = null;
    let onboarded = false;

    if (params.length > 3) {
      // It's the seed script or a custom insert
      google_id = params[3];
      gender = params[4];
      age = params[5];
      college = params[6];
      mobile = params[7];
      living_type = params[8];
      living_details = typeof params[9] === 'string' ? JSON.parse(params[9]) : params[9];
      onboarded = params[10] || false;
    }

    const newUser = {
      id,
      email,
      password_hash,
      google_id,
      full_name,
      gender,
      age,
      college,
      mobile,
      profile_photo_url,
      living_type,
      living_details,
      onboarded,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockDb.users.push(newUser);
    return { rows: [newUser] };
  }

  // 4. UPDATE users SET ... WHERE id = $X RETURNING *
  if (normalizedSql.startsWith('UPDATE users SET')) {
    // Match onboarding update:
    // UPDATE users SET full_name = $1, gender = $2, age = $3, college = $4, mobile = $5, living_type = $6, living_details = $7, onboarded = true, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *
    const full_name = params[0];
    const gender = params[1];
    const age = params[2];
    const college = params[3];
    const mobile = params[4];
    const living_type = params[5];
    const living_details = typeof params[6] === 'string' ? JSON.parse(params[6]) : params[6];
    const id = params[7];

    const userIndex = mockDb.users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      mockDb.users[userIndex] = {
        ...mockDb.users[userIndex],
        full_name,
        gender,
        age,
        college,
        mobile,
        living_type,
        living_details,
        onboarded: true,
        updated_at: new Date()
      };
      return { rows: [mockDb.users[userIndex]] };
    }
    return { rows: [] };
  }

  // 5. SELECT * FROM rooms WHERE join_code = $1
  if (normalizedSql.startsWith('SELECT * FROM rooms WHERE join_code =')) {
    const code = params[0];
    const room = mockDb.rooms.find(r => r.join_code === code);
    return { rows: room ? [room] : [] };
  }

  // 6. SELECT * FROM rooms WHERE id = $1
  if (normalizedSql.startsWith('SELECT * FROM rooms WHERE id =')) {
    const id = params[0];
    const room = mockDb.rooms.find(r => r.id === id);
    return { rows: room ? [room] : [] };
  }

  // 7. INSERT INTO rooms ... RETURNING *
  if (normalizedSql.startsWith('INSERT INTO rooms')) {
    const id = crypto.randomUUID();
    const name = params[0];
    const join_code = params[1];
    const newRoom = {
      id,
      name,
      join_code,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockDb.rooms.push(newRoom);
    return { rows: [newRoom] };
  }

  // 8. UPDATE rooms SET join_code = $1 WHERE id = $2 RETURNING *
  if (normalizedSql.startsWith('UPDATE rooms SET join_code =')) {
    const newCode = params[0];
    const id = params[1];
    const roomIndex = mockDb.rooms.findIndex(r => r.id === id);
    if (roomIndex !== -1) {
      mockDb.rooms[roomIndex].join_code = newCode;
      mockDb.rooms[roomIndex].updated_at = new Date();
      return { rows: [mockDb.rooms[roomIndex]] };
    }
    return { rows: [] };
  }

  // 9. SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2
  if (normalizedSql.startsWith('SELECT * FROM room_members WHERE room_id =') && normalizedSql.includes('AND user_id =')) {
    const roomId = params[0];
    const userId = params[1];
    const member = mockDb.room_members.find(rm => rm.room_id === roomId && rm.user_id === userId);
    return { rows: member ? [member] : [] };
  }

  // 10. SELECT room_members.* FROM room_members WHERE user_id = $1 (To check if user has a room)
  if (normalizedSql.includes('FROM room_members WHERE user_id =') && !normalizedSql.includes('AND room_id =') && !normalizedSql.includes('AND user_id =')) {
    const userId = params[0];
    const members = mockDb.room_members.filter(rm => rm.user_id === userId);
    return { rows: members };
  }

  // 11. INSERT INTO room_members ... RETURNING *
  if (normalizedSql.startsWith('INSERT INTO room_members')) {
    const id = crypto.randomUUID();
    const room_id = params[0];
    const user_id = params[1];
    const role = params[2] || 'member';
    const newMember = {
      id,
      room_id,
      user_id,
      role,
      joined_at: new Date()
    };
    mockDb.room_members.push(newMember);
    return { rows: [newMember] };
  }

  // 12. JOIN query for members lists:
  // SELECT users.id, users.email, users.full_name, users.profile_photo_url, room_members.role FROM room_members JOIN users ON room_members.user_id = users.id WHERE room_members.room_id = $1
  if (normalizedSql.includes('JOIN users ON room_members.user_id = users.id WHERE room_members.room_id =')) {
    const roomId = params[0];
    const members = mockDb.room_members.filter(rm => rm.room_id === roomId);
    const joined = members.map(rm => {
      const u = mockDb.users.find(user => user.id === rm.user_id);
      return {
        id: rm.user_id,
        email: u ? u.email : '',
        full_name: u ? u.full_name : '',
        profile_photo_url: u ? u.profile_photo_url : '',
        role: rm.role
      };
    });
    return { rows: joined };
  }

  // 13. DELETE FROM room_members WHERE room_id = $1 AND user_id = $2
  if (normalizedSql.startsWith('DELETE FROM room_members WHERE room_id =') && normalizedSql.includes('AND user_id =')) {
    const roomId = params[0];
    const userId = params[1];
    const initialLen = mockDb.room_members.length;
    mockDb.room_members = mockDb.room_members.filter(rm => !(rm.room_id === roomId && rm.user_id === userId));
    return { rowCount: initialLen - mockDb.room_members.length };
  }

  // 14. SELECT * FROM room_members WHERE room_id = $1
  if (normalizedSql.includes('FROM room_members WHERE room_id =') && !normalizedSql.includes('AND user_id =')) {
    const roomId = params[0];
    const members = mockDb.room_members.filter(rm => rm.room_id === roomId);
    return { rows: members.map(m => ({ user_id: m.user_id, room_id: m.room_id, role: m.role, id: m.id })) };
  }

  // 15. INSERT INTO expenses ... RETURNING *
  if (normalizedSql.startsWith('INSERT INTO expenses')) {
    const id = crypto.randomUUID();
    const room_id = params[0];
    const payer_id = params[1];
    const description = params[2];
    const amount = parseFloat(params[3]);
    const category = params[4];
    const receipt_url = params[5] || null;
    const is_private = params[6] === true || params[6] === 'true';

    const newExpense = {
      id,
      room_id,
      payer_id,
      description,
      amount,
      category,
      receipt_url,
      is_private,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null
    };

    mockDb.expenses.push(newExpense);
    return { rows: [newExpense] };
  }

  // 16. INSERT INTO expense_splits ... RETURNING *
  if (normalizedSql.startsWith('INSERT INTO expense_splits')) {
    const id = crypto.randomUUID();
    const expense_id = params[0];
    const user_id = params[1];
    const share_amount = parseFloat(params[2]);

    const newSplit = {
      id,
      expense_id,
      user_id,
      share_amount,
      is_settled: false,
      settled_at: null
    };

    mockDb.expense_splits.push(newSplit);
    return { rows: [newSplit] };
  }

  // 17. GET room expenses (+ user's private expenses)
  if (normalizedSql.includes('FROM expenses e JOIN users u ON e.payer_id = u.id WHERE ((e.room_id =')) {
    const roomId = params[0];
    const userId = params[1];

    const filtered = mockDb.expenses.filter(e => 
      ((e.room_id === roomId && !e.is_private) || (e.payer_id === userId && e.is_private))
      && e.deleted_at === null
    );

    const joined = filtered.map(e => {
      const u = mockDb.users.find(user => user.id === e.payer_id);
      return {
        ...e,
        payer_name: u ? u.full_name : ''
      };
    });

    // Sort by created_at desc
    joined.sort((a, b) => b.created_at - a.created_at);
    return { rows: joined };
  }

  // 18. GET user private expenses only (no room)
  if (normalizedSql.includes('FROM expenses e JOIN users u ON e.payer_id = u.id WHERE e.payer_id =') && normalizedSql.includes('is_private = true')) {
    const userId = params[0];

    const filtered = mockDb.expenses.filter(e => e.payer_id === userId && e.is_private && e.deleted_at === null);
    const joined = filtered.map(e => {
      const u = mockDb.users.find(user => user.id === e.payer_id);
      return {
        ...e,
        payer_name: u ? u.full_name : ''
      };
    });

    joined.sort((a, b) => b.created_at - a.created_at);
    return { rows: joined };
  }

  // 19. GET splits for an expense
  if (normalizedSql.includes('FROM expense_splits es JOIN users u ON es.user_id = u.id WHERE es.expense_id =')) {
    const expenseId = params[0];
    const filtered = mockDb.expense_splits.filter(es => es.expense_id === expenseId);
    const joined = filtered.map(es => {
      const u = mockDb.users.find(user => user.id === es.user_id);
      return {
        ...es,
        user_name: u ? u.full_name : ''
      };
    });
    return { rows: joined };
  }

  // 20. UPDATE expense
  if (normalizedSql.startsWith('UPDATE expenses SET') && !normalizedSql.includes('deleted_at =')) {
    const description = params[0];
    const amount = parseFloat(params[1]);
    const category = params[2];
    const is_private = params[3] === true || params[3] === 'true';
    const id = params[4];

    const expIdx = mockDb.expenses.findIndex(e => e.id === id);
    if (expIdx !== -1) {
      mockDb.expenses[expIdx] = {
        ...mockDb.expenses[expIdx],
        description,
        amount,
        category,
        is_private,
        updated_at: new Date()
      };
      return { rows: [mockDb.expenses[expIdx]] };
    }
    return { rows: [] };
  }

  // 21. DELETE splits for an expense
  if (normalizedSql.startsWith('DELETE FROM expense_splits WHERE expense_id =')) {
    const expenseId = params[0];
    const initialLen = mockDb.expense_splits.length;
    mockDb.expense_splits = mockDb.expense_splits.filter(es => es.expense_id !== expenseId);
    return { rowCount: initialLen - mockDb.expense_splits.length };
  }

  // 22. Soft delete expense
  if (normalizedSql.startsWith('UPDATE expenses SET deleted_at =')) {
    const id = params[0];
    const expIdx = mockDb.expenses.findIndex(e => e.id === id);
    if (expIdx !== -1) {
      mockDb.expenses[expIdx].deleted_at = new Date();
      return { rows: [mockDb.expenses[expIdx]] };
    }
    return { rows: [] };
  }

  // 23. GET active room expenses (amounts/payers only) for balance calculation
  if (normalizedSql.startsWith('SELECT id, payer_id, amount FROM expenses WHERE room_id =')) {
    const roomId = params[0];
    const filtered = mockDb.expenses.filter(e => e.room_id === roomId && !e.is_private && e.deleted_at === null);
    return { rows: filtered.map(e => ({ id: e.id, payer_id: e.payer_id, amount: e.amount })) };
  }

  // 24. GET splits for active room expenses for balance calculation
  if (normalizedSql.includes('FROM expense_splits es JOIN expenses e ON es.expense_id = e.id WHERE e.room_id =')) {
    const roomId = params[0];
    const activeExpenseIds = mockDb.expenses
      .filter(e => e.room_id === roomId && !e.is_private && e.deleted_at === null)
      .map(e => e.id);

    const filteredSplits = mockDb.expense_splits.filter(es => activeExpenseIds.includes(es.expense_id));
    return { rows: filteredSplits };
  }

  // 25. GET members details with user profile join for balance calculations
  if (normalizedSql.includes('FROM room_members rm JOIN users u ON rm.user_id = u.id WHERE rm.room_id =')) {
    const roomId = params[0];
    const members = mockDb.room_members.filter(rm => rm.room_id === roomId);
    const joined = members.map(rm => {
      const u = mockDb.users.find(user => user.id === rm.user_id);
      return {
        id: rm.user_id,
        full_name: u ? u.full_name : '',
        email: u ? u.email : ''
      };
    });
    return { rows: joined };
  }

  // 26. SELECT full_name / general select from users by id
  if (normalizedSql.includes('FROM users WHERE id =') && !normalizedSql.includes('UPDATE')) {
    const userId = params[0];
    const user = mockDb.users.find(u => u.id === userId);
    return { rows: user ? [user] : [] };
  }

  console.warn(`⚠️ Unhandled Mock Query: "${normalizedSql}" with params:`, params);
  return { rows: [] };
}

module.exports = {
  query: (text, params) => {
    if (useMock) {
      return executeMockQuery(text, params);
    }
    return pool.query(text, params);
  },
  get pool() {
    return pool;
  },
  get isMock() {
    return useMock;
  }
};
