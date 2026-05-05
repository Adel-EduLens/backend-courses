import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IStudent extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  otpCode?: string | undefined;
  otpExpiresAt?: Date | undefined;
  isVerified: boolean;
  role: 'student';
  createdAt: Date;
  updatedAt: Date;
  comparePassword: (candidatePassword: string, userPassword: string) => Promise<boolean>;
}

const studentSchema = new Schema<IStudent>({
  name: {
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
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  otpCode: {
    type: String,
    select: false
  },
  otpExpiresAt: {
    type: Date,
    select: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    default: 'student',
    enum: ['student']
  }
}, {
  timestamps: true
});

studentSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

studentSchema.methods.comparePassword = async function(candidatePassword: string, userPassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, userPassword);
};

export const Student = mongoose.model<IStudent>('Student', studentSchema);
