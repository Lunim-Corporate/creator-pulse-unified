export class BaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

export class ScraperError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'SCRAPER_ERROR', 500, details);
  }
}

export class ApiError extends BaseError {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, 'API_ERROR', statusCode, details);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class PerplexityError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'PERPLEXITY_ERROR', 500, details);
  }
}

export class AnalysisError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'ANALYSIS_ERROR', 500, details);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof BaseError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'UNKNOWN_ERROR'
    };
  }

  return {
    error: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR'
  };
}