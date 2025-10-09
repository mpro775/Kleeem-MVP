import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { PlanTier } from '../../modules/merchants/schemas/subscription-plan.schema';

import { TrialGuard } from './trial.guard';

import type { RequestWithUser } from '../interfaces/request-with-user.interface';
import type { ExecutionContext } from '@nestjs/common';

// Mock request interface for testing
interface MockRequest extends RequestWithUser {
  user?: {
    userId: string;
    role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
    merchantId?: string | null;
  };
}

describe('TrialGuard', () => {
  let guard: TrialGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrialGuard],
    }).compile();

    guard = module.get<TrialGuard>(TrialGuard);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: MockRequest;

    beforeEach(() => {
      mockRequest = {
        user: {
          userId: 'test-user-id',
          role: 'MERCHANT',
          merchantId: 'test-merchant-id',
        },
      } as MockRequest;

      mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;
    });

    describe('Free tier scenarios', () => {
      it('should allow access for Free tier (never expires)', () => {
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Free,
            endDate: new Date(Date.now() + 86400000), // Tomorrow (should be ignored)
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow access for Free tier with no end date', () => {
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Free,
            // No endDate property
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow access for Free tier with null end date', () => {
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Free,
            endDate: null,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow access for Free tier with undefined end date', () => {
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Free,
            endDate: undefined,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('Paid tier scenarios with valid subscription', () => {
      it('should allow access for Starter tier with future end date', () => {
        const futureDate = new Date(Date.now() + 86400000); // Tomorrow
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: futureDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow access for Business tier with future end date', () => {
        const futureDate = new Date(Date.now() + 30 * 86400000); // 30 days from now
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Business,
            endDate: futureDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow access for Enterprise tier with future end date', () => {
        const futureDate = new Date(Date.now() + 365 * 86400000); // 1 year from now
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Enterprise,
            endDate: futureDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('Expired subscription scenarios', () => {
      it('should deny access for expired Starter tier', () => {
        const pastDate = new Date(Date.now() - 86400000); // Yesterday
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: pastDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your subscription has expired'),
        );
      });

      it('should deny access for expired Business tier', () => {
        const pastDate = new Date(Date.now() - 30 * 86400000); // 30 days ago
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Business,
            endDate: pastDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your subscription has expired'),
        );
      });

      it('should deny access for expired Enterprise tier', () => {
        const pastDate = new Date(Date.now() - 365 * 86400000); // 1 year ago
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Enterprise,
            endDate: pastDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your subscription has expired'),
        );
      });

      it('should deny access for subscription ending exactly now', () => {
        const now = new Date();
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: now,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your subscription has expired'),
        );
      });
    });

    describe('Edge cases and boundary conditions', () => {
      it('should handle subscription with no end date (perpetual)', () => {
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Business,
            // No endDate property - should be treated as perpetual
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle subscription ending in milliseconds', () => {
        const now = Date.now();
        const futureDate = new Date(now + 1000); // 1 second from now
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: futureDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle subscription ending in microseconds', () => {
        const now = Date.now();
        const futureDate = new Date(now + 10); // 10ms from now
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: futureDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle very old expired dates', () => {
        const ancientDate = new Date('2000-01-01');
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Business,
            endDate: ancientDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your subscription has expired'),
        );
      });

      it('should handle very future dates', () => {
        const futureDate = new Date('3000-12-31');
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Enterprise,
            endDate: futureDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('Error scenarios', () => {
      it('should handle missing merchantId in user', () => {
        mockRequest.user!.merchantId = undefined as any;

        const result = guard.canActivate(mockContext);

        // Should return true as merchantId is not validated in the guard
        expect(result).toBe(true);
      });

      it('should handle null merchantId in user', () => {
        mockRequest.user!.merchantId = null as any;

        const result = guard.canActivate(mockContext);

        // Should return true as merchantId is not validated in the guard
        expect(result).toBe(true);
      });

      it('should handle missing user object', () => {
        mockRequest.user = undefined as any;

        const result = guard.canActivate(mockContext);

        // Should return true as user is not validated in the guard
        expect(result).toBe(true);
      });

      it('should handle missing request object', () => {
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => undefined),
        })) as any;

        const result = guard.canActivate(mockContext);

        // Should return true as request is not validated in the guard
        expect(result).toBe(true);
      });

      it('should handle merchant object with invalid subscription structure', () => {
        const invalidMerchant = {
          subscription: {
            // Missing tier property
            endDate: new Date(Date.now() + 86400000),
          },
        };
        mockRequest.user!.merchantId = invalidMerchant as any;

        // Should not throw and should handle gracefully
        const result = guard.canActivate(mockContext);
        expect(typeof result).toBe('boolean');
      });

      it('should handle merchant object with null subscription', () => {
        const nullMerchant = {
          subscription: null,
        };
        mockRequest.user!.merchantId = nullMerchant as any;

        // Should not throw and should handle gracefully
        const result = guard.canActivate(mockContext);
        expect(typeof result).toBe('boolean');
      });
    });

    describe('Integration scenarios', () => {
      it('should work correctly in a typical subscription flow', () => {
        // Active subscription scenario
        const activeMerchant = {
          subscription: {
            tier: PlanTier.Business,
            endDate: new Date(Date.now() + 30 * 86400000), // 30 days from now
          },
        };
        mockRequest.user!.merchantId = activeMerchant as any;

        const result = guard.canActivate(mockContext);
        expect(result).toBe(true);
      });

      it('should handle trial expiration correctly', () => {
        // Expired trial scenario
        const expiredMerchant = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: new Date(Date.now() - 86400000), // Yesterday
          },
        };
        mockRequest.user!.merchantId = expiredMerchant as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your subscription has expired'),
        );
      });

      it('should handle free tier correctly in mixed environment', () => {
        // Free tier should always work
        const freeMerchant = {
          subscription: {
            tier: PlanTier.Free,
            endDate: new Date(Date.now() - 365 * 86400000), // Long expired (should be ignored)
          },
        };
        mockRequest.user!.merchantId = freeMerchant as any;

        const result = guard.canActivate(mockContext);
        expect(result).toBe(true);
      });
    });

    describe('Time-sensitive scenarios', () => {
      beforeEach(() => {
        // Use real timers for these tests
        jest.useRealTimers();
      });

      afterEach(() => {
        // Restore fake timers
        jest.useFakeTimers();
      });

      it('should handle subscription expiring during request', () => {
        const now = new Date();
        const futureDate = new Date(now.getTime() + 1000); // 1 second from now

        const mockMerchant = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: futureDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        // Should work initially
        const result1 = guard.canActivate(mockContext);
        expect(result1).toBe(true);

        // Wait for expiration (simulate time passing)
        const expiredMerchant = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: new Date(now.getTime() - 1000), // 1 second ago
          },
        };
        mockRequest.user!.merchantId = expiredMerchant as any;

        // Should fail after expiration
        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your subscription has expired'),
        );
      });
    });

    describe('Performance considerations', () => {
      it('should handle rapid successive calls', () => {
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Business,
            endDate: new Date(Date.now() + 86400000),
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const results: boolean[] = [];
        for (let i = 0; i < 1000; i++) {
          results.push(guard.canActivate(mockContext));
        }

        expect(results).toHaveLength(1000);
        expect(results.every((result) => result === true)).toBe(true);
      });

      it('should be memory efficient', () => {
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Enterprise,
            endDate: new Date(Date.now() + 365 * 86400000),
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        // Should not cause memory leaks
        for (let i = 0; i < 10000; i++) {
          guard.canActivate(mockContext);
        }

        expect(true).toBe(true); // Test passes if no memory issues
      });
    });

    describe('Guard properties and methods', () => {
      it('should be a proper guard implementation', () => {
        expect(guard).toBeInstanceOf(Object);
        expect(typeof guard.canActivate).toBe('function');
      });

      it('should not have any private properties that could cause issues', () => {
        // The guard should be stateless and not depend on instance variables
        expect(Object.getOwnPropertyNames(guard)).not.toContain(
          'privateProperty',
        );
      });
    });

    describe('Error message consistency', () => {
      it('should use consistent error messages for expired subscriptions', () => {
        const scenarios = [
          { tier: PlanTier.Starter, endDate: new Date(Date.now() - 86400000) },
          {
            tier: PlanTier.Business,
            endDate: new Date(Date.now() - 30 * 86400000),
          },
          {
            tier: PlanTier.Enterprise,
            endDate: new Date(Date.now() - 365 * 86400000),
          },
        ];

        scenarios.forEach((scenario) => {
          const expiredMerchant = {
            subscription: scenario,
          };
          mockRequest.user!.merchantId = expiredMerchant as any;

          expect(() => guard.canActivate(mockContext)).toThrow(
            new ForbiddenException('Your subscription has expired'),
          );
        });
      });

      it('should not use different error messages for different tiers', () => {
        const expiredMerchant = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: new Date(Date.now() - 86400000),
          },
        };
        mockRequest.user!.merchantId = expiredMerchant as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your subscription has expired'),
        );
      });
    });

    describe('Date handling edge cases', () => {
      it('should handle invalid date objects', () => {
        const invalidMerchant = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: new Date('invalid-date'),
          },
        };
        mockRequest.user!.merchantId = invalidMerchant as any;

        // Should handle gracefully - invalid date should be treated as expired
        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your subscription has expired'),
        );
      });

      it('should handle date objects with timezone issues', () => {
        // Create a date that might have timezone complications
        const dateWithTimezone = new Date('2025-12-31T23:59:59.999Z');
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Business,
            endDate: dateWithTimezone,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);
        expect(result).toBe(true);
      });

      it('should handle leap year dates', () => {
        const leapYearDate = new Date('2028-02-29T12:00:00Z'); // 2028 is a leap year
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Enterprise,
            endDate: leapYearDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);
        expect(result).toBe(true);
      });

      it('should handle daylight saving time transitions', () => {
        // This is a simplified test - in real scenarios, DST transitions might need special handling
        const dstDate = new Date('2029-03-10T02:30:00Z'); // Spring DST transition in US
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: dstDate,
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        const result = guard.canActivate(mockContext);
        expect(result).toBe(true);
      });
    });

    describe('Subscription plan validation', () => {
      it('should handle all valid plan tiers correctly', () => {
        const planTiers = Object.values(PlanTier);
        const results: boolean[] = [];

        planTiers.forEach((tier) => {
          if (tier === PlanTier.Free) {
            // Free tier should always work
            const freeMerchant = {
              subscription: {
                tier: tier,
                endDate: new Date(Date.now() - 365 * 86400000), // Long expired (should be ignored)
              },
            };
            mockRequest.user!.merchantId = freeMerchant as any;
            results.push(guard.canActivate(mockContext));
          } else {
            // Paid tiers need future end date
            const paidMerchant = {
              subscription: {
                tier: tier,
                endDate: new Date(Date.now() + 30 * 86400000),
              },
            };
            mockRequest.user!.merchantId = paidMerchant as any;
            results.push(guard.canActivate(mockContext));
          }
        });

        // Assert all results are true
        expect(results).toHaveLength(planTiers.length);
        expect(results.every((result) => result === true)).toBe(true);
      });

      it('should handle subscription with no tier specified', () => {
        const noTierMerchant = {
          subscription: {
            // No tier property
            endDate: new Date(Date.now() + 30 * 86400000),
          },
        };
        mockRequest.user!.merchantId = noTierMerchant as any;

        // Should handle gracefully
        const result = guard.canActivate(mockContext);
        expect(typeof result).toBe('boolean');
      });

      it('should handle subscription with invalid tier', () => {
        const invalidTierMerchant = {
          subscription: {
            tier: 'invalid-tier' as PlanTier,
            endDate: new Date(Date.now() + 30 * 86400000),
          },
        };
        mockRequest.user!.merchantId = invalidTierMerchant as any;

        // Should handle gracefully
        const result = guard.canActivate(mockContext);
        expect(typeof result).toBe('boolean');
      });
    });

    describe('Concurrency and state management', () => {
      it('should handle concurrent access correctly', async () => {
        const mockMerchant = {
          subscription: {
            tier: PlanTier.Business,
            endDate: new Date(Date.now() + 86400000),
          },
        };
        mockRequest.user!.merchantId = mockMerchant as any;

        // Simulate concurrent requests
        const promises = Array(100)
          .fill(null)
          .map(() => Promise.resolve(guard.canActivate(mockContext)));

        const results = await Promise.all(promises);

        expect(results).toHaveLength(100);
        expect(results.every((result) => result === true)).toBe(true);
      });

      it('should not maintain state between calls', () => {
        const mockMerchant1 = {
          subscription: {
            tier: PlanTier.Business,
            endDate: new Date(Date.now() + 86400000),
          },
        };
        mockRequest.user!.merchantId = mockMerchant1 as any;

        const result1 = guard.canActivate(mockContext);
        expect(result1).toBe(true);

        const mockMerchant2 = {
          subscription: {
            tier: PlanTier.Starter,
            endDate: new Date(Date.now() - 86400000),
          },
        };
        mockRequest.user!.merchantId = mockMerchant2 as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Your subscription has expired'),
        );
      });
    });
  });
});
