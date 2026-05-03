import mongoose, { Schema, Document } from 'mongoose';

export interface IInitiativeCourse extends Document {
  title: string;
  description: string;
  img: string;
  brief: string;
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
  img: {
    type: String,
    required: true
  },
  brief: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

export const InitiativeCourse = mongoose.model<IInitiativeCourse>('InitiativeCourse', initiativeCourseSchema);
