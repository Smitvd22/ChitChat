import { pool } from './db.js';

let isInitialized = false;

export const initializeDatabase = async () => {
  if (isInitialized) return;
  
  try {
    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        mobile VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create friendships table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER NOT NULL,
        user2_id INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user1_id, user2_id)
      )
    `);

    // Create messages table if it doesn't exist with all required columns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        read BOOLEAN DEFAULT FALSE,
        media_url VARCHAR(500),
        media_type VARCHAR(50),
        media_public_id VARCHAR(255),
        media_format VARCHAR(50),
        reply_to_id INTEGER,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE CASCADE
      )
    `);

    // Create message_reactions table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        emoji VARCHAR(50) NOT NULL,
        emoji_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(message_id, user_id, emoji)
      )
    `);

    console.log('Database tables initialized successfully');
    isInitialized = true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Function to check and add missing columns to existing tables
export const addMissingColumns = async () => {
  if (isInitialized) return;
  
  try {
    // Check and add missing columns to users table
    const userColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    
    const existingUserColumns = userColumns.rows.map(row => row.column_name);
    
    if (!existingUserColumns.includes('mobile')) {
      await pool.query(`ALTER TABLE users ADD COLUMN mobile VARCHAR(20)`);
      console.log('Added mobile column to users table');
    }

    // Check and add missing columns to friendships table
    const friendshipColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'friendships'
    `);
    
    const existingFriendshipColumns = friendshipColumns.rows.map(row => row.column_name);
    
    if (!existingFriendshipColumns.includes('updated_at')) {
      await pool.query(`ALTER TABLE friendships ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()`);
      console.log('Added updated_at column to friendships table');
    }

    // Check and add missing columns to messages table
    const messageColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
    `);
    
    const existingMessageColumns = messageColumns.rows.map(row => row.column_name);
    
    const requiredMessageColumns = [
      { name: 'read', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'media_url', type: 'VARCHAR(500)' },
      { name: 'media_type', type: 'VARCHAR(50)' },
      { name: 'media_public_id', type: 'VARCHAR(255)' },
      { name: 'media_format', type: 'VARCHAR(50)' },
      { name: 'reply_to_id', type: 'INTEGER REFERENCES messages(id) ON DELETE CASCADE' }
    ];

    for (const column of requiredMessageColumns) {
      if (!existingMessageColumns.includes(column.name)) {
        await pool.query(`ALTER TABLE messages ADD COLUMN ${column.name} ${column.type}`);
        console.log(`Added ${column.name} column to messages table`);
      }
    }

    // Create message_reactions table if it doesn't exist
    const tableExists = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'message_reactions'
    `);

    if (tableExists.rows.length === 0) {
      await pool.query(`
        CREATE TABLE message_reactions (
          id SERIAL PRIMARY KEY,
          message_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          emoji VARCHAR(50) NOT NULL,
          emoji_name VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(message_id, user_id, emoji)
        )
      `);
      console.log('Created message_reactions table');
    }

    // Create triggers for updated_at columns
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
      CREATE TRIGGER update_friendships_updated_at 
      BEFORE UPDATE ON friendships 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Error during database migration:', error);
  }
};

// Function to verify all required columns exist
export const verifyDatabaseSchema = async () => {
  try {
    // Verify users table structure
    const userColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    console.log('Users table columns:', userColumns.rows);

    // Verify messages table structure
    const messageColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      ORDER BY ordinal_position
    `);
    console.log('Messages table columns:', messageColumns.rows);

    // Verify friendships table structure
    const friendshipColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'friendships' 
      ORDER BY ordinal_position
    `);
    console.log('Friendships table columns:', friendshipColumns.rows);

    // Verify message_reactions table structure
    const reactionColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'message_reactions' 
      ORDER BY ordinal_position
    `);
    console.log('Message_reactions table columns:', reactionColumns.rows);

  } catch (error) {
    console.error('Error verifying database schema:', error);
  }
};