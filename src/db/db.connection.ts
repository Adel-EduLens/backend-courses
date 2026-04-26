import mongoose from './global-setup.js'; // Using the global setup with plugins

const connectDB = async (uri: string) => {
  try {
    await mongoose.connect(uri);
    console.log('✅ Successfully connected to MongoDB.');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Monitor connection events
mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected. Attempting to reconnect...');
});

export { connectDB, mongoose };
