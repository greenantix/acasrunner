import { firebaseAdmin } from './admin';

export class ACASError extends Error {
  constructor(
    message: string,
    public errorCode?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ACASError';
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  async logError(
    error: Error,
    userUid?: string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      const db = firebaseAdmin.getFirestore();
      
      const errorDoc = {
        errorType: error.name,
        errorMessage: error.message,
        stackTrace: error.stack,
        userUid,
        context: context || {},
        timestamp: new Date(),
      };

      if (error instanceof ACASError) {
        errorDoc.errorCode = error.errorCode;
        errorDoc.details = error.details;
      }

      await db.collection('errorLogs').add(errorDoc);
    } catch (logError) {
      console.error('Failed to log error to Firebase:', logError);
      // Fallback to console logging
      console.error('Original error:', error);
    }
  }

  handleFirebaseError(error: any): { statusCode: number; message: string } {
    const errorMessage = error.message || String(error);

    if (errorMessage.includes('permission-denied')) {
      return { statusCode: 403, message: 'Permission denied' };
    }
    
    if (errorMessage.includes('not-found')) {
      return { statusCode: 404, message: 'Resource not found' };
    }
    
    if (errorMessage.includes('already-exists')) {
      return { statusCode: 409, message: 'Resource already exists' };
    }
    
    if (errorMessage.includes('invalid-argument')) {
      return { statusCode: 400, message: 'Invalid request data' };
    }
    
    if (errorMessage.includes('unauthenticated')) {
      return { statusCode: 401, message: 'Authentication required' };
    }
    
    if (errorMessage.includes('deadline-exceeded') || errorMessage.includes('timeout')) {
      return { statusCode: 408, message: 'Request timeout' };
    }
    
    if (errorMessage.includes('quota-exceeded') || errorMessage.includes('rate-limit')) {
      return { statusCode: 429, message: 'Rate limit exceeded' };
    }

    console.error('Unexpected Firebase error:', error);
    return { statusCode: 500, message: 'Internal server error' };
  }

  async getErrorStats(timeRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const db = firebaseAdmin.getFirestore();
      
      let query = db.collection('errorLogs');
      
      if (timeRange) {
        query = query
          .where('timestamp', '>=', timeRange.start)
          .where('timestamp', '<=', timeRange.end);
      }

      const snapshot = await query.get();
      const errors: any[] = [];
      
      snapshot.forEach((doc) => {
        errors.push(doc.data());
      });

      const stats = {
        totalErrors: errors.length,
        errorsByType: errors.reduce((acc, error) => {
          acc[error.errorType] = (acc[error.errorType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        errorsByUser: errors.reduce((acc, error) => {
          if (error.userUid) {
            acc[error.userUid] = (acc[error.userUid] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        recentErrors: errors
          .sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate())
          .slice(0, 10),
      };

      return stats;
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return null;
    }
  }

  createErrorMiddleware() {
    return async (error: Error, userUid?: string, context?: Record<string, any>) => {
      await this.logError(error, userUid, context);
      
      if (error instanceof ACASError) {
        return {
          statusCode: 400,
          message: error.message,
          code: error.errorCode,
          details: error.details,
        };
      }

      const firebaseError = this.handleFirebaseError(error);
      return firebaseError;
    };
  }
}

export const errorHandler = ErrorHandler.getInstance();

export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  userUid?: string,
  context?: Record<string, any>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      await errorHandler.logError(error as Error, userUid, context);
      throw error;
    }
  };
}