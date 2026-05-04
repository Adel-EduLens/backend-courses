import mongoose, { Schema, Document } from 'mongoose';

export interface IPromoCode extends Document {
  code: string;
  discountPercentage: number;
  maxUses: number;
  currentUses: number;
  applicableTo: {
    type: 'all' | 'specific';
    courses: mongoose.Types.ObjectId[];
    initiativePackages: {
      initiativeId: mongoose.Types.ObjectId;
      packageId: string;
    }[];
    initiativeTracks: {
      initiativeId: mongoose.Types.ObjectId;
      trackId: mongoose.Types.ObjectId;
    }[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const promoCodeSchema = new Schema<IPromoCode>({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  maxUses: {
    type: Number,
    required: true,
    min: 1
  },
  currentUses: {
    type: Number,
    default: 0
  },
  applicableTo: {
    type: {
      type: String,
      enum: ['all', 'specific'],
      default: 'all'
    },
    courses: [{
      type: Schema.Types.ObjectId,
      ref: 'Course'
    }],
    initiativePackages: [{
      initiativeId: { type: Schema.Types.ObjectId, ref: 'Initiative' },
      packageId: { type: String }
    }],
    initiativeTracks: [{
      initiativeId: { type: Schema.Types.ObjectId, ref: 'Initiative' },
      trackId: { type: Schema.Types.ObjectId, ref: 'InitiativeCourse' }
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export const PromoCode = mongoose.model<IPromoCode>('PromoCode', promoCodeSchema);
