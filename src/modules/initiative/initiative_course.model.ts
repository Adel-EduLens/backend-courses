import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInitiativeLecture {
  _id?: Types.ObjectId;
  title: string;
  startDate: Date;
  meetingUrl?: string;
  status: 'upcoming' | 'active' | 'completed';
}

export interface IInitiativeCourse extends Document {
  title: string;
  description: string;
  img: string;
  brief: string;
  price: number;
  lectures: Types.DocumentArray<IInitiativeLecture>;
  createdAt: Date;
  updatedAt: Date;
}

const initiativeLectureSchema = new Schema<IInitiativeLecture>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  meetingUrl: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['upcoming', 'active', 'completed'],
    default: 'upcoming'
  }
}, {
  _id: true
});

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
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  lectures: {
    type: [initiativeLectureSchema],
    default: []
  }
}, {
  timestamps: true
});

export const InitiativeCourse = mongoose.model<IInitiativeCourse>('InitiativeCourse', initiativeCourseSchema);
