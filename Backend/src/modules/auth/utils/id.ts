// helpers/id.ts
import type { Types } from 'mongoose';
export const toStr = (v?: Types.ObjectId | null) => (v ? String(v) : null);
