import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollment extends Document {
  courseId: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  additionalInfo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  additionalInfo: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Avoid duplicate enrollments for the same course and email
enrollmentSchema.index({ courseId: 1, email: 1 }, { unique: true });

const Enrollment = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);

export default Enrollment;
