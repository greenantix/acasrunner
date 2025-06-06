import { ActivityEvent, activityService } from './activity-service';

export interface ErrorDetails {
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  source?: string;
}

export class ErrorMonitor {
  private isActive = false;
  private originalErrorHandler:
    | ((
        event: Event | string,
        source?: string,
        lineno?: number,
        colno?: number,
        error?: Error
      ) => boolean | void)
    | null = null;
  private originalRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  constructor() {
    this.handleError = this.handleError.bind(this);
    this.handleRejection = this.handleRejection.bind(this);
    this.handleErrorEvent = this.handleErrorEvent.bind(this);
  }

  start(): void {
    if (this.isActive) {
      console.warn('Error monitor is already active');
      return;
    }

    // Store original handlers
    this.originalErrorHandler = window.onerror;
    this.originalRejectionHandler = window.onunhandledrejection;

    // Set up global error handlers
    window.addEventListener('error', this.handleErrorEvent);
    window.onunhandledrejection = this.handleRejection;

    // Set up console error override
    this.overrideConsoleError();

    this.isActive = true;
    activityService.logSystemEvent('Error monitoring started', 'error-monitor');
  }

  stop(): void {
    if (!this.isActive) {
      return;
    }

    // Restore original handlers
    window.removeEventListener('error', this.handleErrorEvent);
    window.onunhandledrejection = this.originalRejectionHandler;

    this.isActive = false;
    activityService.logSystemEvent('Error monitoring stopped', 'error-monitor');
  }

  private handleError(
    message: string | Event,
    filename?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): boolean | void {
    const errorDetails: ErrorDetails = {
      message: typeof message === 'string' ? message : 'Unknown error',
      filename,
      lineno,
      colno,
      stack: error?.stack,
      source: 'window.onerror',
    };

    this.logError(errorDetails);

    // Call original handler if it exists
    if (this.originalErrorHandler) {
      return this.originalErrorHandler(
        message as ErrorEvent | Event,
        filename,
        lineno,
        colno,
        error
      );
    }

    return false;
  }

  private handleErrorEvent(event: ErrorEvent): void {
    const errorDetails: ErrorDetails = {
      message: event.message || 'Unknown error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      source: 'window.error',
    };

    this.logError(errorDetails);
  }

  private handleRejection(event: PromiseRejectionEvent): void {
    const error = event.reason;
    const errorDetails: ErrorDetails = {
      message: error?.message || 'Unhandled promise rejection',
      stack: error?.stack,
      source: 'unhandledrejection',
    };

    this.logError(errorDetails);

    // Call original handler if it exists
    if (this.originalRejectionHandler) {
      this.originalRejectionHandler(event);
    }
  }

  private overrideConsoleError(): void {
    const originalConsoleError = console.error;

    console.error = (...args: any[]) => {
      // Call original console.error first
      originalConsoleError.apply(console, args);

      // Log to our activity system
      const message = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ');

      const errorDetails: ErrorDetails = {
        message: `Console Error: ${message}`,
        source: 'console.error',
      };

      this.logError(errorDetails);
    };
  }

  private logError(errorDetails: ErrorDetails): void {
    const severity = this.determineSeverity(errorDetails);

    const activity: ActivityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'error',
      source: errorDetails.source || 'unknown',
      message: errorDetails.message,
      details: {
        errorStack: errorDetails.stack,
        filePath: errorDetails.filename,
        severity,
      },
      metadata: {
        lineno: errorDetails.lineno,
        colno: errorDetails.colno,
      },
    };

    activityService.addActivity(activity);
  }

  private determineSeverity(errorDetails: ErrorDetails): 'low' | 'medium' | 'high' | 'critical' {
    const message = errorDetails.message.toLowerCase();

    // Critical errors
    if (
      message.includes('fatal') ||
      message.includes('cannot read property') ||
      message.includes('is not a function') ||
      message.includes('network error')
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      message.includes('error') ||
      message.includes('exception') ||
      message.includes('failed') ||
      errorDetails.stack
    ) {
      return 'high';
    }

    // Medium severity
    if (message.includes('warning') || message.includes('deprecated')) {
      return 'medium';
    }

    return 'low';
  }

  private generateId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public logCustomError(error: Error, source = 'custom', context?: Record<string, any>): void {
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      source,
    };

    const activity: ActivityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'error',
      source,
      message: error.message,
      details: {
        errorStack: error.stack,
        severity: this.determineSeverity(errorDetails),
      },
      metadata: context,
    };

    activityService.addActivity(activity);
  }

  get isMonitoring(): boolean {
    return this.isActive;
  }
}

export const errorMonitor = new ErrorMonitor();
export default errorMonitor;

