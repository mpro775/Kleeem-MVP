import 'dotenv/config';
import mongoose, { Schema, Types } from 'mongoose';

// سكيمة فرعية للرسالة مع _id افتراضي
const SingleMessageSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
    role: { type: String, enum: ['customer', 'bot', 'agent'], required: true },
    text: String,
    timestamp: Date,
    metadata: Schema.Types.Mixed,
    keywords: [String],
    rating: { type: Number, enum: [1, 0, null], default: null },
    feedback: { type: String, default: null },
    ratedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ratedAt: { type: Date, default: null },
  },
  { _id: false }
);

const MessageSessionSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    sessionId: { type: String, required: true },
    transport: { type: String, enum: ['api', 'qr'], default: null },
    channel: { type: String, enum: ['whatsapp', 'telegram', 'webchat'], required: true },
    handoverToAgent: { type: Boolean, default: false },
    messages: { type: [SingleMessageSchema], default: [] },
  },
  { timestamps: true }
);

async function run() {
  const uri = process.env.MONGO_URI!;
  if (!uri) {
    console.error('❌ MONGO_URI غير معرّف');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const Model = mongoose.model('MessageSession', MessageSessionSchema, 'messagesessions');

  const cursor = Model.find({ 'messages._id': { $exists: false } }).cursor();
  let updatedDocs = 0;

  for await (const doc of cursor) {
    let changed = false;
    doc.messages.forEach((m: any) => {
      if (!m._id) {
        changed = true;
        m._id = new Types.ObjectId();
      }
    });
    if (changed) {
      doc.markModified('messages');
      await doc.save();
      updatedDocs++;
    }
  }

  console.log('✅ Updated documents:', updatedDocs);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
