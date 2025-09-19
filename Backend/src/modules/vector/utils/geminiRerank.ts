import axios from 'axios';

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
  // تحقق من نصوص المرشحين قبل الإرسال
  const validCandidates = candidates
    .filter(Boolean)
    .map((c) => c.slice(0, 300));
  if (validCandidates.length === 0) throw new Error('No valid candidates!');

  const prompt = `
  السؤال: "${query}"
  هذه قائمة المنتجات أو الإجابات:
  ${candidates.map((c, i) => `(${i + 1}): ${c}`).join('\n')}
  اختر لي أفضل ${topN}  إجابات أو منتجات الأكثر صلة بالسؤال.  
  أعطني أرقامهم مفصولة بفواصل (مثال: 2,5,7).  
  إذا لا يوجد جواب دقيق أكتب "لا يوجد جواب دقيق".
  `;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 40, temperature: 0.1 },
  };

  try {
    const { data } = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
        GEMINI_API_KEY,
      body,
    );
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (text.includes('لا يوجد جواب')) return [];
    // التقط الأرقام
    const nums = text.match(/\d+/g)?.map(Number) ?? [];
    // حوّل إلى اندكس (0-based)
    const indexes: number[] = nums
      .map((n) => n - 1)
      .filter((n) => n >= 0 && n < candidates.length);

    return indexes;
  } catch (error: any) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || error.message);
  }
}
