import mongoose, { Schema, Document } from 'mongoose';

export interface ISponsorRequest extends Document {
  eventId?: mongoose.Types.ObjectId;
  eventTitle: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  sponsorshipLevel: 'platinum' | 'gold' | 'silver' | 'bronze' | 'custom';
  message?: string;
  status: 'new' | 'reviewed';
  createdAt: Date;
  updatedAt: Date;
}

const sponsorRequestSchema = new Schema<ISponsorRequest>({
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event'
  },
  eventTitle: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  contactPerson: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  sponsorshipLevel: {
    type: String,
    enum: ['platinum', 'gold', 'silver', 'bronze', 'custom'],
    default: 'bronze',
    required: true
  },
  message: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['new', 'reviewed'],
    default: 'new'
  }
}, {
  timestamps: true
});

const SponsorRequest = mongoose.model<ISponsorRequest>('SponsorRequest', sponsorRequestSchema);

export default SponsorRequest;
