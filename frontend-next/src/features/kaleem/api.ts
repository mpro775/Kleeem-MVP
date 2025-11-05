import { getKleemSessionId } from "./helper";
import type { KleemRateRequest, KleemRateResponse, KleemSendRequest, KleemSendResponse, KleemSessionResponse } from "./type";
import { parseAxiosError } from "./axios";
import axiosInstance from "@/lib/axios";

export async function sendKleemMessage(
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<KleemSendResponse> {
    const sessionId = getKleemSessionId();
    const payload: KleemSendRequest = { text, metadata };
    try {
      const { data } = await axiosInstance.post<KleemSendResponse>(
        `/kleem/chat/${sessionId}/message`,
        payload
      );
      return data;
    } catch (err) {
      throw parseAxiosError(err);
    }
  }
  
  export async function rateKleemMessage(
    msgIdx: number,
    rating: 0 | 1,
    feedback?: string
  ): Promise<KleemRateResponse> {
    const sessionId = getKleemSessionId();
    const payload: KleemRateRequest = { msgIdx, rating, feedback };
    try {
      const { data } = await axiosInstance.post<KleemRateResponse>(
        `/kleem/chat/${sessionId}/rate`,
        payload
      );
      return data;
    } catch (err) {
      throw parseAxiosError(err);
    }
  }
  
  // (اختياري) للاستعلام عن الجلسة عند استخدام Webhook غير متزامن + polling
  export async function fetchKleemSession(): Promise<KleemSessionResponse> {
    const sessionId = getKleemSessionId();
    try {
      const { data } = await axiosInstance.get<KleemSessionResponse>(
        `/kleem/chat/${sessionId}`
      );
      return data;
    } catch (err) {
      throw parseAxiosError(err);
    }
  }
  