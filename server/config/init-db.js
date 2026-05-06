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
    const dbName = process.env.DB_NAME || 'flashy';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);

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
        definition TEXT,
        term_image VARCHAR(500),
        definition_image VARCHAR(500),
        notes TEXT,
        external_links TEXT,
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

    // Migrate existing flashcards table — add new columns if missing
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'flashcards'`,
      [dbName]
    );
    const colMap = Object.fromEntries(columns.map(c => [c.COLUMN_NAME, c]));

    if (!colMap.notes) {
      await connection.query('ALTER TABLE flashcards ADD COLUMN notes TEXT');
      console.log('Migration: added notes column');
    }
    if (!colMap.external_links) {
      await connection.query('ALTER TABLE flashcards ADD COLUMN external_links TEXT');
      console.log('Migration: added external_links column');
    }
    // Allow definition to be NULL so cards can be image-only
    if (colMap.definition && colMap.definition.IS_NULLABLE === 'NO') {
      await connection.query('ALTER TABLE flashcards MODIFY COLUMN definition TEXT');
      console.log('Migration: made definition nullable');
    }

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error.message);
  } finally {
    await connection.end();
  }
}

initDatabase();
