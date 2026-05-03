import mongoose, { Schema, Document } from 'mongoose';

export interface IInitiativePackage {
  title: string;
  description?: string;
  type: 'custom' | 'full';
  price: number;
  maxCourses?: number;
  courses: mongoose.Types.ObjectId[];
}

export interface IInitiative extends Document {
  title: string;
  description: string;
  img: string;
  track: mongoose.Types.ObjectId;
  packages: IInitiativePackage[];
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const initiativePackageSchema = new Schema<IInitiativePackage>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['custom', 'full']
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  maxCourses: {
    type: Number,
    min: 1,
    required: function (this: IInitiativePackage) {
      return this.type === 'custom';
    }
  },
  courses: [{
    type: Schema.Types.ObjectId,
    ref: 'InitiativeCourse',
    required: true
  }]
}, {
  _id: true
});

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
  track: {
    type: Schema.Types.ObjectId,
    ref: 'InitiativeCourse',
    required: true
  },
  packages: {
    type: [initiativePackageSchema],
    default: []
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

export const Initiative = mongoose.model<IInitiative>('Initiative', initiativeSchema);
