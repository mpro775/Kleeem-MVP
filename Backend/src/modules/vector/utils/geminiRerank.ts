import axios from 'axios';

const MAX_CANDIDATE_LENGTH = 300;
const MAX_OUTPUT_TOKENS = 40;
const TEMPERATURE = 0.1;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export async function geminiRerankTopN({
  query,
  candidates,
  topN = 5,
}: {
  query: string;
  candidates: string[];
  topN?: number;
}): Promise<number[]> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');

  validateAndFilterCandidates(candidates);
  const prompt = buildRerankPrompt(query, candidates, topN);
  const body = buildGeminiRequestBody(prompt);

  try {
    const response = await callGeminiAPI(GEMINI_API_KEY, body);
    return parseGeminiResponse(response, candidates);
  } catch (error: unknown) {
    const axiosError = error as {
      response?: { data?: unknown };
      message?: string;
    };
    console.error(
      'Gemini API Error:',
      axiosError.response?.data || axiosError.message,
    );
    throw new Error(
      (axiosError.response?.data as { error?: { message?: string } })?.error
        ?.message ||
        (axiosError.message ?? 'Unknown error'),
    );
  }
}

function validateAndFilterCandidates(candidates: string[]): void {
  const validCandidates = candidates
    .filter(Boolean)
    .map((c) => c.slice(0, MAX_CANDIDATE_LENGTH));
  if (validCandidates.length === 0) throw new Error('No valid candidates!');
}

function buildRerankPrompt(
  query: string,
  candidates: string[],
  topN: number,
): string {
  return `
  السؤال: "${query}"
  هذه قائمة المنتجات أو الإجابات:
  ${candidates.map((c, i) => `(${i + 1}): ${c}`).join('\n')}
  اختر لي أفضل ${topN}  إجابات أو منتجات الأكثر صلة بالسؤال.
  أعطني أرقامهم مفصولة بفواصل (مثال: 2,5,7).
  إذا لا يوجد جواب دقيق أكتب "لا يوجد جواب دقيق".
  `;
}

function buildGeminiRequestBody(prompt: string) {
  return {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
    },
  };
}

async function callGeminiAPI(apiKey: string, body: unknown) {
  return await axios.post<GeminiResponse>(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
      apiKey,
    body,
  );
}

function parseGeminiResponse(
  response: { data: GeminiResponse },
  candidates: string[],
): number[] {
  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (text.includes('لا يوجد جواب')) return [];

  const nums = text.match(/\d+/g)?.map(Number) ?? [];
  const indexes: number[] = nums
    .map((n) => n - 1)
    .filter((n) => n >= 0 && n < candidates.length);

  return indexes;
}
