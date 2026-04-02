const mongoose = require('mongoose');
require('dotenv').config({ override: true });
const User = require('./models/user');
const Patient = require('./models/Patient');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexiva');
  console.log('Connected to MongoDB');
  
  const users = await User.find({ role: 'patient' });
  console.log('Users count:', users.length);
  for (const u of users) {
    console.log(`User: ${u._id}, email: ${u.email}, role: ${u.role}`);
  }
  
  const patients = await Patient.find();
  console.log('Patients count:', patients.length);
  for (const p of patients) {
    console.log(`Patient: ${p._id}, userId: ${p.userId}, email: ${p.email}`);
  }
  
  process.exit(0);
}

test().catch(console.error);
