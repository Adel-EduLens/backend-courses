import mongoose, { Schema, Document } from 'mongoose';

export interface IInitiativePackage {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: 'custom' | 'full';
  price: number;
  isRecommended: boolean;
  maxCourses?: number;
  features: string[];
  courses: mongoose.Types.ObjectId[];
}

export interface IInitiative extends Document {
  title: string;
  description: string;
  img: string;
  tracks: mongoose.Types.ObjectId[];
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
  isRecommended: {
    type: Boolean,
    default: false
  },
  maxCourses: {
    type: Number,
    min: 1,
    required: function (this: IInitiativePackage) {
      return this.type === 'custom';
    }
  },
  features: {
    type: [String],
    default: []
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
  tracks: [{
    type: Schema.Types.ObjectId,
    ref: 'InitiativeCourse',
    required: true
  }],
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

initiativeSchema.pre('save', async function() {
  const initiative = this as IInitiative;
  
  // 1. Collect all valid track IDs belonging to this initiative
  const validTrackIds = new Set(initiative.tracks.map(id => id.toString()));

  // 2. Iterate through each package to clean up its course references
  initiative.packages.forEach(pkg => {
    // Only keep courses that are still present in the tracks list
    pkg.courses = pkg.courses.filter(courseId => 
      validTrackIds.has(courseId.toString())
    );

    // 3. Sync "full" packages to always include all tracks
    if (pkg.type === 'full') {
      pkg.courses = [...initiative.tracks];
    }
    
    // 4. Integrity check for custom packages: maxCourses cannot exceed included tracks
    if (pkg.type === 'custom' && pkg.maxCourses && pkg.maxCourses > pkg.courses.length) {
      pkg.maxCourses = pkg.courses.length;
    }
  });
});

export const Initiative = mongoose.model<IInitiative>('Initiative', initiativeSchema);
