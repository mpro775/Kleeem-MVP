import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFaq, updateFaq, deleteFaq } from './api';
import { knowledgeKeys } from './queries';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

export function useCreateFaq(merchantId: string) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (faq: Partial<any>) => createFaq(merchantId, faq),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.faqs(merchantId) });
    },
    onError: handleError,
  });
}

export function useUpdateFaq(merchantId: string) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: ({ faqId, faq }: { faqId: string; faq: Partial<any> }) =>
      updateFaq(faqId, faq),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.faqs(merchantId) });
    },
    onError: handleError,
  });
}

export function useDeleteFaq(merchantId: string) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (faqId: string) => deleteFaq(faqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.faqs(merchantId) });
    },
    onError: handleError,
  });
}

