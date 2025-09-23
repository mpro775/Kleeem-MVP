// -----------------------------------------------------------------------------
// Types & type guards (no `any`)
export type ErrorPayload = {
  status: number;
  code: string;
  message: string;
  timestamp: string;
  requestId?: string;
  details?: Record<string, unknown>;
};

export type AxiosLikeError = {
  isAxiosError: true;
  config?: { url?: string; method?: string };
  response?: { status?: number; data?: unknown };
};

export type MongoValidationFieldError = {
  message: string;
  value?: unknown;
  kind?: string;
};

export type MongoValidationError = {
  name: 'ValidationError';
  errors?: Record<string, MongoValidationFieldError>;
};

export type MongoCastError = {
  name: 'CastError';
  path?: string;
  value?: unknown;
};

export type MongoServerError = {
  name: 'MongoServerError';
  code?: number;
  keyPattern?: Record<string, unknown>;
};

export type JwtErrorNames = 'JsonWebTokenError' | 'TokenExpiredError';
// Types & Guards (no `any`)
export type Emittable = {
  emit(event: string, data: unknown): void;
};
