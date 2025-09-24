// scripts/seed-admin.ts
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import * as mongoose from 'mongoose';
import { Connection, Model } from 'mongoose';

import { UserSchema } from '../src/modules/users/schemas/user.schema';

// 1) حمّل المتغيّرات من .env
config();

// 3) إعداد اتصال Mongoose
async function connectDb(): Promise<Connection> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db';
  await mongoose.connect(uri);
  return mongoose.connection;
}

async function seedAdmin() {
  const conn = await connectDb();

  // 4) إنشاء موديل User
  const UserModel: Model<any> = conn.model('User', UserSchema);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'P@ssw0rd!';

  // 5) تحقق إنّه موجود مسبقًا
  const existing = await UserModel.findOne({ email: adminEmail }).exec();
  if (existing) {
    console.log(`✋ Admin with email ${adminEmail} already exists.`);
    process.exit(0);
  }

  // 6) هشّ كلمة المرور
  const saltRounds = 10;
  const hash = await bcrypt.hash(adminPassword, saltRounds);

  // 7) أنشئ الأدمن
  const admin = new UserModel({
    email: adminEmail,
    password: hash,
    name: 'Super Admin',
    role: 'ADMIN',
    firstLogin: true,
  });

  await admin.save();
  console.log(`✅ Admin user created:
  email: ${adminEmail}
  password: ${adminPassword}
  `);

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
