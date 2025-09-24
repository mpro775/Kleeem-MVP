import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const SALT_ROUNDS = 10;
const DEFAULT_ROLE = 'ADMIN';
const DEFAULT_EMAIL = 'admin@kaleem.com';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  password: { type: String, required: true }, // غيّر للاسم الفعلي لو عندك passwordHash
  role: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema, 'users'); // collection: users

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  const email = process.env.ADMIN_EMAIL ?? DEFAULT_EMAIL;
  const newPass = process.argv[2];
  if (!newPass) throw new Error('Provide new password as argv[2]');

  await mongoose.connect(uri);

  const hash = await bcrypt.hash(newPass, SALT_ROUNDS);

  const updated = await User.findOneAndUpdate(
    { email },
    { $set: { password: hash, role: DEFAULT_ROLE } },
    { new: true },
  );

  if (!updated) {
    await User.create({ email, password: hash, role: DEFAULT_ROLE });
    console.log('Admin created with new password.');
  } else {
    console.log('Admin password updated.');
  }
}

try {
  await main();
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
}
