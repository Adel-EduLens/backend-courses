import dotenv from 'dotenv';
import { connectDB, mongoose } from './db.connection.js';

// Setup environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nasu';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding placeholder...');
    
    // 1. Connect to DB
    await connectDB(MONGODB_URI);

    // TODO: Add your seeding logic here (e.g., await model.insertMany([...]))
    console.log('📝 Placeholder: No data seeded yet.');

    // 2. Close connection
    await mongoose.connection.close();
    console.log('👋 Seeding process finished, connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
