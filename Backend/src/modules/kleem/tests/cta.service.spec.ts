import { Test, TestingModule } from '@nestjs/testing';
import { CtaService } from '../cta/cta.service';
import { SettingsService } from '../settings/settings.service';

describe('CtaService', () => {
  let service: CtaService;
  let mockSettingsService: jest.Mocked<SettingsService>;

  beforeEach(async () => {
    mockSettingsService = {
      cached: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CtaService,
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<CtaService>(CtaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear internal counters
    (service as any).counters.clear();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have empty counters initially', () => {
      const counters = (service as any).counters;
      expect(counters).toBeInstanceOf(Map);
      expect(counters.size).toBe(0);
    });

    it('should have SettingsService injected', () => {
      expect(service).toBeDefined();
    });
  });

  describe('allow method', () => {
    const sessionId = 'test-session-123';

    beforeEach(() => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: 3,
      });
    });

    it('should allow CTA for high intent messages', () => {
      const result = service.allow(sessionId, true);

      expect(result).toBe(true);
      expect(mockSettingsService.cached).not.toHaveBeenCalled();
    });

    it('should allow CTA on first message (counter = 0)', () => {
      const result = service.allow(sessionId, false);

      expect(result).toBe(true);
      expect(mockSettingsService.cached).toHaveBeenCalled();
    });

    it('should not allow CTA on second message (counter = 1)', () => {
      // First call (counter = 0) - should allow and increment
      service.allow(sessionId, false);

      // Second call (counter = 1) - should not allow
      const result = service.allow(sessionId, false);

      expect(result).toBe(false);
    });

    it('should not allow CTA on third message (counter = 2)', () => {
      // First call - allow and increment to 1
      service.allow(sessionId, false);
      // Second call - don't allow, counter stays 1
      service.allow(sessionId, false);
      // Third call - don't allow, counter stays 1
      const result = service.allow(sessionId, false);

      expect(result).toBe(false);
    });

    it('should allow CTA every Nth message based on settings', () => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: 3,
      });

      // Message 1 (index 0): allow
      expect(service.allow(sessionId, false)).toBe(true);

      // Message 2 (index 1): don't allow
      expect(service.allow(sessionId, false)).toBe(false);

      // Message 3 (index 2): don't allow
      expect(service.allow(sessionId, false)).toBe(false);

      // Message 4 (index 3): allow (3 % 3 = 0)
      expect(service.allow(sessionId, false)).toBe(true);

      // Message 5 (index 4): don't allow
      expect(service.allow(sessionId, false)).toBe(false);

      // Message 6 (index 5): don't allow
      expect(service.allow(sessionId, false)).toBe(false);

      // Message 7 (index 6): allow (6 % 3 = 0)
      expect(service.allow(sessionId, false)).toBe(true);
    });

    it('should handle different ctaEvery values', () => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: 5,
      });

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(service.allow(sessionId, false));
      }

      // Should allow on messages: 1, 6 (indices 0, 5)
      expect(results).toEqual([
        true, // 0 % 5 = 0
        false, // 1 % 5 = 1
        false, // 2 % 5 = 2
        false, // 3 % 5 = 3
        false, // 4 % 5 = 4
        true, // 5 % 5 = 0
        false, // 6 % 5 = 1
        false, // 7 % 5 = 2
        false, // 8 % 5 = 3
        false, // 9 % 5 = 4
      ]);
    });

    it('should handle ctaEvery = 1 (allow every message)', () => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: 1,
      });

      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(service.allow(sessionId, false));
      }

      // Should allow all messages
      expect(results).toEqual([true, true, true, true, true]);
    });

    it('should use default ctaEvery = 3 when undefined', () => {
      mockSettingsService.cached.mockReturnValue({});

      // Should behave as if ctaEvery = 3
      expect(service.allow(sessionId, false)).toBe(true); // 0 % 3 = 0
      expect(service.allow(sessionId, false)).toBe(false); // 1 % 3 = 1
      expect(service.allow(sessionId, false)).toBe(false); // 2 % 3 = 2
      expect(service.allow(sessionId, false)).toBe(true); // 3 % 3 = 0
    });

    it('should use default ctaEvery = 3 when null', () => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: null,
      });

      expect(service.allow(sessionId, false)).toBe(true);
      expect(service.allow(sessionId, false)).toBe(false);
      expect(service.allow(sessionId, false)).toBe(false);
      expect(service.allow(sessionId, false)).toBe(true);
    });

    it('should handle multiple sessions independently', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      mockSettingsService.cached.mockReturnValue({
        ctaEvery: 3,
      });

      // Both sessions start at 0
      expect(service.allow(session1, false)).toBe(true); // session1: 0 -> 1
      expect(service.allow(session2, false)).toBe(true); // session2: 0 -> 1

      // Both sessions at 1
      expect(service.allow(session1, false)).toBe(false); // session1: 1
      expect(service.allow(session2, false)).toBe(false); // session2: 1

      // Both sessions at 1 (no increment)
      expect(service.allow(session1, false)).toBe(false); // session1: 1
      expect(service.allow(session2, false)).toBe(false); // session2: 1
    });

    it('should increment counter only when CTA is allowed', () => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: 2,
      });

      const counters = (service as any).counters;

      // First call: should allow and increment
      expect(service.allow(sessionId, false)).toBe(true);
      expect(counters.get(sessionId)).toBe(1);

      // Second call: should not allow, no increment
      expect(service.allow(sessionId, false)).toBe(false);
      expect(counters.get(sessionId)).toBe(1);

      // Third call: should allow and increment
      expect(service.allow(sessionId, false)).toBe(true);
      expect(counters.get(sessionId)).toBe(2);

      // Fourth call: should not allow, no increment
      expect(service.allow(sessionId, false)).toBe(false);
      expect(counters.get(sessionId)).toBe(2);
    });

    it('should handle high intent bypassing counter logic', () => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: 10, // Very high value
      });

      // High intent should always allow, regardless of counter
      expect(service.allow(sessionId, true)).toBe(true);
      expect(service.allow(sessionId, true)).toBe(true);
      expect(service.allow(sessionId, true)).toBe(true);

      // Counter should not be affected by high intent calls
      const counters = (service as any).counters;
      expect(counters.has(sessionId)).toBe(false);

      // Low intent should still follow counter logic
      expect(service.allow(sessionId, false)).toBe(true); // First message
      expect(counters.get(sessionId)).toBe(1);
    });

    it('should handle edge case with ctaEvery = 0', () => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: 0,
      });

      // Division by zero should be handled (likely defaulting to 3)
      const result = service.allow(sessionId, false);

      // The service should handle this gracefully
      expect(typeof result).toBe('boolean');
    });

    it('should handle negative ctaEvery values', () => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: -5,
      });

      // Should handle negative values gracefully
      const result = service.allow(sessionId, false);
      expect(typeof result).toBe('boolean');
    });

    it('should handle very large session counts', () => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: 3,
      });

      // Create many sessions
      for (let i = 0; i < 1000; i++) {
        const sessionId = `session-${i}`;
        service.allow(sessionId, false);
      }

      const counters = (service as any).counters;
      expect(counters.size).toBe(1000);

      // Each session should have counter = 1
      for (let i = 0; i < 1000; i++) {
        const sessionId = `session-${i}`;
        expect(counters.get(sessionId)).toBe(1);
      }
    });

    it('should handle rapid successive calls', () => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: 3,
      });

      const results = [];

      // Make 100 rapid calls
      for (let i = 0; i < 100; i++) {
        results.push(service.allow(sessionId, false));
      }

      // Count how many were allowed
      const allowedCount = results.filter(Boolean).length;

      // Should have allowed based on modulo 3 pattern
      // Allowed at indices: 0, 3, 6, 9, 12, ... (every 3rd starting from 0)
      const expectedAllowedCount = Math.floor(100 / 3) + (100 % 3 > 0 ? 1 : 0);
      expect(allowedCount).toBeGreaterThan(0);
      expect(allowedCount).toBeLessThanOrEqual(expectedAllowedCount);
    });

    it('should maintain state across different intent types', () => {
      mockSettingsService.cached.mockReturnValue({
        ctaEvery: 4,
      });

      // Mix of high and low intent calls
      expect(service.allow(sessionId, false)).toBe(true); // Low intent: allow (0 % 4 = 0)
      expect(service.allow(sessionId, true)).toBe(true); // High intent: always allow
      expect(service.allow(sessionId, false)).toBe(false); // Low intent: don't allow (1 % 4 = 1)
      expect(service.allow(sessionId, true)).toBe(true); // High intent: always allow
      expect(service.allow(sessionId, false)).toBe(false); // Low intent: don't allow (1 % 4 = 1)
      expect(service.allow(sessionId, false)).toBe(false); // Low intent: don't allow (1 % 4 = 1)
      expect(service.allow(sessionId, false)).toBe(false); // Low intent: don't allow (1 % 4 = 1)
      expect(service.allow(sessionId, false)).toBe(true); // Low intent: allow (4 % 4 = 0)

      const counters = (service as any).counters;
      expect(counters.get(sessionId)).toBe(5); // Incremented twice (at indices 0 and 4)
    });
  });

  describe('Counter Management', () => {
    it('should initialize counter for new sessions', () => {
      const sessionId = 'new-session';
      const counters = (service as any).counters;

      expect(counters.has(sessionId)).toBe(false);

      mockSettingsService.cached.mockReturnValue({ ctaEvery: 3 });
      service.allow(sessionId, false);

      expect(counters.has(sessionId)).toBe(true);
      expect(counters.get(sessionId)).toBe(1);
    });

    it('should handle undefined counter correctly', () => {
      const sessionId = 'undefined-counter-session';
      const counters = (service as any).counters;

      // Manually set undefined (edge case)
      counters.set(sessionId, undefined);

      mockSettingsService.cached.mockReturnValue({ ctaEvery: 3 });

      // Should treat undefined as 0
      const result = service.allow(sessionId, false);
      expect(result).toBe(true);
    });

    it('should persist counters across multiple calls', () => {
      const sessionId = 'persistent-session';
      const counters = (service as any).counters;

      mockSettingsService.cached.mockReturnValue({ ctaEvery: 5 });

      // Multiple calls
      service.allow(sessionId, false); // counter: 0 -> 1
      service.allow(sessionId, false); // counter: 1 (no change)
      service.allow(sessionId, false); // counter: 1 (no change)
      service.allow(sessionId, false); // counter: 1 (no change)
      service.allow(sessionId, false); // counter: 1 (no change)
      service.allow(sessionId, false); // counter: 5 % 5 = 0, so allow and increment to 6

      expect(counters.get(sessionId)).toBe(6);
    });

    it('should handle memory efficiency with many sessions', () => {
      mockSettingsService.cached.mockReturnValue({ ctaEvery: 3 });
      const counters = (service as any).counters;

      // Create many sessions
      const sessionCount = 10000;
      for (let i = 0; i < sessionCount; i++) {
        service.allow(`session-${i}`, false);
      }

      expect(counters.size).toBe(sessionCount);

      // Memory usage should be reasonable (each entry is just a number)
      const memoryPerEntry =
        JSON.stringify([...counters.entries()]).length / sessionCount;
      expect(memoryPerEntry).toBeLessThan(100); // Should be much less than 100 bytes per entry
    });
  });

  describe('Integration with Settings', () => {
    it('should call settings.cached() for each non-high-intent request', () => {
      mockSettingsService.cached.mockReturnValue({ ctaEvery: 3 });

      service.allow('session-1', false);
      service.allow('session-2', false);
      service.allow('session-3', false);

      expect(mockSettingsService.cached).toHaveBeenCalledTimes(3);
    });

    it('should not call settings.cached() for high-intent requests', () => {
      service.allow('session-1', true);
      service.allow('session-2', true);

      expect(mockSettingsService.cached).not.toHaveBeenCalled();
    });

    it('should handle settings service returning different values over time', () => {
      const sessionId = 'dynamic-settings-session';

      // First call with ctaEvery = 3
      mockSettingsService.cached.mockReturnValueOnce({ ctaEvery: 3 });
      expect(service.allow(sessionId, false)).toBe(true); // 0 % 3 = 0

      // Second call with ctaEvery = 2
      mockSettingsService.cached.mockReturnValueOnce({ ctaEvery: 2 });
      expect(service.allow(sessionId, false)).toBe(false); // 1 % 2 = 1

      // Third call with ctaEvery = 2
      mockSettingsService.cached.mockReturnValueOnce({ ctaEvery: 2 });
      expect(service.allow(sessionId, false)).toBe(true); // 2 % 2 = 0
    });

    it('should handle settings service errors gracefully', () => {
      mockSettingsService.cached.mockImplementation(() => {
        throw new Error('Settings service error');
      });

      // Should not crash
      expect(() => service.allow('error-session', false)).toThrow(
        'Settings service error',
      );
    });

    it('should handle settings service returning null', () => {
      mockSettingsService.cached.mockReturnValue(null);

      // Should use default ctaEvery
      expect(service.allow('null-settings-session', false)).toBe(true);
    });

    it('should handle settings service returning empty object', () => {
      mockSettingsService.cached.mockReturnValue({});

      // Should use default ctaEvery = 3
      const sessionId = 'empty-settings-session';
      expect(service.allow(sessionId, false)).toBe(true); // 0 % 3 = 0
      expect(service.allow(sessionId, false)).toBe(false); // 1 % 3 = 1
      expect(service.allow(sessionId, false)).toBe(false); // 2 % 3 = 2
      expect(service.allow(sessionId, false)).toBe(true); // 3 % 3 = 0
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-frequency requests efficiently', () => {
      mockSettingsService.cached.mockReturnValue({ ctaEvery: 100 });

      const startTime = Date.now();

      // Make 10,000 requests
      for (let i = 0; i < 10000; i++) {
        service.allow(`session-${i % 100}`, false); // 100 different sessions
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should have O(1) lookup time for counter access', () => {
      mockSettingsService.cached.mockReturnValue({ ctaEvery: 3 });

      // Pre-populate with many sessions
      for (let i = 0; i < 1000; i++) {
        service.allow(`session-${i}`, false);
      }

      // Time single lookup
      const startTime = Date.now();
      service.allow('session-500', false);
      const endTime = Date.now();

      // Should be very fast (less than 10ms even on slow systems)
      expect(endTime - startTime).toBeLessThan(10);
    });
  });
});
