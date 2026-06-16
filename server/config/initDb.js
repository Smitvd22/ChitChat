import { pool } from './db.js';

let isInitialized = false;

export const initializeDatabase = async () => {
  if (isInitialized) return;
  
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        mobile VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create friendships table
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

    // Create messages table
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

    // Create message_reactions table
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

    console.log('Database tables initialized successfully with clean schema');
    isInitialized = true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
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