/**
 * Centralized error handling for API routes
 */

import { NextResponse } from 'next/server';

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export class ApiErrorHandler {
  /**
   * Handle errors consistently across all API routes
   */
  static handle(error: any, context?: string): NextResponse {
    console.error(`${context ? `${context} - ` : ''}API Error:`, error);

    // Determine error type and return appropriate response
    if (error.status && typeof error.status === 'number') {
      // Error already has a status code
      return NextResponse.json(
        { error: error.message || 'An error occurred' },
        { status: error.status }
      );
    }

    // Handle validation errors
    if (error.name === 'ZodError' || error.fieldErrors || error.formErrors) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.errors || error.fieldErrors 
        },
        { status: 400 }
      );
    }

    // Handle database errors
    if (error.code && ['23505', '23503', '23514'].includes(error.code)) {
      return NextResponse.json(
        { 
          error: 'Database constraint violation',
          details: error.message
        },
        { status: 400 }
      );
    }

    // Handle unauthorized errors
    if (error.message?.toLowerCase().includes('unauthorized') || 
        error.message?.toLowerCase().includes('auth') || 
        error.status === 401) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Handle forbidden errors
    if (error.status === 403 || error.message?.toLowerCase().includes('forbidden')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Handle not found errors
    if (error.status === 404 || error.message?.toLowerCase().includes('not found')) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // Handle rate limit errors
    if (error.message?.toLowerCase().includes('rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Default server error
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' ? { details: error.message } : {})
      },
      { status: 500 }
    );
  }

  /**
   * Create a standardized success response
   */
  static success(data: any, status: number = 200) {
    return NextResponse.json({ data }, { status });
  }

  /**
   * Create a standardized error response
   */
  static error(message: string, status: number = 500, details?: any) {
    const response: ApiError = { message };
    
    if (details) {
      response.details = details;
    }

    return NextResponse.json({ error: response }, { status });
  }
}

/**
 * Wrapper function to safely execute API handlers with consistent error handling
 */
export async function withErrorHandling<T>(
  handler: () => Promise<T>,
  context?: string
): Promise<NextResponse> {
  try {
    const result = await handler();
    return ApiErrorHandler.success(result);
  } catch (error) {
    return ApiErrorHandler.handle(error, context);
  }
}