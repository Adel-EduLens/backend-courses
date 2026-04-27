import mongoose, { Schema, Document } from 'mongoose';

export interface IInitiativeCourse extends Document {
  title: string;
  description: string;
  price: number;
  img: string;
  brief: string;
  startTime: string;
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
}

const initiativeCourseSchema = new Schema<IInitiativeCourse>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  img: {
    type: String,
    required: true
  },
  brief: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const InitiativeCourse = mongoose.model<IInitiativeCourse>('InitiativeCourse', initiativeCourseSchema);
