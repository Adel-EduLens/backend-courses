import mongoose, { Schema, Document } from 'mongoose';

export interface IInitiative extends Document {
  title: string;
  description: string;
  img: string;
  courses: mongoose.Types.ObjectId[];
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
  courses: [{
    type: Schema.Types.ObjectId,
    ref: 'InitiativeCourse'
  }]
}, {
  timestamps: true
});

export const Initiative = mongoose.model<IInitiative>('Initiative', initiativeSchema);

