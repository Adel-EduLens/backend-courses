import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentDetails {
  [key: string]: unknown;
  studentId?: mongoose.Types.ObjectId | string | undefined;
  enrollmentId?: mongoose.Types.ObjectId | string | undefined;
  additionalInfo?: string | undefined;
  promoCode?: string | undefined;
  selectedCourses?: Array<mongoose.Types.ObjectId | string> | undefined;
  enrollmentTarget?: 'track' | 'package' | undefined;
  initiativePackageId?: string | undefined;
  adminEnrollmentType?: 'courseRound' | 'initiativeTrack' | 'initiativePackage' | 'event' | undefined;
  manualEnrollment?: boolean | undefined;
  createdByAdmin?: mongoose.Types.ObjectId | string | undefined;
  kashierResponse?: Record<string, unknown> | undefined;
}

export interface IPayment extends Document {
  orderId: string;
  referenceId: mongoose.Types.ObjectId;
  referenceModel: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  transactionId?: string;
  paymentDetails?: IPaymentDetails;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  referenceId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    required: true,
    enum: ['Round', 'InitiativeCourse', 'Initiative', 'Event']
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'cancelled'],
    default: 'pending'
  },
  transactionId: {
    type: String
  },
  paymentDetails: {
    type: Schema.Types.Mixed
  },
  customer: {
    name: String,
    email: String,
    phone: String
  }
}, {
  timestamps: true
});

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
