import dotenv from 'dotenv';
import { connectDB, mongoose } from './db.connection.js';

// Setup environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nasu';

import Admin from '../modules/admin/admin.model.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // 1. Connect to DB
    await connectDB(MONGODB_URI);

    // 2. Seed Admin
    const adminExists = await Admin.findOne({ email: 'admin@admin.com' });
    if (!adminExists) {
      await Admin.create({
        name: 'Admin',
        email: 'admin@admin.com',
        password: 'adminpassword123',
        role: 'admin'
      });
      console.log('✅ Admin account seeded successfully.');
    } else {
      console.log('ℹ️ Admin account already exists, skipping.');
    }

    // 3. Close connection
    await mongoose.connection.close();
    console.log('👋 Seeding process finished, connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
