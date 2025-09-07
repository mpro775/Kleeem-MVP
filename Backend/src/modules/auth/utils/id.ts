// helpers/id.ts
import { Types } from 'mongoose';
export const toStr = (v?: Types.ObjectId | null) => (v ? String(v) : null);
