// src/api/adminKleemRatings.ts
import axios from 'axios';
const BASE = `${import.meta.env.VITE_API_BASE}/admin/kleem/bot-chats/ratings`;

export type RatingRow = {
  id: string;           // مُعرّف اصطناعي (sessionId + timestamp)
  sessionId: string;
  message: string;
  feedback?: string | null;
  rating: 0 | 1;
  timestamp: string;
};

export async function fetchRatings(params: {
  page?: number; limit?: number;
  rating?: '1' | '0';
  q?: string; sessionId?: string;
  from?: string; to?: string;
}) {
  const { data } = await axios.get(BASE, { params });
  return data as { items: RatingRow[]; total: number; page: number; limit: number };
}

export async function fetchRatingsStats(params?: { from?: string; to?: string }) {
  const { data } = await axios.get(`${BASE}/stats`, { params });
  return data as {
    summary: { totalRated: number; thumbsUp: number; thumbsDown: number; upRate: number };
    weekly: { _id: { y: number; w: number }; total: number; up: number; down: number }[];
    topBad: { text: string; count: number; feedbacks: string[] }[];
  };
}
