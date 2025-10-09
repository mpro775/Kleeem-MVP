import { renderPrompt } from '../template.service';

describe('renderPrompt', () => {
  it('should replace single variable in template', () => {
    const template = 'Hello {NAME}, welcome to {PLATFORM}!';
    const vars = { NAME: 'John', PLATFORM: 'our app' };
    const result = renderPrompt(template, vars);
    expect(result).toBe('Hello John, welcome to our app!');
  });

  it('should replace multiple occurrences of same variable', () => {
    const template = '{GREETING} {NAME}! {GREETING} {NAME}, how are you?';
    const vars = { GREETING: 'Hi', NAME: 'Alice' };
    const result = renderPrompt(template, vars);
    expect(result).toBe('Hi Alice! Hi Alice, how are you?');
  });

  it('should handle numeric values in variables', () => {
    const template = 'You have {COUNT} messages and {SCORE} points';
    const vars = { COUNT: '5', SCORE: '100' };
    const result = renderPrompt(template, vars);
    expect(result).toBe('You have 5 messages and 100 points');
  });

  it('should handle empty string template', () => {
    const template = '';
    const vars = { NAME: 'John' };
    const result = renderPrompt(template, vars);
    expect(result).toBe('');
  });

  it('should handle null/undefined template', () => {
    const vars = { NAME: 'John' };
    const result = renderPrompt(null as any, vars);
    expect(result).toBe('');
  });

  it('should leave undefined variables unchanged', () => {
    const template = 'Hello {NAME}, your balance is {BALANCE}';
    const vars = { NAME: 'John' }; // BALANCE is not provided
    const result = renderPrompt(template, vars);
    expect(result).toBe('Hello John, your balance is {BALANCE}');
  });

  it('should handle empty variables object', () => {
    const template = 'Hello {NAME}, welcome!';
    const vars = {};
    const result = renderPrompt(template, vars);
    expect(result).toBe('Hello {NAME}, welcome!');
  });

  it('should handle variables with special characters', () => {
    const template = 'Path: {PATH}, URL: {URL}';
    const vars = { PATH: '/user/{id}/profile', URL: 'https://example.com' };
    const result = renderPrompt(template, vars);
    expect(result).toBe('Path: /user/{id}/profile, URL: https://example.com');
  });

  it('should handle template with no variables', () => {
    const template = 'This is a static message without variables';
    const vars = { NAME: 'John' };
    const result = renderPrompt(template, vars);
    expect(result).toBe('This is a static message without variables');
  });

  it('should handle case sensitive variable replacement', () => {
    const template = 'Hello {name}, welcome {NAME}!';
    const vars = { name: 'john', NAME: 'JOHN' };
    const result = renderPrompt(template, vars);
    expect(result).toBe('Hello {name}, welcome JOHN!');
  });

  it('should handle variables with underscores and numbers', () => {
    const template = 'User {USER_ID} has {SCORE_1} points';
    const vars = { USER_ID: '123', SCORE_1: '500' };
    const result = renderPrompt(template, vars);
    expect(result).toBe('User 123 has 500 points');
  });

  it('should handle empty variable values', () => {
    const template = 'Hello {NAME}, you have {MESSAGE}';
    const vars = { NAME: '', MESSAGE: '0 messages' };
    const result = renderPrompt(template, vars);
    expect(result).toBe('Hello , you have 0 messages');
  });

  it('should handle complex template with multiple variable types', () => {
    const template =
      'Dear {CUSTOMER_NAME},\n\nYour order #{ORDER_ID} for {PRODUCT_NAME} has been {STATUS}.\n\nTotal: ${AMOUNT}\nDate: {DATE}\n\nThank you for choosing {COMPANY_NAME}!';
    const vars = {
      CUSTOMER_NAME: 'Ahmed Al-Rashid',
      ORDER_ID: 'ORD-2024-001',
      PRODUCT_NAME: 'Premium Package',
      STATUS: 'shipped',
      AMOUNT: '299.99',
      DATE: '2024-01-15',
      COMPANY_NAME: 'TechCorp Solutions',
    };
    const result = renderPrompt(template, vars);
    const expected =
      'Dear Ahmed Al-Rashid,\n\nYour order #ORD-2024-001 for Premium Package has been shipped.\n\nTotal: $299.99\nDate: 2024-01-15\n\nThank you for choosing TechCorp Solutions!';
    expect(result).toBe(expected);
  });

  it('should handle variables that look like they should be replaced but are not in vars object', () => {
    const template = 'Contact us at {PHONE} or {EMAIL} for support';
    const vars = { PHONE: '123-456-7890' }; // EMAIL is not provided
    const result = renderPrompt(template, vars);
    expect(result).toBe('Contact us at 123-456-7890 or {EMAIL} for support');
  });

  it('should handle template with only closing braces (no opening brace)', () => {
    const template = 'Template with } closing brace but no opening';
    const vars = { NAME: 'John' };
    const result = renderPrompt(template, vars);
    expect(result).toBe('Template with } closing brace but no opening');
  });

  it('should handle template with malformed braces', () => {
    const template = 'Template with {incomplete and {VALID} and } incomplete';
    const vars = { VALID: 'replaced' };
    const result = renderPrompt(template, vars);
    expect(result).toBe(
      'Template with {incomplete and replaced and } incomplete',
    );
  });
});
