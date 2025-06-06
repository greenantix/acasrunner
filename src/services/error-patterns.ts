import { ActivityEvent } from './client-activity-service';

export interface ErrorPattern {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  suggestedProvider: string;
  category: string;
  description: string;
  commonCauses: string[];
  suggestedActions: string[];
}

export interface AnalysisContext {
  recentErrors: ActivityEvent[];
  fileExtension?: string;
  errorCount: number;
  timeWindow: number; // minutes
}

export class ErrorPatternAnalyzer {
  private patterns: Map<string, ErrorPattern> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    const patterns: ErrorPattern[] = [
      {
        type: 'syntax_error',
        severity: 'medium',
        confidence: 0.9,
        suggestedProvider: 'claude',
        category: 'Code Quality',
        description: 'Syntax or compilation error detected',
        commonCauses: ['Missing semicolons', 'Mismatched brackets', 'Type errors'],
        suggestedActions: ['Review syntax', 'Check TypeScript configuration', 'Validate imports']
      },
      {
        type: 'runtime_error',
        severity: 'high',
        confidence: 0.85,
        suggestedProvider: 'claude',
        category: 'Runtime Issues',
        description: 'Runtime exception or crash detected',
        commonCauses: ['Null pointer exceptions', 'Undefined variables', 'API failures'],
        suggestedActions: ['Add null checks', 'Validate input parameters', 'Implement error handling']
      },
      {
        type: 'performance_issue',
        severity: 'medium',
        confidence: 0.7,
        suggestedProvider: 'openai',
        category: 'Performance',
        description: 'Performance degradation or slow response times',
        commonCauses: ['Inefficient algorithms', 'Memory leaks', 'Database queries'],
        suggestedActions: ['Profile code', 'Optimize queries', 'Review algorithms']
      },
      {
        type: 'security_vulnerability',
        severity: 'critical',
        confidence: 0.95,
        suggestedProvider: 'claude',
        category: 'Security',
        description: 'Potential security vulnerability detected',
        commonCauses: ['SQL injection', 'XSS vulnerabilities', 'Insecure data handling'],
        suggestedActions: ['Security audit', 'Input validation', 'Update dependencies']
      },
      {
        type: 'dependency_error',
        severity: 'medium',
        confidence: 0.8,
        suggestedProvider: 'gemini',
        category: 'Dependencies',
        description: 'Package or dependency related issue',
        commonCauses: ['Version conflicts', 'Missing packages', 'Deprecated APIs'],
        suggestedActions: ['Update packages', 'Resolve conflicts', 'Check compatibility']
      },
      {
        type: 'build_failure',
        severity: 'high',
        confidence: 0.9,
        suggestedProvider: 'claude',
        category: 'Build System',
        description: 'Build or compilation failure',
        commonCauses: ['Configuration errors', 'Missing files', 'Environment issues'],
        suggestedActions: ['Check build config', 'Verify file paths', 'Review environment']
      }
    ];

    patterns.forEach(pattern => {
      this.patterns.set(pattern.type, pattern);
    });
  }

  analyzeError(error: string, context: AnalysisContext): ErrorPattern {
    const errorLower = error.toLowerCase();
    
    // Analyze error content for patterns
    const detectedType = this.detectErrorType(errorLower, context);
    const basePattern = this.patterns.get(detectedType) || this.getDefaultPattern();
    
    // Adjust severity based on context
    const adjustedSeverity = this.adjustSeverityByContext(basePattern.severity, context);
    
    // Calculate confidence based on error content and context
    const confidence = this.calculateConfidence(errorLower, detectedType, context);
    
    return {
      ...basePattern,
      severity: adjustedSeverity,
      confidence,
      suggestedProvider: this.selectBestProvider(detectedType, adjustedSeverity, context)
    };
  }

  private detectErrorType(error: string, context: AnalysisContext): string {
    // Syntax errors
    if (error.includes('syntaxerror') || 
        error.includes('unexpected token') ||
        error.includes('missing semicolon') ||
        error.includes('unexpected end of input')) {
      return 'syntax_error';
    }

    // Runtime errors
    if (error.includes('cannot read property') ||
        error.includes('is not a function') ||
        error.includes('undefined') ||
        error.includes('null') ||
        error.includes('referenceerror')) {
      return 'runtime_error';
    }

    // Security related
    if (error.includes('security') ||
        error.includes('vulnerability') ||
        error.includes('injection') ||
        error.includes('xss') ||
        error.includes('cors')) {
      return 'security_vulnerability';
    }

    // Build/compilation issues
    if (error.includes('build failed') ||
        error.includes('compilation error') ||
        error.includes('webpack') ||
        error.includes('cannot resolve module')) {
      return 'build_failure';
    }

    // Dependency issues
    if (error.includes('module not found') ||
        error.includes('package') ||
        error.includes('dependency') ||
        error.includes('version conflict')) {
      return 'dependency_error';
    }

    // Performance issues
    if (error.includes('timeout') ||
        error.includes('memory') ||
        error.includes('slow') ||
        error.includes('performance')) {
      return 'performance_issue';
    }

    // Default to runtime error for unknown patterns
    return 'runtime_error';
  }

  private adjustSeverityByContext(
    baseSeverity: 'low' | 'medium' | 'high' | 'critical', 
    context: AnalysisContext
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Increase severity if multiple similar errors in short time
    if (context.errorCount > 5 && context.timeWindow < 10) {
      switch (baseSeverity) {
        case 'low': return 'medium';
        case 'medium': return 'high';
        case 'high': return 'critical';
        default: return baseSeverity;
      }
    }

    // Increase severity for production files
    if (context.fileExtension && ['js', 'ts', 'tsx'].includes(context.fileExtension)) {
      if (baseSeverity === 'low') return 'medium';
    }

    return baseSeverity;
  }

  private calculateConfidence(
    error: string, 
    detectedType: string, 
    context: AnalysisContext
  ): number {
    let confidence = this.patterns.get(detectedType)?.confidence || 0.5;
    
    // Increase confidence for specific error patterns
    const specificPatterns = [
      'syntaxerror',
      'referenceerror', 
      'typeerror',
      'cannot read property',
      'is not a function'
    ];

    if (specificPatterns.some(pattern => error.includes(pattern))) {
      confidence = Math.min(confidence + 0.2, 1.0);
    }

    // Decrease confidence for vague errors
    if (error.includes('unknown') || error.includes('general') || error.length < 20) {
      confidence = Math.max(confidence - 0.2, 0.1);
    }

    return Math.round(confidence * 100) / 100;
  }

  private selectBestProvider(
    errorType: string, 
    severity: string, 
    context: AnalysisContext
  ): string {
    // High priority: Claude for critical security and complex code issues
    if (severity === 'critical' || errorType === 'security_vulnerability') {
      return 'claude';
    }

    // Medium priority: Distribute based on error type
    switch (errorType) {
      case 'syntax_error':
      case 'runtime_error':
      case 'build_failure':
        return 'claude';
      
      case 'performance_issue':
        return 'openai';
      
      case 'dependency_error':
        return 'gemini';
      
      default:
        return 'claude';
    }
  }

  private getDefaultPattern(): ErrorPattern {
    return {
      type: 'unknown_error',
      severity: 'medium',
      confidence: 0.5,
      suggestedProvider: 'claude',
      category: 'General',
      description: 'Unknown error type detected',
      commonCauses: ['Various potential issues'],
      suggestedActions: ['Review error details', 'Check logs', 'Verify configuration']
    };
  }

  analyzeErrorTrend(errors: ActivityEvent[], timeWindowMinutes = 60): {
    trendType: 'increasing' | 'decreasing' | 'stable' | 'spike';
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  } {
    const now = Date.now();
    const windowMs = timeWindowMinutes * 60 * 1000;
    const recentErrors = errors.filter(e => 
      now - new Date(e.timestamp).getTime() < windowMs
    );

    const errorCount = recentErrors.length;
    const uniqueTypes = new Set(recentErrors.map(e => e.type)).size;

    // Determine trend
    let trendType: 'increasing' | 'decreasing' | 'stable' | 'spike' = 'stable';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let recommendation = 'System appears stable';

    if (errorCount > 10 && timeWindowMinutes <= 10) {
      trendType = 'spike';
      severity = 'critical';
      recommendation = 'Error spike detected - immediate investigation required';
    } else if (errorCount > 5) {
      trendType = 'increasing';
      severity = errorCount > 8 ? 'high' : 'medium';
      recommendation = 'Error rate is elevated - monitor closely';
    } else if (errorCount === 0) {
      trendType = 'stable';
      severity = 'low';
      recommendation = 'No recent errors detected';
    }

    // Factor in diversity of error types
    if (uniqueTypes > 3 && errorCount > 3) {
      severity = severity === 'low' ? 'medium' : 
                 severity === 'medium' ? 'high' : 'critical';
      recommendation += ' - Multiple error types suggest systemic issues';
    }

    return { trendType, severity, recommendation };
  }

  getPatternSummary(): { type: string; description: string; category: string }[] {
    return Array.from(this.patterns.values()).map(p => ({
      type: p.type,
      description: p.description,
      category: p.category
    }));
  }
}
