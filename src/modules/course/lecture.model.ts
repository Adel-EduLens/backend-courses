import mongoose, { Schema, Document } from 'mongoose';

export interface ILecture extends Document {
  round: mongoose.Types.ObjectId;
  title: string;
  startDate: Date;
  meetingUrl?: string;
  status: 'upcoming' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const lectureSchema = new Schema<ILecture>({
  round: {
    type: Schema.Types.ObjectId,
    ref: 'Round',
    required: true
  },
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
  timestamps: true
});

export const Lecture = mongoose.model<ILecture>('Lecture', lectureSchema);
