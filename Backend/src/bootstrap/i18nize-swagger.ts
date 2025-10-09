import type { OpenAPIObject } from '@nestjs/swagger';
import type {
  OperationObject,
  ParameterObject,
  PathItemObject,
  ResponseObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import type { I18nService } from 'nestjs-i18n';

export function i18nizeSwagger(
  doc: OpenAPIObject,
  i18n: I18nService,
  lang = 'ar',
): OpenAPIObject {
  const I18N_PREFIX = 'i18n:';
  const I18N_PREFIX_LENGTH = I18N_PREFIX.length;

  const translate = (val?: string): string | undefined => {
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
  translate: (val?: string) => string | undefined,
): void {
  const paths: Record<string, PathItemObject> = doc.paths ?? {};
  for (const pathItem of Object.values(paths)) {
    if (pathItem) translateOperations(pathItem, translate);
  }
}

function translateOperations(
  pathItem: PathItemObject,
  translate: (val?: string) => string | undefined,
): void {
  const methods: (keyof PathItemObject)[] = [
    'get',
    'put',
    'post',
    'delete',
    'options',
    'head',
    'patch',
    'trace',
  ];

  for (const m of methods) {
    const op: OperationObject | undefined = pathItem[m] as
      | OperationObject
      | undefined;
    if (!op) continue;

    const translatedSummary = translate(op.summary);
    if (translatedSummary !== undefined) {
      op.summary = translatedSummary;
    }
    const translatedDescription = translate(op.description);
    if (translatedDescription !== undefined) {
      op.description = translatedDescription;
    }

    translateParameters(op, translate);
    translateResponses(op, translate);
  }
}

function translateParameters(
  op: OperationObject,
  translate: (val?: string) => string | undefined,
): void {
  if (Array.isArray(op.parameters)) {
    for (const p of op.parameters as ParameterObject[]) {
      const translatedDesc = translate(p.description);
      if (translatedDesc !== undefined) {
        p.description = translatedDesc;
      }
    }
  }
}

function translateResponses(
  op: OperationObject,
  translate: (val?: string) => string | undefined,
): void {
  const responses = op.responses;
  if (responses) {
    for (const r of Object.values(responses) as ResponseObject[]) {
      if (typeof r.description === 'string') {
        r.description = translate(r.description) as string;
      }
    }
  }
}

function translateTags(
  doc: OpenAPIObject,
  translate: (val?: string) => string | undefined,
): void {
  const tags = doc.tags;
  if (Array.isArray(tags)) {
    for (const t of tags) {
      const translatedDesc = translate(t.description);
      if (translatedDesc !== undefined) {
        t.description = translatedDesc;
      }
    }
  }
}
