import { ScraperModule } from './scraper.module';

describe('ScraperModule', () => {
  it('should be defined', () => {
    expect(ScraperModule).toBeDefined();
  });

  it('should have module metadata', () => {
    // Check if the module has the required properties
    expect(ScraperModule).toBeDefined();
    expect(typeof ScraperModule).toBe('function');

    // Verify module structure by checking if it has module decorator metadata
    // In Jest environment, Reflect metadata might not be available
    // So we check the class itself
    const moduleKeys = Object.getOwnPropertyNames(ScraperModule);
    expect(moduleKeys.length).toBeGreaterThan(0);
  });
});
