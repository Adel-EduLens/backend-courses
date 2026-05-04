import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Enrollment from './src/modules/course/enrollment.model.js';
import { Student } from './src/modules/student/student.model.js';

dotenv.config({ path: '.env.development' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nasu';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const enrollments = await Enrollment.find({ studentId: { $exists: false } });
    console.log(`Found ${enrollments.length} enrollments without studentId`);

    let linkedCount = 0;
    for (const enrollment of enrollments) {
      const student = await Student.findOne({ phone: enrollment.phone });
      if (student) {
        enrollment.studentId = student._id as mongoose.Types.ObjectId;
        await enrollment.save();
        linkedCount++;
      }
    }

    console.log(`Successfully linked ${linkedCount} enrollments to students`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
