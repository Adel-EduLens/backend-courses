import mongoose, { Schema, Document } from 'mongoose';

export interface ISpeaker {
  name: string;
  title: string;
  brief: string;
  img: string;
}

export interface IActivity {
  name: string;
  description: string;
}

export interface IEvent extends Document {
  title: string;
  description: string;
  location: string;
  status: 'past' | 'upcoming';
  date: Date;
  eventGallery: string[];
  speakers: ISpeaker[];
  partners: string[];
  activities: IActivity[];
  aboutEvent: string;
  keyObjectives: string[];
  createdAt: Date;
  updatedAt: Date;
}

const speakerSchema = new Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  brief: { type: String, required: true },
  img: { type: String, required: true }
}, { _id: false });

const activitySchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true }
}, { _id: false });

const eventSchema = new Schema<IEvent>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['past', 'upcoming'],
    default: 'upcoming',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  eventGallery: [{
    type: String
  }],
  speakers: [speakerSchema],
  partners: [{
    type: String
  }],
  activities: [activitySchema],
  aboutEvent: {
    type: String,
    required: true
  },
  keyObjectives: [{
    type: String
  }]
}, {
  timestamps: true
});

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;
