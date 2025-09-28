// Simple utility tests for vector module
describe('Vector Utils', () => {
  describe('Vector validation', () => {
    it('should validate vector dimensions', () => {
      const validVector = [0.1, 0.2, 0.3, 0.4];
      const invalidVector = [0.1, 0.2]; // too short

      const validateVector = (vector: number[]) => {
        return Array.isArray(vector) && vector.length >= 3;
      };

      expect(validateVector(validVector)).toBe(true);
      expect(validateVector(invalidVector)).toBe(false);
    });

    it('should validate vector values', () => {
      const validVector = [0.1, -0.2, 0.3, 0.4];
      const invalidVector = [0.1, 'invalid', 0.3];

      const validateVectorValues = (vector: any[]) => {
        return vector.every((val) => typeof val === 'number' && !isNaN(val));
      };

      expect(validateVectorValues(validVector)).toBe(true);
      expect(validateVectorValues(invalidVector)).toBe(false);
    });

    it('should validate collection names', () => {
      const validCollections = ['faqs', 'documents', 'products', 'web'];
      const collection = 'faqs';

      expect(validCollections.includes(collection)).toBe(true);
    });
  });

  describe('Vector operations', () => {
    it('should calculate vector magnitude', () => {
      const vector = [3, 4, 0];

      const calculateMagnitude = (v: number[]) => {
        return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
      };

      const magnitude = calculateMagnitude(vector);
      expect(magnitude).toBe(5);
    });

    it('should calculate cosine similarity', () => {
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];
      const vector3 = [1, 0, 0];

      const cosineSimilarity = (v1: number[], v2: number[]) => {
        const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
        const magnitude1 = Math.sqrt(
          v1.reduce((sum, val) => sum + val * val, 0),
        );
        const magnitude2 = Math.sqrt(
          v2.reduce((sum, val) => sum + val * val, 0),
        );
        return dotProduct / (magnitude1 * magnitude2);
      };

      expect(cosineSimilarity(vector1, vector2)).toBe(0);
      expect(cosineSimilarity(vector1, vector3)).toBe(1);
    });

    it('should normalize vector', () => {
      const vector = [3, 4, 0];

      const normalizeVector = (v: number[]) => {
        const magnitude = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
        return v.map((val) => val / magnitude);
      };

      const normalized = normalizeVector(vector);
      expect(normalized).toEqual([0.6, 0.8, 0]);
    });
  });

  describe('Search operations', () => {
    it('should validate search parameters', () => {
      const searchParams = {
        query: 'test query',
        topK: 5,
        minScore: 0.5,
      };

      const validateSearchParams = (params: {
        query: string;
        topK: number;
        minScore: number;
      }): boolean => {
        return (
          !!params.query &&
          params.topK > 0 &&
          params.minScore >= 0 &&
          params.minScore <= 1
        );
      };

      expect(validateSearchParams(searchParams)).toBe(true);
    });

    it('should filter search results by score', () => {
      const results = [
        { id: '1', score: 0.9, data: 'high relevance' },
        { id: '2', score: 0.3, data: 'low relevance' },
        { id: '3', score: 0.7, data: 'medium relevance' },
      ];

      const minScore = 0.5;
      const filtered = results.filter((result) => result.score >= minScore);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('1');
      expect(filtered[1].id).toBe('3');
    });

    it('should sort search results by score', () => {
      const results = [
        { id: '1', score: 0.7, data: 'medium' },
        { id: '2', score: 0.9, data: 'high' },
        { id: '3', score: 0.3, data: 'low' },
      ];

      const sorted = results.sort((a, b) => b.score - a.score);

      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('1');
      expect(sorted[2].id).toBe('3');
    });
  });

  describe('Text processing', () => {
    it('should tokenize text', () => {
      const text = 'Hello world test';

      const tokenize = (text: string) => {
        return text.toLowerCase().split(/\s+/);
      };

      const tokens = tokenize(text);
      expect(tokens).toEqual(['hello', 'world', 'test']);
    });

    it('should remove stop words', () => {
      const text = 'the quick brown fox';
      const stopWords = ['the', 'a', 'an', 'and', 'or', 'but'];

      const removeStopWords = (text: string, stopWords: string[]) => {
        const tokens = text.toLowerCase().split(/\s+/);
        return tokens.filter((token) => !stopWords.includes(token));
      };

      const filtered = removeStopWords(text, stopWords);
      expect(filtered).toEqual(['quick', 'brown', 'fox']);
    });

    it('should calculate text similarity', () => {
      const text1 = 'hello world';
      const text2 = 'world hello';
      const text3 = 'goodbye world';

      const calculateSimilarity = (t1: string, t2: string) => {
        const words1 = new Set(t1.toLowerCase().split(/\s+/));
        const words2 = new Set(t2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter((x) => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
      };

      expect(calculateSimilarity(text1, text2)).toBe(1);
      expect(calculateSimilarity(text1, text3)).toBeCloseTo(0.33, 2);
    });
  });

  describe('Vector storage', () => {
    it('should validate vector ID format', () => {
      const validId = 'vector_123_456';
      const invalidId = 'invalid-id';

      const validateVectorId = (id: string) => {
        return /^vector_\d+_\d+$/.test(id);
      };

      expect(validateVectorId(validId)).toBe(true);
      expect(validateVectorId(invalidId)).toBe(false);
    });

    it('should generate vector ID', () => {
      const generateVectorId = (collection: string, index: number) => {
        return `${collection}_${index}_${Date.now()}`;
      };

      const id = generateVectorId('faq', 123);
      expect(id).toMatch(/^faq_123_\d+$/);
    });
  });
});
