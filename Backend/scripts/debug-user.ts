// scripts/debug-user.ts
import { config } from 'dotenv';
import * as mongoose from 'mongoose';

import { UserSchema } from '../src/modules/users/schemas/user.schema';

// Load environment variables
config();

async function debugUser() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kaleem';
  console.log('Connecting to:', uri.replace(/\/\/.*@/, '//***:***@'));

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    const UserModel = mongoose.model('User', UserSchema);

    // Check for the specific user by email
    const email = 'majdmorad1234@gmail.com';
    console.log(`\n🔍 Looking for user with email: ${email}`);

    const user = await UserModel.findOne({ email }).exec();
    console.log('Raw user object:', JSON.stringify(user, null, 2));

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log(`  _id: ${user._id}`);
    console.log(`  email: ${user.email}`);
    console.log(`  name: ${user.name}`);
    console.log(`  role: ${user.role}`);
    console.log(`  active: ${user.active}`);
    console.log(`  emailVerified: ${user.emailVerified}`);
    console.log(`  firstLogin: ${user.firstLogin}`);
    console.log(`  merchantId: ${user.merchantId}`);
    console.log(`  createdAt: ${(user as any).createdAt}`);
    console.log(`  updatedAt: ${(user as any).updatedAt}`);

    // Check if user has password (indicates they went through registration)
    console.log(`  hasPassword: ${!!user.password}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugUser().catch(console.error);
