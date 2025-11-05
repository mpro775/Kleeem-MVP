import { useQuery } from '@tanstack/react-query';
import { fetchFaqs, fetchDocs, fetchLinks } from './api';

export const knowledgeKeys = {
  all: ['knowledge'] as const,
  faqs: (merchantId: string) => [...knowledgeKeys.all, 'faqs', merchantId] as const,
  docs: (merchantId: string) => [...knowledgeKeys.all, 'docs', merchantId] as const,
  links: (merchantId: string) => [...knowledgeKeys.all, 'links', merchantId] as const,
};

export function useFaqs(merchantId: string) {
  return useQuery({
    queryKey: knowledgeKeys.faqs(merchantId),
    queryFn: () => fetchFaqs(merchantId),
    enabled: !!merchantId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useDocs(merchantId: string) {
  return useQuery({
    queryKey: knowledgeKeys.docs(merchantId),
    queryFn: () => fetchDocs(merchantId),
    enabled: !!merchantId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useLinks(merchantId: string) {
  return useQuery({
    queryKey: knowledgeKeys.links(merchantId),
    queryFn: () => fetchLinks(merchantId),
    enabled: !!merchantId,
    staleTime: 2 * 60 * 1000,
  });
}

