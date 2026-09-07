export type ApiSuccess<T> = {
  success: true;
  data: T;
  error: null;
  meta: Record<string, unknown>;
};

export type ApiFailure = {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
  meta: Record<string, unknown>;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, meta: Record<string, unknown> = {}): ApiSuccess<T> {
  return {
    success: true,
    data,
    error: null,
    meta
  };
}

export function fail(
  code: string,
  message: string,
  fields?: Record<string, string[]>
): ApiFailure {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      fields
    },
    meta: {}
  };
}
