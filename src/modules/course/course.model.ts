import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  brief: string;
  img: string;
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
  }
}, {
  timestamps: true
});

const Course = mongoose.model<ICourse>('Course', courseSchema);

export default Course;
