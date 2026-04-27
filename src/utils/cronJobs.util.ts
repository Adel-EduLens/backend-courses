import cron from 'node-cron';
import Event from '../modules/event/event.model.js';

/**
 * Cron job to update event status from 'upcoming' to 'past'
 * Runs every day at midnight (00:00)
 */
export const initEventStatusCron = () => {
  // schedule runs at 00:00 every day
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('🕒 Running cron job: Updating event statuses...');
      
      const now = new Date();
      
      const result = await Event.updateMany(
        {
          status: 'upcoming',
          date: { $lt: now }
        },
        {
          $set: { status: 'past' }
        }
      );

      console.log(`✅ Cron job finished. Updated ${result.modifiedCount} events to 'past'.`);
    } catch (error) {
      console.error('❌ Error in event status cron job:', error);
    }
  });

  console.log('🚀 Event status cron job initialized (daily at 00:00)');
};
