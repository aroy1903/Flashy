const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'flashy'}\``);
    await connection.query(`USE \`${process.env.DB_NAME || 'flashy'}\``);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`groups\` (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id VARCHAR(36) PRIMARY KEY,
        group_id VARCHAR(36) NOT NULL,
        term TEXT NOT NULL,
        definition TEXT NOT NULL,
        term_image VARCHAR(500),
        definition_image VARCHAR(500),
        position INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id VARCHAR(36) PRIMARY KEY,
        group_id VARCHAR(36) NOT NULL,
        score INT NOT NULL,
        total INT NOT NULL,
        quiz_type VARCHAR(50) NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE
      )
    `);

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error.message);
  } finally {
    await connection.end();
  }
}

initDatabase();
