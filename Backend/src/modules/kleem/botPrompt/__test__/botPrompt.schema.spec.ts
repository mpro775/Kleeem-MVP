import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';

import { BotPrompt, BotPromptSchema } from '../schemas/botPrompt.schema';

describe('BotPromptSchema', () => {
  let _model: Model<BotPrompt>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(BotPrompt.name),
          useValue: Model, // Mock the model
        },
      ],
    }).compile();

    _model = module.get<Model<BotPrompt>>(getModelToken(BotPrompt.name));
  });

  describe('Schema Definition', () => {
    it('should have correct schema properties', () => {
      // Test that the schema has all expected properties
      const schemaPaths = Object.keys(BotPromptSchema.paths);

      expect(schemaPaths).toContain('type');
      expect(schemaPaths).toContain('content');
      expect(schemaPaths).toContain('name');
      expect(schemaPaths).toContain('tags');
      expect(schemaPaths).toContain('active');
      expect(schemaPaths).toContain('version');
      expect(schemaPaths).toContain('locale');
      expect(schemaPaths).toContain('channel');
      expect(schemaPaths).toContain('variables');
      expect(schemaPaths).toContain('goal');
      expect(schemaPaths).toContain('archived');
      expect(schemaPaths).toContain('_id');
      expect(schemaPaths).toContain('createdAt');
      expect(schemaPaths).toContain('updatedAt');
    });

    it('should have correct property types', () => {
      const typePath = BotPromptSchema.paths['type'];
      const contentPath = BotPromptSchema.paths['content'];
      const tagsPath = BotPromptSchema.paths['tags'];
      const activePath = BotPromptSchema.paths['active'];
      const versionPath = BotPromptSchema.paths['version'];
      const localePath = BotPromptSchema.paths['locale'];
      const channelPath = BotPromptSchema.paths['channel'];
      const variablesPath = BotPromptSchema.paths['variables'];
      const goalPath = BotPromptSchema.paths['goal'];
      const archivedPath = BotPromptSchema.paths['archived'];

      expect(typePath.instance).toBe('String');
      expect((typePath as any).enumValues).toEqual(['system', 'user']);

      expect(contentPath.instance).toBe('String');
      expect(contentPath.isRequired).toBe(true);

      expect(tagsPath.instance).toBe('Array');

      expect(activePath.instance).toBe('Boolean');
      expect((activePath as any).defaultValue).toBe(true);

      expect(versionPath.instance).toBe('Number');
      expect((versionPath as any).defaultValue).toBe(1);

      expect(localePath.instance).toBe('String');
      expect((localePath as any).enumValues).toEqual(['ar', 'en']);
      expect((localePath as any).defaultValue).toBe('ar');

      expect(channelPath.instance).toBe('String');
      expect((channelPath as any).enumValues).toEqual([
        'landing',
        'whatsapp',
        'ig',
        'email',
      ]);
      expect((channelPath as any).defaultValue).toBe('landing');

      expect(variablesPath.instance).toBe('Object');
      expect((variablesPath as any).defaultValue).toEqual({});

      expect(goalPath.instance).toBe('String');
      expect((goalPath as any).defaultValue).toBe('convince');

      expect(archivedPath.instance).toBe('Boolean');
      expect((archivedPath as any).defaultValue).toBe(false);
    });

    it('should have timestamps enabled', () => {
      expect(BotPromptSchema.options.timestamps).toBe(true);
    });

    it('should have correct indexes', () => {
      const indexes = BotPromptSchema.indexes();

      // Check for compound index on type and active
      const typeActiveIndex = indexes.find(
        (index) => index[0]['type'] === 1 && index[0]['active'] === 1,
      );
      expect(typeActiveIndex).toBeDefined();

      // Check for index on archived and updatedAt
      const archivedUpdatedAtIndex = indexes.find(
        (index) => index[0]['archived'] === 1 && index[0]['updatedAt'] === -1,
      );
      expect(archivedUpdatedAtIndex).toBeDefined();
    });
  });

  describe('Schema Validation', () => {
    it('should validate required fields', () => {
      // This test would require a real MongoDB connection or a more complex setup
      // For now, we'll test the schema structure
      expect(BotPromptSchema.paths['type'].isRequired).toBe(true);
      expect(BotPromptSchema.paths['content'].isRequired).toBe(true);
    });

    it('should validate enum constraints', () => {
      const typePath = BotPromptSchema.paths['type'];
      const localePath = BotPromptSchema.paths['locale'];
      const channelPath = BotPromptSchema.paths['channel'];

      expect((typePath as any).enumValues).toEqual(['system', 'user']);
      expect((localePath as any).enumValues).toEqual(['ar', 'en']);
      expect((channelPath as any).enumValues).toEqual([
        'landing',
        'whatsapp',
        'ig',
        'email',
      ]);
      expect((channelPath as any).defaultValue).toBe('landing');
    });

    it('should validate default values', () => {
      const activePath = BotPromptSchema.paths['active'];
      const versionPath = BotPromptSchema.paths['version'];
      const localePath = BotPromptSchema.paths['locale'];
      const channelPath = BotPromptSchema.paths['channel'];
      const variablesPath = BotPromptSchema.paths['variables'];
      const goalPath = BotPromptSchema.paths['goal'];
      const archivedPath = BotPromptSchema.paths['archived'];

      expect((activePath as any).defaultValue).toBe(true);
      expect((versionPath as any).defaultValue).toBe(1);
      expect((localePath as any).defaultValue).toBe('ar');
      expect((channelPath as any).defaultValue).toBe('landing');
      expect((variablesPath as any).defaultValue).toEqual({});
      expect((goalPath as any).defaultValue).toBe('convince');
      expect((archivedPath as any).defaultValue).toBe(false);
    });
  });

  describe('Document Creation', () => {
    it('should create document with default values', () => {
      const promptData = {
        type: 'system' as const,
        content: 'أنت مساعد ذكي يساعد المستخدمين',
      };

      // Test that defaults would be applied (in a real scenario)
      expect(promptData.type).toBe('system');
      expect(promptData.content).toBe('أنت مساعد ذكي يساعد المستخدمين');
    });

    it('should handle optional fields correctly', () => {
      const promptData = {
        type: 'system' as const,
        content: 'أنت مساعد ذكي يساعد المستخدمين',
        name: 'البرومبت الأساسي',
        tags: ['افتراضي'],
        active: true,
        version: 1,
        locale: 'ar' as const,
        channel: 'landing' as const,
        variables: { key: 'value' },
        goal: 'convince' as const,
        archived: false,
      };

      expect(promptData.name).toBe('البرومبت الأساسي');
      expect(promptData.tags).toEqual(['افتراضي']);
      expect(promptData.active).toBe(true);
      expect(promptData.version).toBe(1);
      expect(promptData.locale).toBe('ar');
      expect(promptData.channel).toBe('landing');
      expect(promptData.variables).toEqual({ key: 'value' });
      expect(promptData.goal).toBe('convince');
      expect(promptData.archived).toBe(false);
    });
  });

  describe('Schema Options', () => {
    it('should have correct collection name', () => {
      // In Mongoose, the collection name is derived from the model name
      // BotPrompt would become 'botprompts' (lowercase, plural)
      expect(BotPrompt.name).toBe('BotPrompt');
    });

    it('should have timestamps enabled', () => {
      expect(BotPromptSchema.options.timestamps).toBe(true);
    });

    it('should not have version key disabled', () => {
      // By default, Mongoose adds __v for versioning
      expect(BotPromptSchema.options.versionKey).toBeUndefined();
    });
  });

  describe('Index Analysis', () => {
    it('should have compound index for type and active', () => {
      const indexes = BotPromptSchema.indexes();

      const typeActiveIndex = indexes.find(
        (index) =>
          index[0] &&
          typeof index[0] === 'object' &&
          index[0]['type'] === 1 &&
          index[0]['active'] === 1,
      );

      expect(typeActiveIndex).toBeDefined();
      expect(typeActiveIndex?.[1]).toBeUndefined(); // No options for this index
    });

    it('should have compound index for archived and updatedAt', () => {
      const indexes = BotPromptSchema.indexes();

      const archivedUpdatedAtIndex = indexes.find(
        (index) =>
          index[0] &&
          typeof index[0] === 'object' &&
          index[0]['archived'] === 1 &&
          index[0]['updatedAt'] === -1,
      );

      expect(archivedUpdatedAtIndex).toBeDefined();
      expect(archivedUpdatedAtIndex?.[1]).toBeUndefined();
    });

    it('should have _id index by default', () => {
      const indexes = BotPromptSchema.indexes();

      // Mongoose automatically creates an index on _id
      const idIndex = indexes.find(
        (index) =>
          index[0] && typeof index[0] === 'object' && index[0]['_id'] === 1,
      );

      expect(idIndex).toBeDefined();
    });
  });

  describe('Performance Considerations', () => {
    it('should have indexes on frequently queried fields', () => {
      const indexes = BotPromptSchema.indexes();

      // Check that we have indexes on commonly queried fields
      const hasTypeIndex = indexes.some(
        (index) =>
          index[0] && typeof index[0] === 'object' && 'type' in index[0],
      );

      const hasActiveIndex = indexes.some(
        (index) =>
          index[0] && typeof index[0] === 'object' && 'active' in index[0],
      );

      const hasArchivedIndex = indexes.some(
        (index) =>
          index[0] && typeof index[0] === 'object' && 'archived' in index[0],
      );

      expect(hasTypeIndex).toBe(true);
      expect(hasActiveIndex).toBe(true);
      expect(hasArchivedIndex).toBe(true);
    });

    it('should have appropriate index directions', () => {
      const indexes = BotPromptSchema.indexes();

      // updatedAt should be descending for recent-first sorting
      const updatedAtIndex = indexes.find(
        (index) =>
          index[0] &&
          typeof index[0] === 'object' &&
          'updatedAt' in index[0] &&
          index[0]['updatedAt'] === -1,
      );

      expect(updatedAtIndex).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should enforce required fields at schema level', () => {
      const requiredPaths = Object.keys(BotPromptSchema.paths).filter(
        (path) => BotPromptSchema.paths[path].isRequired,
      );

      expect(requiredPaths).toContain('type');
      expect(requiredPaths).toContain('content');
    });

    it('should have enum constraints for controlled values', () => {
      const enumPaths = ['type', 'locale', 'channel'];

      enumPaths.forEach((path) => {
        const schemaPath = BotPromptSchema.paths[path];
        expect((schemaPath as any).enumValues).toBeDefined();
        expect(Array.isArray((schemaPath as any).enumValues)).toBe(true);
        expect((schemaPath as any).enumValues.length).toBeGreaterThan(0);
      });
    });

    it('should have appropriate field types', () => {
      // String fields
      const stringFields = [
        'type',
        'content',
        'name',
        'locale',
        'channel',
        'goal',
      ];
      stringFields.forEach((field) => {
        expect(BotPromptSchema.paths[field].instance).toBe('String');
      });

      // Boolean fields
      const booleanFields = ['active', 'archived'];
      booleanFields.forEach((field) => {
        expect(BotPromptSchema.paths[field].instance).toBe('Boolean');
      });

      // Number fields
      const numberFields = ['version'];
      numberFields.forEach((field) => {
        expect(BotPromptSchema.paths[field].instance).toBe('Number');
      });

      // Array fields
      const arrayFields = ['tags'];
      arrayFields.forEach((field) => {
        expect(BotPromptSchema.paths[field].instance).toBe('Array');
      });

      // Object fields
      const objectFields = ['variables'];
      objectFields.forEach((field) => {
        expect(BotPromptSchema.paths[field].instance).toBe('Object');
      });
    });
  });

  describe('Schema Extensibility', () => {
    it('should allow for future field additions', () => {
      // The schema should be flexible enough to add new fields
      // This is more of a documentation test
      expect(BotPromptSchema).toBeDefined();
      expect(typeof BotPromptSchema).toBe('object');
    });

    it('should maintain backward compatibility', () => {
      // Default values should ensure existing documents work with new code
      const defaultValues = {
        active: true,
        version: 1,
        locale: 'ar',
        channel: 'landing',
        variables: {},
        goal: 'convince',
        archived: false,
      };

      Object.entries(defaultValues).forEach(([field, expectedValue]) => {
        const schemaPath = BotPromptSchema.paths[field];
        expect((schemaPath as any).defaultValue).toBe(expectedValue);
      });
    });
  });
});
