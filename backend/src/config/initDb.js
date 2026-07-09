const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function initializeDatabase() {
  try {
    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running SQL Schema migration...');
    await pool.query(sql);
    console.log('Database schema initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
    console.log('Database pool connection closed.');
  }
}

initializeDatabase();
