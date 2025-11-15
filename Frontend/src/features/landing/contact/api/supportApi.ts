import axios from '@/shared/api/axios';
import type { ContactPayload, ContactResponse } from '../types';

export function buildContactFormData(payload: ContactPayload, files?: File[] | FileList | null) {
  const fd = new FormData();
  const { ...rest } = payload;
  fd.append('payload', JSON.stringify(rest));
  if (files) {
    const arr = Array.from(files as FileList | File[]);
    arr.slice(0, 5).forEach((f) => fd.append('files', f));
  }
  return fd;
}

/**
 * يرسل نموذج التواصل إلى الباك-إند
 * يعتمد أن baseURL للـ axios يحتوي "/api" مسبقًا
 */
export async function submitContact(payload: ContactPayload, files?: File[] | FileList | null) {
  const data = buildContactFormData(payload, files);
  const res = await axios.post<ContactResponse>('/support/contact', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}