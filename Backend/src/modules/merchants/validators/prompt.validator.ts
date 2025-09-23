import { Injectable } from '@nestjs/common';

import {
  PROMPT_TEMPLATES,
  TARGET_AUDIENCES,
  COMMUNICATION_STYLES,
  PROMPT_VALIDATION,
  PromptTemplate,
  TargetAudience,
  CommunicationStyle,
} from '../constants/prompt.constants';

@Injectable()
export class PromptValidator {
  /**
   * Validate prompt template
   */
  static validateTemplate(template: string): {
    valid: boolean;
    message?: string;
  } {
    if (!template || template.trim().length === 0) {
      return { valid: false, message: 'قالب الرسالة مطلوب' };
    }

    if (template.length < PROMPT_VALIDATION.MIN_TEMPLATE_LENGTH) {
      return {
        valid: false,
        message: `قالب الرسالة يجب أن يكون ${PROMPT_VALIDATION.MIN_TEMPLATE_LENGTH} أحرف على الأقل`,
      };
    }

    if (template.length > PROMPT_VALIDATION.MAX_TEMPLATE_LENGTH) {
      return {
        valid: false,
        message: `قالب الرسالة يجب ألا يتجاوز ${PROMPT_VALIDATION.MAX_TEMPLATE_LENGTH} حرف`,
      };
    }

    // Check for required variables
    const missingVariables = PROMPT_VALIDATION.REQUIRED_VARIABLES.filter(
      (variable) => !template.includes(variable),
    );

    if (missingVariables.length > 0) {
      return {
        valid: false,
        message: `قالب الرسالة يجب أن يحتوي على المتغيرات المطلوبة: ${missingVariables.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate prompt template type
   */
  static validatePromptTemplate(templateType: string): {
    valid: boolean;
    message?: string;
  } {
    if (
      !Object.values(PROMPT_TEMPLATES).includes(templateType as PromptTemplate)
    ) {
      return {
        valid: false,
        message: `نوع القالب غير صحيح. القيم المسموحة: ${Object.values(PROMPT_TEMPLATES).join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate target audience
   */
  static validateTargetAudience(audience: string): {
    valid: boolean;
    message?: string;
  } {
    if (!Object.values(TARGET_AUDIENCES).includes(audience as TargetAudience)) {
      return {
        valid: false,
        message: `الجمهور المستهدف غير صحيح. القيم المسموحة: ${Object.values(TARGET_AUDIENCES).join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate communication style
   */
  static validateCommunicationStyle(style: string): {
    valid: boolean;
    message?: string;
  } {
    if (
      !Object.values(COMMUNICATION_STYLES).includes(style as CommunicationStyle)
    ) {
      return {
        valid: false,
        message: `أسلوب التواصل غير صحيح. القيم المسموحة: ${Object.values(COMMUNICATION_STYLES).join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate business name for prompt
   */
  static validateBusinessName(businessName: string): {
    valid: boolean;
    message?: string;
  } {
    if (!businessName || businessName.trim().length === 0) {
      return { valid: false, message: 'اسم النشاط التجاري مطلوب' };
    }

    if (businessName.length > 100) {
      return {
        valid: false,
        message: 'اسم النشاط التجاري يجب ألا يتجاوز 100 حرف',
      };
    }

    return { valid: true };
  }

  /**
   * Validate customization fields
   */
  static validateCustomizations(customizations: Record<string, unknown>): {
    valid: boolean;
    message?: string;
  } {
    if (!customizations || typeof customizations !== 'object') {
      return { valid: true }; // Customizations are optional
    }

    const fieldCount = Object.keys(customizations).length;
    if (fieldCount > PROMPT_VALIDATION.MAX_CUSTOMIZATION_FIELDS) {
      return {
        valid: false,
        message: `عدد حقول التخصيص يجب ألا يتجاوز ${PROMPT_VALIDATION.MAX_CUSTOMIZATION_FIELDS}`,
      };
    }

    // Validate each customization value
    for (const [key, value] of Object.entries(customizations)) {
      if (typeof value === 'string' && value.length > 500) {
        return {
          valid: false,
          message: `قيمة الحقل "${key}" يجب ألا تتجاوز 500 حرف`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate user message for preview
   */
  static validateUserMessage(userMessage: string): {
    valid: boolean;
    message?: string;
  } {
    if (!userMessage || userMessage.trim().length === 0) {
      return { valid: false, message: 'رسالة المستخدم مطلوبة للمعاينة' };
    }

    if (userMessage.length > PROMPT_VALIDATION.MAX_TEMPLATE_LENGTH) {
      return {
        valid: false,
        message: `رسالة المستخدم يجب ألا تتجاوز ${PROMPT_VALIDATION.MAX_TEMPLATE_LENGTH} حرف`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate complete quick config data
   */
  static validateQuickConfig(data: {
    businessName?: string;
    businessType?: string;
    targetAudience?: string;
    communicationStyle?: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.businessName !== undefined) {
      const businessNameValidation = this.validateBusinessName(
        data.businessName,
      );
      if (!businessNameValidation.valid) {
        errors.push(businessNameValidation.message!);
      }
    }

    if (data.targetAudience !== undefined) {
      const audienceValidation = this.validateTargetAudience(
        data.targetAudience,
      );
      if (!audienceValidation.valid) {
        errors.push(audienceValidation.message!);
      }
    }

    if (data.communicationStyle !== undefined) {
      const styleValidation = this.validateCommunicationStyle(
        data.communicationStyle,
      );
      if (!styleValidation.valid) {
        errors.push(styleValidation.message!);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate advanced template data
   */
  static validateAdvancedTemplate(data: {
    template?: string;
    customTemplate?: string;
    customizations?: Record<string, unknown>;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.template !== undefined) {
      const templateValidation = this.validatePromptTemplate(data.template);
      if (!templateValidation.valid) {
        errors.push(templateValidation.message!);
      }
    }

    if (data.customTemplate !== undefined) {
      const customTemplateValidation = this.validateTemplate(
        data.customTemplate,
      );
      if (!customTemplateValidation.valid) {
        errors.push(customTemplateValidation.message!);
      }
    }

    if (data.customizations !== undefined) {
      const customizationsValidation = this.validateCustomizations(
        data.customizations,
      );
      if (!customizationsValidation.valid) {
        errors.push(customizationsValidation.message!);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract and validate variables in template
   */
  static extractTemplateVariables(template: string): string[] {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match: RegExpExecArray | null = null;
    while ((match = variableRegex.exec(template)) !== null) {
      variables.push(`{{${match[1]}}}`);
      match = variableRegex.exec(template);
    }

    return variables;
  }

  /**
   * Check if template has all required variables
   */
  static hasRequiredVariables(template: string): {
    valid: boolean;
    missing: string[];
  } {
    const templateVariables = this.extractTemplateVariables(template);
    const missing = PROMPT_VALIDATION.REQUIRED_VARIABLES.filter(
      (required) => !templateVariables.includes(required),
    );

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
