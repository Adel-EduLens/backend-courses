import mongoose, { Document, Schema } from 'mongoose';

export interface ITrustedBadgeItem {
  _id?: mongoose.Types.ObjectId;
  name?: string;
  logo: string;
}

export interface ITrustedBadgeContent extends Document {
  title: string;
  subtitle: string;
  badges: ITrustedBadgeItem[];
  createdAt: Date;
  updatedAt: Date;
}

const trustedBadgeItemSchema = new Schema<ITrustedBadgeItem>(
  {
    name: {
      type: String,
      trim: true
    },
    logo: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: true }
);

const trustedBadgeContentSchema = new Schema<ITrustedBadgeContent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Trusted by 26+ Schools & Institutions'
    },
    subtitle: {
      type: String,
      required: true,
      trim: true,
      default: 'Serving educators across Egypt and the Gulf Region'
    },
    badges: {
      type: [trustedBadgeItemSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const TrustedBadgeContent = mongoose.model<ITrustedBadgeContent>(
  'TrustedBadgeContent',
  trustedBadgeContentSchema
);

export default TrustedBadgeContent;
