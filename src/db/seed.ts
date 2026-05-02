import dotenv from 'dotenv';
import { connectDB, mongoose } from './db.connection.js';

// Setup environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nasu';

import Admin from '../modules/admin/admin.model.js';
import { Course } from '../modules/course/course.model.js';
import { Round } from '../modules/course/round.model.js';
import Event from '../modules/event/event.model.js';

const now = new Date();

const upcomingEventDate = new Date(now);
upcomingEventDate.setMonth(upcomingEventDate.getMonth() + 1);

const pastEventDate = new Date(now);
pastEventDate.setMonth(pastEventDate.getMonth() - 2);

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // 1. Connect to DB
    await connectDB(MONGODB_URI);

    // 2. Seed Admin without replacing the document so existing JWTs stay valid
    const existingAdmin = await Admin.findOne({ email: 'admin@admin.com' }).select('+password');

    if (existingAdmin) {
      existingAdmin.name = 'Admin';
      existingAdmin.password = 'adminpassword123';
      existingAdmin.role = 'admin';
      await existingAdmin.save();
    } else {
      await Admin.create({
        name: 'Admin',
        email: 'admin@admin.com',
        password: 'adminpassword123',
        role: 'admin'
      });
    }
    console.log('✅ Admin account seeded successfully.');

    // 3. Seed Test Course with a Round
    const course = await Course.findOneAndUpdate(
      { title: 'Test Course' },
      {
        title: 'Test Course',
        brief: 'A simple course to test Kashier payment integration.',
        aboutCourse: [
          {
            title: 'Overview',
            items: [
              'Verify the full Kashier payment and enrollment flow from the public course page.',
              'Validate checkout and confirmation processes.',
              'Ensure smooth end-to-end user experience for paid courses.'
            ]
          }
        ],
        targetAudience: [
          'Admins testing the Kashier payment flow end to end',
          'QA reviewers validating paid round enrollment behavior',
          'Developers checking course purchase and confirmation screens',
        ],
        img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=2070',
        price: 150
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true
      }
    );

    const existingRound = await Round.findOne({
      course: course._id,
      title: 'Summer 2026 Round'
    });

    if (!existingRound) {
      await Round.create({
        course: course._id,
        title: 'Summer 2026 Round',
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-14'),
        duration: '5 days',
        status: 'upcoming'
      });
    }

    console.log('✅ Test course and round seeded.');

    // 4. Seed sample events
    const seedEvents = [
      {
        title: 'Future-Ready Educators Summit',
        description: 'An upcoming event focused on AI integration, classroom innovation, and modern teaching strategies.',
        location: 'Cairo, Egypt',
        status: 'upcoming' as const,
        date: upcomingEventDate,
        eventGallery: [
          'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1400',
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1400',
        ],
        speakers: [
          {
            name: 'Dr. Heba Othman',
            title: 'Founder & CEO',
            brief: 'Leading sessions on teacher development, school transformation, and future-ready education models.',
            img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800',
          },
          {
            name: 'Dr. Mohamed Shalaby',
            title: 'AI Education Specialist',
            brief: 'Sharing practical AI workflows that help educators save time and improve student engagement.',
            img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
          },
        ],
        partners: ['Pace to Race Academy', 'EdTech Egypt', 'Global Teachers Network'],
        activities: [
          {
            name: 'AI in Education Workshop',
            description: 'Hands-on sessions exploring AI tools for lesson planning, assessment, and feedback.',
          },
          {
            name: 'Leadership Panel',
            description: 'School leaders discuss digital transformation and professional development priorities.',
          },
        ],
        aboutEvent:
          'This summit brings together educators, trainers, and school leaders to explore practical AI use cases and new teaching methodologies that can be applied immediately in real classrooms.',
        keyObjectives: [
          'Showcase practical AI tools for educators',
          'Connect teachers with modern classroom strategies',
          'Support leadership teams in planning school innovation',
        ],
      },
      {
        title: 'AI Teaching Success Stories Forum',
        description: 'A past event highlighting real case studies of AI-powered teaching and school improvement.',
        location: 'Alexandria, Egypt',
        status: 'past' as const,
        date: pastEventDate,
        eventGallery: [
          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1400',
          'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1400',
        ],
        speakers: [
          {
            name: 'Dr. Ehab Mesallum',
            title: 'International Curriculum Consultant',
            brief: 'Presented case studies on instructional quality and curriculum alignment in international schools.',
            img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800',
          },
          {
            name: 'Eng. Sarah Ahmed',
            title: 'EdTech Product Manager',
            brief: 'Demonstrated real classroom examples of AI products supporting teachers and learners.',
            img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=800',
          },
        ],
        partners: ['Pace to Race Academy', 'Teachers Innovation Hub', 'Learning Forward MENA'],
        activities: [
          {
            name: 'Case Study Showcase',
            description: 'Educators shared measurable outcomes from AI-supported lesson design and feedback loops.',
          },
          {
            name: 'Networking Session',
            description: 'Teachers and trainers exchanged implementation lessons and future collaboration ideas.',
          },
        ],
        aboutEvent:
          'This forum documented success stories from educators who adopted AI-enhanced teaching strategies and built stronger, more efficient learning experiences.',
        keyObjectives: [
          'Share practical implementation stories',
          'Highlight measurable classroom improvements',
          'Build a stronger educator community around innovation',
        ],
      },
    ];

    for (const eventData of seedEvents) {
      await Event.findOneAndUpdate(
        { title: eventData.title },
        eventData,
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        }
      );
    }
    console.log('✅ Sample upcoming and past events seeded.');

    // 5. Close connection
    await mongoose.connection.close();

    console.log('👋 Seeding process finished, connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
