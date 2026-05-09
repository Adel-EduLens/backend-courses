import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  brief: string;
  aboutCourse: {
    title: string;
    items: string[];
  }[];
  targetAudience: string[];
  img: string;
  price: number;
  isAvailable: boolean;
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
  aboutCourse: {
    type: [{
      title: { type: String, required: true },
      items: [String]
    }],
    default: []
  },
  targetAudience: {
    type: [{
      type: String,
      trim: true
    }],
    default: []
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
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

courseSchema.virtual('rounds', {
  ref: 'Round',
  localField: '_id',
  foreignField: 'course'
});

export const Course = mongoose.model<ICourse>('Course', courseSchema);
