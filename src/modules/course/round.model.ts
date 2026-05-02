import mongoose, { Schema, Document } from 'mongoose';

export interface IRound extends Document {
  course: mongoose.Types.ObjectId;
  title: string;
  startDate: Date;
  endDate: Date;
  duration: string;
  status: 'upcoming' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const roundSchema = new Schema<IRound>({
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
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
  endDate: {
    type: Date,
    required: true
  },
  duration: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['upcoming', 'active', 'completed'],
    default: 'upcoming'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

roundSchema.virtual('lectures', {
  ref: 'Lecture',
  localField: '_id',
  foreignField: 'round'
});

export const Round = mongoose.model<IRound>('Round', roundSchema);
