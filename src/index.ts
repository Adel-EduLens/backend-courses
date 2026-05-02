import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, mongoose } from './db/db.connection.js';
import { globalErrorHandler } from './utils/globalErrorHandler.util.js';
import adminRoutes from './modules/admin/admin.routes.js';
import courseRoutes from './modules/course/course.routes.js';
import eventRoutes from './modules/event/event.routes.js';
import eventAdminRoutes from './modules/event/event.admin.routes.js';
import courseAdminRoutes from './modules/course/course.admin.routes.js';
import initiativeRoutes from './modules/initiative/initiative.routes.js';
import initiativeAdminRoutes from './modules/initiative/initiative.admin.routes.js';
import paymentRoutes from './modules/payment/payment.routes.js';
import { initEventStatusCron } from './utils/cronJobs.util.js';

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
app.use('/uploads', express.static('public/uploads'));

// App routes
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin/events', eventAdminRoutes);
app.use('/api/admin/courses', courseAdminRoutes);
app.use('/api/initiatives', initiativeRoutes);
app.use('/api/admin/initiatives', initiativeAdminRoutes);
app.use('/api/payments', paymentRoutes);

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
    
    // Initialize cron jobs
    initEventStatusCron();
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
