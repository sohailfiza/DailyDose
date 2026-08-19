import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import User from '../models/userModel.js';
import Caretaker from '../models/caretakerModel.js';
import GOAL from '../models/goalModel.js';
import REMINDER from '../models/reminderModel.js';
import HABIT from '../models/habitModel.js';
import Notification from '../models/notificationModel.js';

const DEMO_PASSWORD = 'Demo@1234';

const CARETAKER = {
  firstname: 'Ananya',
  lastname: 'Reddy',
  email: 'ananya.reddy@dailydose.demo',
  gender: 'female',
  age: 34,
};

const USERS = [
  {
    firstname: 'Rajesh',
    lastname: 'Kumar',
    email: 'rajesh.kumar@dailydose.demo',
    gender: 'male',
    age: 68,
    diseases: ['Hypertension', 'Type 2 Diabetes'],
    allergies: ['Peanuts'],
    goals: ['Take morning medication', 'Walk for 20 minutes', 'Drink 8 glasses of water'],
    reminders: [
      { title: 'Take blood pressure medicine', startTime: '08:00', endTime: '08:15' },
      { title: 'Evening walk', startTime: '17:30', endTime: '18:00' },
    ],
    pastReminder: 'Doctor follow-up appointment',
    habits: ['Morning stretching', 'Evening journaling', 'Gardening'],
  },
  {
    firstname: 'Meera',
    lastname: 'Iyer',
    email: 'meera.iyer@dailydose.demo',
    gender: 'female',
    age: 71,
    diseases: ['Arthritis'],
    allergies: ['Dust', 'Penicillin'],
    goals: ['Take morning medication', 'Practice breathing exercises', 'Drink 8 glasses of water'],
    reminders: [
      { title: 'Take arthritis medicine', startTime: '09:00', endTime: '09:15' },
      { title: 'Light stretching session', startTime: '16:00', endTime: '16:20' },
    ],
    pastReminder: 'Physiotherapy session',
    habits: ['Morning stretching', 'Reading', 'Listening to music'],
  },
  {
    firstname: 'Arjun',
    lastname: 'Verma',
    email: 'arjun.verma@dailydose.demo',
    gender: 'male',
    age: 66,
    diseases: ['High Cholesterol'],
    allergies: ['Shellfish'],
    goals: ['Take evening medication', 'Walk for 20 minutes', 'Attend physiotherapy stretches'],
    reminders: [
      { title: 'Take cholesterol medicine', startTime: '20:00', endTime: '20:15' },
      { title: 'Morning walk', startTime: '07:00', endTime: '07:30' },
    ],
    pastReminder: 'Doctor follow-up appointment',
    habits: ['Gardening', 'Evening journaling', 'Reading'],
  },
];

const YEAR = 2024;
const COMPLETION_DENSITY = 0.78;

function generateCompletedDays() {
  const days = [];
  const cursor = new Date(YEAR, 0, 1);
  const end = new Date(YEAR, 11, 31);
  while (cursor <= end) {
    if (Math.random() < COMPLETION_DENSITY) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function seed() {
  await mongoose.connect(process.env.MongoDBURL);
  console.log('Connected to database');

  const existingCaretaker = await Caretaker.findOne({ email: CARETAKER.email });
  if (existingCaretaker) {
    console.log('Demo data already seeded (caretaker account exists). Skipping.');
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await hashPassword(DEMO_PASSWORD);

  const caretaker = new Caretaker({
    uuid: uuidv4(),
    firstname: CARETAKER.firstname,
    lastname: CARETAKER.lastname,
    email: CARETAKER.email,
    gender: CARETAKER.gender,
    age: CARETAKER.age,
    password: hashedPassword,
    assignedSeniors: [],
  });

  const createdUsers = [];

  for (const def of USERS) {
    const user = new User({
      uuid: uuidv4(),
      firstname: def.firstname,
      lastname: def.lastname,
      email: def.email,
      gender: def.gender,
      age: def.age,
      password: hashedPassword,
      role: 'user',
      diseases: def.diseases,
      allergies: def.allergies,
      caretaker: caretaker.uuid,
      caretaketAssigned: true,
    });

    // Goals
    const today = new Date();
    for (let i = 0; i < def.goals.length; i++) {
      const completedDays = generateCompletedDays();
      const completedToday = i < 2; // first two goals show as done today
      if (completedToday) {
        completedDays.push(new Date(today));
      }
      const goal = new GOAL({
        title: def.goals[i],
        startDate: new Date(YEAR, 0, 1),
        dayFrequency: ['Daily'],
        completed: false,
        completedToday,
        createdBy: 'user',
        createdById: user.uuid,
        completedDays,
        skippedDays: [],
      });
      await goal.save();
      user.goals.push(goal.uuid);
    }

    // Reminders - ongoing daily ones
    for (const r of def.reminders) {
      const reminder = new REMINDER({
        userId: user.uuid,
        title: r.title,
        startDate: new Date(YEAR, 0, 1),
        dayFrequency: ['Daily'],
        startTime: r.startTime,
        endTime: r.endTime,
        completed: false,
        createdBy: 'user',
        createdById: user.uuid,
      });
      await reminder.save();
      user.reminders.push(reminder.uuid);
    }

    // Reminder - a past, completed one-off reminder
    const pastReminder = new REMINDER({
      userId: user.uuid,
      title: def.pastReminder,
      startDate: new Date(YEAR, 2, 4),
      endDate: new Date(YEAR, 2, 10),
      dayFrequency: ['Today'],
      startTime: '10:00',
      endTime: '10:30',
      completed: true,
      createdBy: 'user',
      createdById: user.uuid,
    });
    await pastReminder.save();
    user.reminders.push(pastReminder.uuid);

    // Habits
    for (const title of def.habits) {
      const habit = new HABIT({ title });
      await habit.save();
      user.habits.push(habit.uuid);
    }

    await user.save();

    // Notifications
    await new Notification({
      userId: user.uuid,
      notification: [
        {
          title: 'New Goal Set!',
          description: `A new challenge awaits! Your goal is now set. Stay focused and make it happen ${def.goals[0]}`,
          belongTo: 'goal',
          actionTaken: true,
        },
        {
          title: 'New Reminder Set!',
          description: `You will be notified to complete ${def.reminders[0].title}`,
          belongTo: 'reminder',
          actionTaken: false,
        },
        {
          title: 'Great job!',
          description: "You are getting there. You've completed most of your goals today.",
          belongTo: 'goal',
          actionTaken: false,
        },
      ],
    }).save();

    caretaker.assignedSeniors.push(user.uuid);
    createdUsers.push(user);
  }

  await caretaker.save();

  console.log('\nDemo data seeded successfully:\n');
  console.log(`Caretaker: ${CARETAKER.firstname} ${CARETAKER.lastname} — ${CARETAKER.email} / ${DEMO_PASSWORD}`);
  for (const def of USERS) {
    console.log(`User: ${def.firstname} ${def.lastname} — ${def.email} / ${DEMO_PASSWORD}`);
  }

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('Error seeding demo data:', error);
  process.exit(1);
});
