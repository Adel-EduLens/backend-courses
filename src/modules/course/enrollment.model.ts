import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollment extends Document {
  referenceId: mongoose.Types.ObjectId;
  referenceModel: 'Round' | 'InitiativeCourse' | 'Initiative';
  enrollmentTarget?: 'track' | 'package';
  initiativePackageId?: string;
  selectedCourses?: mongoose.Types.ObjectId[];
  fullName: string;
  email: string;
  phone: string;
  additionalInfo?: string;
  paymentOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>({
  referenceId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    required: true,
    enum: ['Round', 'InitiativeCourse', 'Initiative']
  },
  enrollmentTarget: {
    type: String,
    enum: ['track', 'package']
  },
  initiativePackageId: {
    type: String
  },
  selectedCourses: [{
    type: Schema.Types.ObjectId,
    ref: 'InitiativeCourse'
  }],
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
  },
  paymentOrderId: {
    type: String
  }
}, {
  timestamps: true
});

enrollmentSchema.index(
  { referenceId: 1, phone: 1, enrollmentTarget: 1, initiativePackageId: 1 },
  { unique: true }
);

const Enrollment = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);

export default Enrollment;
