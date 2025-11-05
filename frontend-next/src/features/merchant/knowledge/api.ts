import axiosInstance from '@/lib/api/axios';
import type { FaqItem, Doc, LinkItem } from './types';

export async function fetchFaqs(merchantId: string): Promise<FaqItem[]> {
  const response = await axiosInstance.get<FaqItem[]>(`/merchants/${merchantId}/faqs`);
  return response.data || [];
}

export async function createFaq(merchantId: string, faq: Partial<FaqItem>): Promise<FaqItem> {
  const response = await axiosInstance.post<FaqItem>(`/merchants/${merchantId}/faqs`, faq);
  return response.data;
}

export async function updateFaq(faqId: string, faq: Partial<FaqItem>): Promise<FaqItem> {
  const response = await axiosInstance.patch<FaqItem>(`/faqs/${faqId}`, faq);
  return response.data;
}

export async function deleteFaq(faqId: string): Promise<void> {
  await axiosInstance.delete(`/faqs/${faqId}`);
}

export async function fetchDocs(merchantId: string): Promise<Doc[]> {
  const response = await axiosInstance.get<Doc[]>(`/merchants/${merchantId}/docs`);
  return response.data || [];
}

export async function fetchLinks(merchantId: string): Promise<LinkItem[]> {
  const response = await axiosInstance.get<LinkItem[]>(`/merchants/${merchantId}/links`);
  return response.data || [];
}

