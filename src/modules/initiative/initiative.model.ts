import mongoose, { Schema, Document } from 'mongoose';

export interface IInitiative extends Document {
  title: string;
  description: string;
  img: string;
  courses: mongoose.Types.ObjectId[];
  maxCourses: number;
  createdAt: Date;
  updatedAt: Date;
}

const initiativeSchema = new Schema<IInitiative>({
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
  maxCourses: {
    type: Number,
    required: true,
    default: 1
  },
  courses: [{
    type: Schema.Types.ObjectId,
    ref: 'InitiativeCourse'
  }]
}, {
  timestamps: true
});

export const Initiative = mongoose.model<IInitiative>('Initiative', initiativeSchema);

