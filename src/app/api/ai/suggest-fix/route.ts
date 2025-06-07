import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, code, language, context } = body;

    // Validate required fields
    if (!error || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: error, code' },
        { status: 400 }
      );
    }

    // Simulate AI analysis for fix suggestions
    const fixSuggestion = await generateFixSuggestion(error, code, language, context);

    return NextResponse.json({
      success: true,
      suggestion: fixSuggestion,
      confidence: 0.85,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fix suggestion generation failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate fix suggestion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function generateFixSuggestion(error: string, code: string, language: string, context: any) {
  // In a real implementation, this would call the AI service
  // For now, we'll provide intelligent mock responses based on error patterns

  const errorType = detectErrorType(error);
  
  switch (errorType) {
    case 'type_error':
      return {
        type: 'type_fix',
        description: 'Type-related error detected',
        suggestedFix: generateTypeErrorFix(error, code, language),
        explanation: 'This error occurs when types don\'t match. Consider adding type annotations or checking variable types.',
        codeSnippet: generateCodeSnippet(code, errorType),
        severity: 'medium'
      };

    case 'reference_error':
      return {
        type: 'reference_fix',
        description: 'Reference error detected',
        suggestedFix: generateReferenceErrorFix(error, code, language),
        explanation: 'This variable or function is not defined. Check spelling or import statements.',
        codeSnippet: generateCodeSnippet(code, errorType),
        severity: 'high'
      };

    case 'syntax_error':
      return {
        type: 'syntax_fix',
        description: 'Syntax error detected',
        suggestedFix: generateSyntaxErrorFix(error, code, language),
        explanation: 'There\'s a syntax issue in your code. Check for missing brackets, semicolons, or typos.',
        codeSnippet: generateCodeSnippet(code, errorType),
        severity: 'high'
      };

    case 'runtime_error':
      return {
        type: 'runtime_fix',
        description: 'Runtime error detected',
        suggestedFix: generateRuntimeErrorFix(error, code, language),
        explanation: 'This error occurs during execution. Consider adding error handling or null checks.',
        codeSnippet: generateCodeSnippet(code, errorType),
        severity: 'medium'
      };

    default:
      return {
        type: 'general_fix',
        description: 'General error detected',
        suggestedFix: generateGeneralFix(error, code, language),
        explanation: 'Consider reviewing the error message and checking the documentation for the related functionality.',
        codeSnippet: generateCodeSnippet(code, 'general'),
        severity: 'low'
      };
  }
}

function detectErrorType(error: string): string {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('type') || lowerError.includes('typeerror')) {
    return 'type_error';
  }
  if (lowerError.includes('reference') || lowerError.includes('referenceerror') || lowerError.includes('not defined')) {
    return 'reference_error';
  }
  if (lowerError.includes('syntax') || lowerError.includes('syntaxerror') || lowerError.includes('unexpected')) {
    return 'syntax_error';
  }
  if (lowerError.includes('runtime') || lowerError.includes('null') || lowerError.includes('undefined')) {
    return 'runtime_error';
  }
  
  return 'general';
}

function generateTypeErrorFix(error: string, code: string, language: string) {
  return {
    steps: [
      'Add explicit type annotations',
      'Check variable types before operations',
      'Use type guards for runtime type checking',
      'Consider using TypeScript strict mode'
    ],
    codeExample: language === 'typescript' ? `
// Before
function process(data) {
  return data.length;
}

// After
function process(data: string | any[]): number {
  if (typeof data === 'string' || Array.isArray(data)) {
    return data.length;
  }
  throw new Error('Invalid data type');
}
    ` : `
// Add type checking
function process(data) {
  if (typeof data !== 'string' && !Array.isArray(data)) {
    throw new Error('Invalid data type');
  }
  return data.length;
}
    `,
    preventionTips: [
      'Use TypeScript for better type safety',
      'Add runtime type checks',
      'Use linting rules for type consistency'
    ]
  };
}

function generateReferenceErrorFix(error: string, code: string, language: string) {
  return {
    steps: [
      'Check variable spelling and case sensitivity',
      'Verify import statements',
      'Ensure variables are declared before use',
      'Check scope and closure issues'
    ],
    codeExample: `
// Common fixes:
// 1. Add missing import
import { someFunction } from './utils';

// 2. Declare variable
let myVariable;

// 3. Check spelling
// someVarriable -> someVariable
    `,
    preventionTips: [
      'Use IDE auto-completion',
      'Enable strict mode',
      'Use consistent naming conventions'
    ]
  };
}

function generateSyntaxErrorFix(error: string, code: string, language: string) {
  return {
    steps: [
      'Check for missing brackets or parentheses',
      'Verify semicolon placement',
      'Look for typos in keywords',
      'Ensure proper string quoting'
    ],
    codeExample: `
// Common syntax fixes:
// Missing bracket
if (condition) {
  // code here
} // <- Add this bracket

// Missing semicolon (if required)
const value = getData();

// Proper string quoting
const message = "Hello, world!";
    `,
    preventionTips: [
      'Use code formatter',
      'Enable syntax highlighting',
      'Use bracket matching in IDE'
    ]
  };
}

function generateRuntimeErrorFix(error: string, code: string, language: string) {
  return {
    steps: [
      'Add null/undefined checks',
      'Use try-catch blocks',
      'Validate input parameters',
      'Add defensive programming practices'
    ],
    codeExample: `
// Add null checks
function process(data) {
  if (!data) {
    throw new Error('Data is required');
  }
  
  if (data.items && Array.isArray(data.items)) {
    return data.items.length;
  }
  
  return 0;
}

// Use try-catch
try {
  const result = riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  return null;
}
    `,
    preventionTips: [
      'Always validate inputs',
      'Use optional chaining (?.) where available',
      'Implement proper error handling'
    ]
  };
}

function generateGeneralFix(error: string, code: string, language: string) {
  return {
    steps: [
      'Read the error message carefully',
      'Check the documentation',
      'Search for similar issues online',
      'Consider debugging step by step'
    ],
    codeExample: `
// General debugging approach:
console.log('Debug point 1');

// Add logging to understand the issue
try {
  const result = problematicFunction();
  console.log('Result:', result);
} catch (error) {
  console.error('Error details:', error);
}
    `,
    preventionTips: [
      'Write unit tests',
      'Use debugging tools',
      'Follow coding best practices'
    ]
  };
}

function generateCodeSnippet(code: string, errorType: string) {
  // Extract relevant portion of code around the error
  const lines = code.split('\n');
  const maxLines = 10;
  
  if (lines.length <= maxLines) {
    return code;
  }
  
  // Return first 10 lines as example
  return lines.slice(0, maxLines).join('\n') + '\n// ... (truncated)';
}
