import dotenv from 'dotenv';
import { connectDB, mongoose } from './db.connection.js';

// Setup environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nasu';

import Admin from '../modules/admin/admin.model.js';
import { Course } from '../modules/course/course.model.js';

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
    }

    // 3. Seed Test Course
    const course = await Course.findOne({ title: 'Test Course' });
    if (!course) {
      await Course.create({
        title: 'Test Course',
        brief: 'A simple course to test Kashier payment integration.',
        img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=2070',
        price: 150
      });
      console.log('✅ Test course seeded.');
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
