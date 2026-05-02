import mongoose from 'mongoose';

mongoose.connect('mongodb://127.0.0.1:27017/edulens_courses')
  .then(async () => {
    const db = mongoose.connection.db;
    const events = await db.collection('events').find({}).toArray();
    for (const event of events) {
      if (Array.isArray(event.partners) && typeof event.partners[0] === 'string') {
        const updatedPartners = event.partners.map(p => ({ name: p, img: '' }));
        await db.collection('events').updateOne({ _id: event._id }, { $set: { partners: updatedPartners } });
        console.log(`Updated event ${event._id}`);
      }
    }
    console.log("Migration done");
    process.exit(0);
  })
  .catch(console.error);
