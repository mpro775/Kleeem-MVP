import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StatsDocument = Stats & Document;

@Schema()
export class Stats {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['daily', 'weekly', 'monthly'],
    index: true,
  })
  period: 'daily' | 'weekly' | 'monthly';

  @Prop({ type: Date, required: true, index: true })
  date: Date; // بداية اليوم/الأسبوع/الشهر

  @Prop()
  productCount?: number;

  @Prop([
    {
      channel: String,
      count: Number,
    },
  ])
  messagesByChannel?: { channel: string; count: number }[];
}

export const StatsSchema = SchemaFactory.createForClass(Stats);
