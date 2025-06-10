import { NextRequest, NextResponse } from 'next/server';
import { providerManager } from '@/services/llm-providers/provider-manager';

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

    // Use AI provider to generate fix suggestions
    const fixSuggestion = await generateFixSuggestion(error, code, language, context);

    return NextResponse.json({
      success: true,
      suggestion: fixSuggestion,
      confidence: fixSuggestion.confidence || 0.85,
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
  try {
    // Determine error type for provider selection
    const errorType = detectErrorType(error);
    const severity = determineSeverity(errorType);
    
    // Select the best provider for this type of error
    const provider = await providerManager.selectBestProvider(
      errorType, 
      severity, 
      ['code_review', 'debugging']
    );
    
    if (!provider) {
      throw new Error('No LLM providers available');
    }

    // Prepare the prompt for LLM
    const prompt = `Analyze this ${language || 'code'} error and provide a specific fix suggestion:

Error: ${error}

Code Context:
\`\`\`${language || 'javascript'}
${code}
\`\`\`

${context ? `Additional Context: ${JSON.stringify(context)}` : ''}

Please provide:
1. Root cause analysis
2. Specific fix with code examples
3. Step-by-step solution
4. Prevention strategies
5. Severity level (low/medium/high)
6. Confidence score (0-1)

Format the response as a structured analysis with clear code examples.`;

    // Get AI response
    const response = await provider.sendRequest({
      prompt,
      context: `Language: ${language}, Error Type: ${errorType}`,
      temperature: 0.1,
      maxTokens: 1500
    });

    // Parse and structure the response
    return parseAIResponse(response, errorType);

  } catch (error) {
    console.error('LLM provider error:', error);
    // Fallback to basic error analysis if LLM fails
    return generateBasicFixSuggestion(error as string, code, language);
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
  if (lowerError.includes('dependency') || lowerError.includes('module') || lowerError.includes('import')) {
    return 'dependency_error';
  }
  if (lowerError.includes('performance') || lowerError.includes('memory') || lowerError.includes('timeout')) {
    return 'performance_issue';
  }
  if (lowerError.includes('security') || lowerError.includes('vulnerability')) {
    return 'security_vulnerability';
  }
  
  return 'general';
}

function determineSeverity(errorType: string): string {
  switch (errorType) {
    case 'security_vulnerability':
      return 'critical';
    case 'syntax_error':
    case 'reference_error':
      return 'high';
    case 'type_error':
    case 'performance_issue':
      return 'medium';
    default:
      return 'low';
  }
}

function parseAIResponse(response: any, errorType: string) {
  const content = response.content || '';
  
  // Extract confidence score from AI response
  const confidenceMatch = content.match(/confidence.*?(\d*\.?\d+)/i);
  const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : (response.metadata?.confidence || 0.8);
  
  // Extract severity
  const severityMatch = content.match(/severity:?\s*(low|medium|high|critical)/i);
  const severity = severityMatch ? severityMatch[1].toLowerCase() : determineSeverity(errorType);
  
  // Parse steps (look for numbered lists)
  const steps = extractSteps(content);
  
  // Parse code examples
  const codeExample = extractCodeExample(content);
  
  return {
    type: `${errorType}_fix`,
    description: `AI-analyzed ${errorType.replace('_', ' ')} solution`,
    suggestedFix: {
      steps,
      codeExample,
      aiAnalysis: content,
      preventionTips: extractPreventionTips(content)
    },
    explanation: extractExplanation(content),
    codeSnippet: codeExample,
    severity,
    confidence,
    provider: response.provider,
    model: response.model,
    metadata: response.metadata
  };
}

function extractSteps(content: string): string[] {
  const steps: string[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Look for numbered steps
    const stepMatch = line.match(/^\s*\d+\.\s*(.+)$/);
    if (stepMatch) {
      steps.push(stepMatch[1].trim());
    }
  }
  
  return steps.length > 0 ? steps : ['Review the AI analysis above for detailed steps'];
}

function extractCodeExample(content: string): string {
  // Extract code blocks
  const codeBlockMatch = content.match(/```[\s\S]*?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[0];
  }
  
  // Look for inline code
  const inlineCodeMatch = content.match(/`[^`]+`/);
  if (inlineCodeMatch) {
    return inlineCodeMatch[0];
  }
  
  return 'See AI analysis for code examples';
}

function extractPreventionTips(content: string): string[] {
  const tips: string[] = [];
  const lines = content.split('\n');
  let inPreventionSection = false;
  
  for (const line of lines) {
    if (line.toLowerCase().includes('prevention') || line.toLowerCase().includes('avoid')) {
      inPreventionSection = true;
      continue;
    }
    
    if (inPreventionSection) {
      const tipMatch = line.match(/^\s*[-•*]\s*(.+)$/) || line.match(/^\s*\d+\.\s*(.+)$/);
      if (tipMatch) {
        tips.push(tipMatch[1].trim());
      } else if (line.trim() === '' || line.match(/^[A-Z]/)) {
        inPreventionSection = false;
      }
    }
  }
  
  return tips.length > 0 ? tips : ['Follow best practices for this language', 'Use proper error handling'];
}

function extractExplanation(content: string): string {
  // Look for explanation or analysis section
  const explanationMatch = content.match(/(?:explanation|analysis|cause):\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
  if (explanationMatch) {
    return explanationMatch[1].trim();
  }
  
  // Fallback to first paragraph
  const firstParagraph = content.split('\n\n')[0];
  return firstParagraph.length > 10 ? firstParagraph : 'AI analysis provided above';
}

function generateBasicFixSuggestion(error: string, code: string, language: string) {
  const errorType = detectErrorType(error);
  const severity = determineSeverity(errorType);
  
  return {
    type: `${errorType}_fix`,
    description: `Basic ${errorType.replace('_', ' ')} analysis`,
    suggestedFix: {
      steps: [
        'Review the error message carefully',
        'Check the code syntax and logic',
        'Consult documentation for the specific function or library',
        'Consider adding error handling or validation'
      ],
      codeExample: '// Add proper error handling\ntry {\n  // your code here\n} catch (error) {\n  console.error("Error:", error);\n}',
      aiAnalysis: 'LLM analysis unavailable - using basic error categorization',
      preventionTips: ['Use proper error handling', 'Add input validation', 'Follow coding best practices']
    },
    explanation: `This appears to be a ${errorType.replace('_', ' ')}. ${error}`,
    codeSnippet: code.split('\n').slice(0, 10).join('\n'),
    severity,
    confidence: 0.5,
    provider: 'fallback',
    model: 'basic-analysis'
  };
}

