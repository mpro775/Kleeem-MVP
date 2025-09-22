import type { OpenAPIObject } from '@nestjs/swagger';
import type { I18nService } from 'nestjs-i18n';

export function i18nizeSwagger(
  doc: OpenAPIObject,
  i18n: I18nService,
  lang = 'ar',
): OpenAPIObject {
  const I18N_PREFIX = 'i18n:';
  const I18N_PREFIX_LENGTH = I18N_PREFIX.length;

  const translate = (val: string): string => {
    if (typeof val === 'string' && val.startsWith(I18N_PREFIX)) {
      const key = val.slice(I18N_PREFIX_LENGTH);
      try {
        return i18n.translate(key, { lang });
      } catch {
        return key;
      }
    }
    return val;
  };

  translatePaths(doc, translate);
  translateTags(doc, translate);
  return doc;
}

function translatePaths(
  doc: OpenAPIObject,
  translate: (val: string) => string,
): void {
  const paths = (doc.paths ?? {}) as Record<string, any>;
  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    translateOperations(pathItem, translate);
  }
}

function translateOperations(
  pathItem: any,
  translate: (val: string) => string,
): void {
  const methods = [
    'get',
    'put',
    'post',
    'delete',
    'options',
    'head',
    'patch',
    'trace',
  ];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  const ops = methods.map((m) => pathItem[m]).filter(Boolean);

  for (const op of ops) {
    op.summary = translate(op.summary);
    op.description = translate(op.description);
    translateParameters(op, translate);
    translateResponses(op, translate);
  }
}

function translateParameters(
  op: any,
  translate: (val: string) => string,
): void {
  if (Array.isArray(op.parameters)) {
    for (const p of op.parameters as any[]) {
      if (p && typeof p === 'object') p.description = translate(p.description);
    }
  }
}

function translateResponses(op: any, translate: (val: string) => string): void {
  const responses = op.responses as Record<string, any> | undefined;
  if (responses && typeof responses === 'object') {
    for (const r of Object.values(responses)) {
      if (r && typeof r.description === 'string')
        r.description = translate(r.description);
    }
  }
}

function translateTags(
  doc: OpenAPIObject,
  translate: (val: string) => string,
): void {
  const tags = (doc.tags as any[]) || [];
  if (Array.isArray(tags)) {
    for (const t of tags) {
      if (t && typeof t === 'object') t.description = translate(t.description);
    }
  }
}
