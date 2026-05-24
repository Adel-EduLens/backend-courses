import mongoose, { Document, Schema } from 'mongoose';

export interface ICoverStat {
  value: string;
  label: string;
}

export interface ICover extends Document {
  itemType: 'course' | 'event' | 'initiative' | 'track';
  itemId: mongoose.Types.ObjectId;
  title: string;
  subtitle: string;
  tagline: string;
  backgroundImage: string;
  buttonText: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICoverSettings extends Document {
  stats: ICoverStat[];
  createdAt: Date;
  updatedAt: Date;
}

const coverSchema = new Schema<ICover>(
  {
    itemType: {
      type: String,
      required: true,
      enum: ['course', 'event', 'initiative', 'track']
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    subtitle: {
      type: String,
      required: true,
      trim: true
    },
    tagline: {
      type: String,
      required: true,
      trim: true
    },
    backgroundImage: {
      type: String,
      required: true
    },
    buttonText: {
      type: String,
      trim: true,
      default: ''
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const coverStatSchema = new Schema<ICoverStat>(
  {
    value: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const coverSettingsSchema = new Schema<ICoverSettings>(
  {
    stats: { type: [coverStatSchema], default: [] }
  },
  { timestamps: true }
);

export const Cover = mongoose.model<ICover>('Cover', coverSchema);
export const CoverSettings = mongoose.model<ICoverSettings>('CoverSettings', coverSettingsSchema);

export default Cover;
