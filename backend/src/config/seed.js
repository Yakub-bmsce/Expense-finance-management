const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seedDatabase() {
  try {
    console.log('Seeding database with demo data...');

    // 1. Check/Insert Demo User
    const email = 'demo@flatsplit.pro';
    const rawPassword = 'demo1234';
    
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let demoUserId;

    if (userRes.rows.length === 0) {
      console.log('Creating demo user...');
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      const insertUserSql = `
        INSERT INTO users (email, password_hash, full_name, gender, age, college, mobile, living_type, living_details, onboarded)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id;
      `;
      const values = [
        email,
        passwordHash,
        'Alex Mercer',
        'Male',
        22,
        'State University',
        '+1555123456',
        'bachelor',
        JSON.stringify({ pg_hostel_flat: 'flat', rooms: '3' }),
        true // marked onboarded so it skips onboarding flow
      ];
      
      const insertRes = await pool.query(insertUserSql, values);
      demoUserId = insertRes.rows[0].id;
      console.log('Demo user created with ID:', demoUserId);
    } else {
      demoUserId = userRes.rows[0].id;
      console.log('Demo user already exists with ID:', demoUserId);
    }

    // 2. Check/Insert Demo Room
    const joinCode = 'FLATSPLIT99';
    const roomRes = await pool.query('SELECT * FROM rooms WHERE join_code = $1', [joinCode]);
    let demoRoomId;

    if (roomRes.rows.length === 0) {
      console.log('Creating demo room...');
      const insertRoomSql = `
        INSERT INTO rooms (name, join_code)
        VALUES ($1, $2)
        RETURNING id;
      `;
      const insertRes = await pool.query(insertRoomSql, ['Flat 404', joinCode]);
      demoRoomId = insertRes.rows[0].id;
      console.log('Demo room created with ID:', demoRoomId);
    } else {
      demoRoomId = roomRes.rows[0].id;
      console.log('Demo room already exists with ID:', demoRoomId);
    }

    // 3. Associate Demo User with Demo Room as Admin
    const memberRes = await pool.query(
      'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
      [demoRoomId, demoUserId]
    );

    if (memberRes.rows.length === 0) {
      console.log('Associating demo user to demo room as admin...');
      await pool.query(
        'INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3)',
        [demoRoomId, demoUserId, 'admin']
      );
      console.log('Demo user associated as admin successfully.');
    } else {
      console.log('Demo user is already a member/admin of the demo room.');
    }

    console.log('Database seeding finished successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
    console.log('Database pool connection closed.');
  }
}

seedDatabase();
