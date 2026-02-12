// scripts/debug-verification-token.ts
import { config } from 'dotenv';
import * as mongoose from 'mongoose';

import { EmailVerificationTokenSchema } from '../src/modules/auth/schemas/email-verification-token.schema';

// Load environment variables
config();

async function debugVerificationToken() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kaleem';
  console.log('Connecting to:', uri.replace(/\/\/.*@/, '//***:***@'));

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    const TokenModel = mongoose.model(
      'EmailVerificationToken',
      EmailVerificationTokenSchema,
    );

    // Check for the specific user
    const userId = '6915ebef03e789dec987c290';
    console.log(`\n🔍 Looking for verification tokens for userId: ${userId}`);

    const tokens = await TokenModel.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .exec();

    console.log(`Found ${tokens.length} token(s):`);

    if (tokens.length === 0) {
      console.log('❌ No verification tokens found for this user');
    } else {
      tokens.forEach((token, index) => {
        console.log(`\nToken ${index + 1}:`);
        console.log(`  _id: ${token._id}`);
        console.log(`  userId: ${token.userId}`);
        console.log(`  codeHash: ${token.codeHash}`);
        console.log(`  expiresAt: ${token.expiresAt}`);
        console.log(`  createdAt: ${(token as any).createdAt}`);
        console.log(
          `  Is expired: ${token.expiresAt && token.expiresAt.getTime() < Date.now()}`,
        );
      });
    }

    // Also check all tokens to see if there are any for the email
    console.log(`\n🔍 Checking all verification tokens in database...`);
    const allTokens = await TokenModel.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    console.log(`Found ${allTokens.length} total token(s) in database:`);
    allTokens.forEach((token, index) => {
      console.log(
        `  ${index + 1}. userId: ${token.userId}, expiresAt: ${token.expiresAt}, expired: ${token.expiresAt && token.expiresAt.getTime() < Date.now()}`,
      );
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugVerificationToken().catch(console.error);
