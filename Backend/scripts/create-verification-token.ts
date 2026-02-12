// scripts/create-verification-token.ts
import { config } from 'dotenv';
import * as mongoose from 'mongoose';

import { EmailVerificationTokenSchema } from '../src/modules/auth/schemas/email-verification-token.schema';
import { UserSchema } from '../src/modules/users/schemas/user.schema';
// Inline the required functions to avoid import issues
const VERIFICATION_CODE_LENGTH = 6;

function generateNumericCode(length = VERIFICATION_CODE_LENGTH): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function sha256(input: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function minutesFromNow(mins: number): Date {
  const now = Date.now();
  const milliseconds = mins * 60 * 1000; // Convert to milliseconds
  const futureTime = now + milliseconds;
  return new Date(futureTime);
}

// Load environment variables
config();

async function createVerificationToken() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kaleem';
  console.log('Connecting to:', uri.replace(/\/\/.*@/, '//***:***@'));

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    const UserModel = mongoose.model('User', UserSchema);
    const TokenModel = mongoose.model(
      'EmailVerificationToken',
      EmailVerificationTokenSchema,
    );

    // Find the user
    const email = 'majdmorad1234@gmail.com';
    const user = await UserModel.findOne({ email }).exec();

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user._id} - ${user.email}`);

    // Check if user is already verified
    if (user.emailVerified) {
      console.log('❌ User is already verified');
      return;
    }

    // Check if there's already a valid token
    const existingToken = await TokenModel.findOne({
      userId: user._id,
      expiresAt: { $gt: new Date() },
    }).exec();

    if (existingToken) {
      console.log('❌ User already has a valid verification token');
      return;
    }

    // Delete any expired tokens for this user
    await TokenModel.deleteMany({
      userId: user._id,
      expiresAt: { $lt: new Date() },
    });

    // Generate new verification code
    const verificationCode = generateNumericCode(VERIFICATION_CODE_LENGTH);
    const codeHash = sha256(verificationCode);
    const expiresAt = minutesFromNow(15);

    console.log(`🔢 Generated verification code: ${verificationCode}`);
    console.log(`⏰ Token expires at: ${expiresAt}`);

    // Create the token
    const token = await TokenModel.create({
      userId: user._id,
      codeHash,
      expiresAt,
    });

    console.log(`✅ Created verification token: ${token._id}`);
    console.log(`📧 User can now verify with code: ${verificationCode}`);
    console.log(`⏱️  Token valid until: ${expiresAt}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createVerificationToken().catch(console.error);
