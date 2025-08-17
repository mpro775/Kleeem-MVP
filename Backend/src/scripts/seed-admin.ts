// src/scripts/seed-admin.ts
import 'dotenv/config';
import mongoose, { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import {
  User,
  UserRole,
  UserSchema,
} from '../modules/users/schemas/user.schema';

type Args = { email: string; password: string; name: string };
function parseArgs(): Args {
  const emailArg = process.argv.find((a) => a.startsWith('--email='));
  const passArg = process.argv.find((a) => a.startsWith('--password='));
  const nameArg = process.argv.find((a) => a.startsWith('--name='));
  if (!emailArg || !passArg || !nameArg) {
    console.error(
      'Usage: ts-node src/scripts/seed-admin.ts --email=you@domain.com --password=Secret123 --name="Site Admin"',
    );
    process.exit(1);
  }
  return {
    email: emailArg.split('=')[1],
    password: passArg.split('=')[1],
    name: nameArg.split('=')[1],
  };
}

async function main() {
  const { email, password, name } = parseArgs();
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(mongoUri);
  const UserModel: Model<User> = mongoose.model('User', UserSchema);
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  // إذا كان لديك hook للتشفير داخل UserService يمكنك تخطي التشفير هنا.
  const existing = await UserModel.findOne({ email });
  if (existing) {
    existing.password = hash;
    existing.role = UserRole.ADMIN;
    existing.firstLogin = false;
    existing.emailVerified = true;
    await existing.save();
    console.log(`✅ Updated existing user to ADMIN: ${email}`);
  } else {
    await UserModel.create({
      email,
      password,
      name,
      role: UserRole.ADMIN,
      merchantId: undefined,
      firstLogin: false,
      emailVerified: true,
    } as Partial<User>);
    console.log(`✅ Created ADMIN: ${email}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('❌ Seed admin failed:', e);
  process.exit(1);
});
