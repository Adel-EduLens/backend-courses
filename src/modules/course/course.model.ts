import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  brief: string;
  img: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  brief: {
    type: String,
    required: true,
    trim: true
  },
  img: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

export const Course = mongoose.model<ICourse>('Course', courseSchema);
