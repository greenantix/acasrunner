// src/components/error-display-toast.tsx
'use client';

import {
  escalateCodingProblem,
  EscalateCodingProblemInput,
  EscalateCodingProblemOutput,
} from '@/ai/flows/escalate-coding-problem';
import {
  suggestCodeFixes,
  SuggestCodeFixesInput,
  SuggestCodeFixesOutput,
} from '@/ai/flows/suggest-code-fixes-flow';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast as newToast } from '@/hooks/use-toast'; // Renaming to avoid conflict
import { sendToRooCode } from '@/services/injection-service';
import { ClipboardCopy, Lightbulb, Loader2, Send, Wrench } from 'lucide-react';
import type { ErrorInfo } from 'react';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ErrorDisplayToastProps {
  error: Error;
  errorInfo?: ErrorInfo;
  source: 'ErrorBoundary' | 'window.onerror' | 'unhandledrejection' | 'manual';
}

const ErrorDisplayToast: React.FC<ErrorDisplayToastProps> = ({ error, errorInfo, source }) => {
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [isLoadingFix, setIsLoadingFix] = useState(false);
  const [explanation, setExplanation] = useState<EscalateCodingProblemOutput | null>(null);
  const [suggestedFix, setSuggestedFix] = useState<SuggestCodeFixesOutput | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedback, setFeedback] = useState('');

  const errorContext =
    errorInfo?.componentStack || `Source: ${source}\nStack: ${error.stack || 'N/A'}`;

  const handleExplainError = async () => {
    setIsLoadingExplanation(true);
    setExplanation(null);
    try {
      const input: EscalateCodingProblemInput = {
        error: error.message,
        context: errorContext,
      };
      const result = await escalateCodingProblem(input);
      setExplanation(result);
    } catch (e) {
      console.error('Error getting explanation:', e);
      newToast({
        title: 'Explanation Failed',
        description: 'Could not get AI explanation.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleSuggestFix = async () => {
    setIsLoadingFix(true);
    setSuggestedFix(null);
    try {
      const input: SuggestCodeFixesInput = {
        error: error.message,
        fileContext: errorContext, // Use 'fileContext' as expected by the interface
        language: 'typescript', // Add the required language property
      };
      const result = await suggestCodeFixes(input);
      setSuggestedFix(result);
    } catch (e) {
      console.error('Error getting fix suggestion:', e);
      newToast({
        title: 'Fix Suggestion Failed',
        description: 'Could not get AI fix.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingFix(false);
    }
  };

  const handleInjectFix = async () => {
    if (
      suggestedFix &&
      typeof suggestedFix.suggestedCode === 'string' &&
      suggestedFix.suggestedCode.length > 0
    ) {
      await sendToRooCode(suggestedFix.suggestedCode, { autoPaste: true });
      newToast({ title: 'Fix Sent to RooCode', description: 'The suggested fix has been sent.' });
      // Potentially log to Firebase here if Cloud Mode is on: escalationLogger.logError(error.message, suggestedFix.suggestedCode, 'approved');
    }
  };

  const handleCopyFix = () => {
    if (
      suggestedFix &&
      typeof suggestedFix.suggestedCode === 'string' &&
      suggestedFix.suggestedCode.length > 0
    ) {
      navigator.clipboard.writeText(suggestedFix.suggestedCode);
      newToast({ title: 'Copied to Clipboard', description: 'Suggested fix copied.' });
    }
  };

  const handleRejectFix = () => {
    setShowFeedbackForm(true);
    // escalationLogger.logError(error.message, suggestedFix?.suggestedCode || "", 'rejected_pre_feedback');
  };

  const handleSubmitFeedback = () => {
    console.log('Feedback submitted:', feedback);
    newToast({ title: 'Feedback Submitted', description: 'Thank you for your feedback.' });
    // escalationLogger.logError(error.message, suggestedFix?.suggestedCode || "", 'rejected_with_feedback', feedback);
    setShowFeedbackForm(false);
    setFeedback('');
  };

  return (
    <div className="w-full max-w-md space-y-3 text-sm">
      <p className="font-medium text-destructive-foreground">{error.message}</p>
      {errorInfo?.componentStack && (
        <ScrollArea className="h-20 rounded border bg-destructive/10 p-2 text-xs text-destructive-foreground/80">
          <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
        </ScrollArea>
      )}
      {!errorInfo?.componentStack && error.stack && (
        <ScrollArea className="h-20 rounded border bg-destructive/10 p-2 text-xs text-destructive-foreground/80">
          <pre className="whitespace-pre-wrap">{error.stack}</pre>
        </ScrollArea>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExplainError}
          disabled={isLoadingExplanation}
          className="border-destructive-foreground/50 bg-destructive/20 text-destructive-foreground hover:bg-destructive/30"
        >
          {isLoadingExplanation ? <Loader2 className="animate-spin" /> : <Lightbulb />} Explain
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSuggestFix}
          disabled={isLoadingFix}
          className="border-destructive-foreground/50 bg-destructive/20 text-destructive-foreground hover:bg-destructive/30"
        >
          {isLoadingFix ? <Loader2 className="animate-spin" /> : <Wrench />} Suggest Fix
        </Button>
      </div>

      {explanation && (
        <Card className="mt-2 bg-background/80 text-foreground">
          <CardHeader className="p-2">
            <CardTitle className="text-xs font-semibold">
              AI Explanation (Severity: {explanation.severity})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 text-xs">
            <p className="whitespace-pre-wrap">{explanation.explanation}</p>
            {explanation.trace && explanation.trace.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-muted-foreground">Show AI Trace</summary>
                <ul className="list-inside list-disc pl-2 text-muted-foreground/80">
                  {explanation.trace.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {suggestedFix && (
        <Card className="mt-2 bg-background/80 text-foreground">
          <CardHeader className="p-2">
            <CardTitle className="text-xs font-semibold">
              AI Suggested Fix{' '}
              {suggestedFix.confidenceScore
                ? `(Confidence: ${(suggestedFix.confidenceScore * 100).toFixed(0)}%)`
                : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-2 text-xs">
            {suggestedFix.explanation && (
              <p className="mb-1 whitespace-pre-wrap text-muted-foreground">
                {suggestedFix.explanation}
              </p>
            )}
            <Textarea
              readOnly
              value={suggestedFix.suggestedCode}
              rows={4}
              className="bg-muted/30 font-mono text-xs"
            />
            {suggestedFix.diff && (
              <div>
                <p className="font-medium text-muted-foreground">Diff:</p>
                <pre className="whitespace-pre-wrap rounded bg-muted/30 p-1 text-xs">
                  {suggestedFix.diff}
                </pre>
              </div>
            )}
            {suggestedFix.trace && suggestedFix.trace.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-muted-foreground">Show AI Trace</summary>
                <ul className="list-inside list-disc pl-2 text-muted-foreground/80">
                  {suggestedFix.trace.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={handleInjectFix} variant="default">
                <Send className="mr-1 h-3 w-3" /> Inject to RooCode
              </Button>
              <Button size="sm" onClick={handleCopyFix} variant="secondary">
                <ClipboardCopy className="mr-1 h-3 w-3" /> Copy Fix
              </Button>
              <Button size="sm" onClick={handleRejectFix} variant="outline">
                Reject Fix
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {showFeedbackForm && (
        <div className="mt-2 space-y-1">
          <Textarea
            placeholder="Why are you rejecting this fix? (Optional)"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={2}
            className="text-xs"
          />
          <Button size="sm" onClick={handleSubmitFeedback}>
            Submit Feedback
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowFeedbackForm(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorDisplayToast;
