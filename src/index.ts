import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, mongoose } from './db/db.connection.js';
import { globalErrorHandler } from './utils/globalErrorHandler.util.js';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/nasu',
};

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// App routes
app.get('/', (req: Request, res: Response) => {
  res.send('Hello from TypeScript Express with MongoDB!');
});



// Global Error Handler 
app.use(globalErrorHandler);

// Start server after DB connection
const startServer = async () => {
  await connectDB(env.MONGODB_URI);
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
  });

  // Graceful shutdown
  const gracefulShutdown = async () => {
    try {
      await mongoose.connection.close();
      console.log('Mongoose connection closed');
      server.close(() => {
        console.log('Express server closed');
        process.exit(0);
      });
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
};

startServer();