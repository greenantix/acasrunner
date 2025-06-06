// src/ai/flows/escalate-coding-problem.ts
/**
 * @fileOverview This file defines a Genkit flow for escalating coding problems to AI models.
 *
 * - escalateCodingProblem - A function that takes coding problem details and escalates it to an AI model for assistance.
 * - EscalateCodingProblemInput - The input type for the escalateCodingProblem function.
 * - EscalateCodingProblemOutput - The return type for the escalateCodingProblem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EscalateCodingProblemInputSchema = z.object({
  error: z.string().describe('The error message or a concise description of the problem.'),
  context: z.string().describe('Relevant context, such as stack trace, component stack, file path, or surrounding code snippets.'),
});
export type EscalateCodingProblemInput = z.infer<typeof EscalateCodingProblemInputSchema>;

const EscalateCodingProblemOutputSchema = z.object({
  explanation: z
    .string()
    .describe('A detailed explanation of the likely cause of the error.'),
  severity: z.enum(["low", "medium", "high"]).describe("The AI's assessment of the error's severity."),
  trace: z.array(z.string()).describe("Execution trace of the AI's reasoning process for LLM Chain Visibility."),
});
export type EscalateCodingProblemOutput = z.infer<typeof EscalateCodingProblemOutputSchema>;

export async function escalateCodingProblem(
  input: EscalateCodingProblemInput
): Promise<EscalateCodingProblemOutput> {
  return escalateCodingProblemFlow(input);
}

const escalateCodingProblemPrompt = ai.definePrompt({
  name: 'escalateCodingProblemPrompt',
  input: {schema: EscalateCodingProblemInputSchema},
  output: {schema: EscalateCodingProblemOutputSchema},
  prompt: `You are an AI coding assistant supervisor. A developer is experiencing a coding problem.
Analyze the error and context, then provide a detailed explanation of the likely cause, assess its severity, and briefly outline your thought process for the trace.

Error: {{{error}}}
Context: {{{context}}}

Based on the information provided, provide an explanation, severity, and a reasoning trace.
The trace should be a list of high-level steps you took, e.g., ["Analyzed error message", "Cross-referenced with common JavaScript errors", "Formulated explanation"].
`,
});

const escalateCodingProblemFlow = ai.defineFlow(
  {
    name: 'escalateCodingProblemFlow',
    inputSchema: EscalateCodingProblemInputSchema,
    outputSchema: EscalateCodingProblemOutputSchema,
  },
  async input => {
    // In a real scenario, this flow might invoke tools or other plugins.
    // For now, it directly calls the prompt.
    const {output} = await escalateCodingProblemPrompt(input);
    
    // Mocking the trace if AI doesn't provide it or for simplicity
    if (!output) {
        return {
            explanation: "Mock AI: I was unable to determine the cause of the error from the provided information. Please ensure the error message and context are as complete as possible.",
            severity: "medium" as const,
            trace: ["Received input", "AI processing failed to generate output", "Returned mock fallback"]
        }
    }
    
    return {
        explanation: output.explanation,
        severity: (output.severity as "low" | "medium" | "high") || "medium", // Default severity if not provided
        trace: output.trace && output.trace.length > 0 ? output.trace : ["Analyzed input", "Generated explanation and severity"], // Mock trace
    };
  }
);
