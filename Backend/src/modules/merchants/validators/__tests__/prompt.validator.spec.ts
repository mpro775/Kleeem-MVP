import { PromptValidator } from '../prompt.validator';

describe('PromptValidator', () => {
  it('validates template length and required variables', () => {
    expect(PromptValidator.validateTemplate('')).toMatchObject({
      valid: false,
    });
    const minOk = '{{BUSINESS_NAME}} and {{TARGET_AUDIENCE}}'.padEnd(50, 'x');
    const res = PromptValidator.validateTemplate(minOk);
    expect(res.valid).toBe(true);
  });

  it('validates template type, audience, style', () => {
    expect(PromptValidator.validatePromptTemplate('invalid').valid).toBe(false);
    expect(PromptValidator.validateTargetAudience('invalid').valid).toBe(false);
    expect(PromptValidator.validateCommunicationStyle('invalid').valid).toBe(
      false,
    );
  });

  it('validates business name and customizations', () => {
    expect(PromptValidator.validateBusinessName('')).toMatchObject({
      valid: false,
    });
    expect(
      PromptValidator.validateCustomizations({ a: 'x'.repeat(600) }).valid,
    ).toBe(false);
    expect(PromptValidator.validateCustomizations({ a: 'ok' }).valid).toBe(
      true,
    );
  });

  it('validateQuickConfig aggregates errors', () => {
    const res = PromptValidator.validateQuickConfig({
      businessName: '',
      targetAudience: 'invalid',
      communicationStyle: 'invalid',
    });
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('validateAdvancedTemplate checks sections', () => {
    const res = PromptValidator.validateAdvancedTemplate({
      template: 'invalid',
      customTemplate: '',
      customizations: { a: 'x'.repeat(600) },
    });
    expect(res.valid).toBe(false);
  });

  it('extracts and checks required variables', () => {
    const tpl = 'Hello {{BUSINESS_NAME}} for {{TARGET_AUDIENCE}}';
    const vars = PromptValidator.extractTemplateVariables(tpl);
    expect(vars).toContain('{{BUSINESS_NAME}}');
    const hr = PromptValidator.hasRequiredVariables(tpl);
    expect(hr.valid).toBe(true);
  });
});
