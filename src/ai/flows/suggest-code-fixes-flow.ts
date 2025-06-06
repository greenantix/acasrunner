
/**
 * @fileOverview A Genkit flow for suggesting code fixes based on error messages and context.
 *
 * - suggestCodeFixes - A function that analyzes an error and suggests a fix.
 * - SuggestCodeFixesInput - The input type for the suggestCodeFixes function.
 * - SuggestCodeFixesOutput - The return type for the suggestCodeFixes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCodeFixesInputSchema = z.object({
  error: z.string().describe("The error message observed."),
  fileContext: z.string().describe("Relevant context from the file, like surrounding code, or a stack trace pointing to the file."),
  language: z.string().optional().default("typescript").describe("The programming language of the code snippet."),
});
export type SuggestCodeFixesInput = z.infer<typeof SuggestCodeFixesInputSchema>;

const SuggestCodeFixesOutputSchema = z.object({
  explanation: z.string().describe("An explanation of what might be causing the error and why the suggestion should fix it."),
  suggestedCode: z.string().describe("The suggested code snippet to fix the error."),
  diff: z.string().optional().describe("A diff hunk showing the changes. (Optional)"),
  confidenceScore: z.number().min(0).max(1).optional().describe("A score from 0 to 1 indicating the AI's confidence in the suggestion."),
  trace: z.array(z.string()).describe("Mocked execution trace of the AI's reasoning process."),
});
export type SuggestCodeFixesOutput = z.infer<typeof SuggestCodeFixesOutputSchema>;

export async function suggestCodeFixes(
  input: SuggestCodeFixesInput
): Promise<SuggestCodeFixesOutput> {
  return suggestCodeFixesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCodeFixesPrompt',
  input: {schema: SuggestCodeFixesInputSchema},
  output: {schema: SuggestCodeFixesOutputSchema},
  prompt: `You are an expert AI pair programmer. Your task is to analyze the provided error information and suggest a code fix.

Programming Language: {{{language}}}
Error Message: {{{error}}}
File Context (e.g., surrounding code, stack trace):
{{{fileContext}}}

Please provide:
1.  A brief explanation of the likely cause of the error and why your suggestion should fix it.
2.  A corrected code snippet.
3.  (Optional) A diff of the changes.
4.  (Optional) A confidence score for your suggestion (0.0 to 1.0).
5.  A mock trace of your reasoning steps (e.g., ["Parsed error", "Identified problematic pattern", "Generated fix"]).

Format your response according to the output schema.
`,
});

const suggestCodeFixesFlow = ai.defineFlow(
  {
    name: 'suggestCodeFixesFlow',
    inputSchema: SuggestCodeFixesInputSchema,
    outputSchema: SuggestCodeFixesOutputSchema,
  },
  async (input: SuggestCodeFixesInput) => {
    const {output} = await prompt(input);

    if (!output) {
        throw new Error('Failed to generate code fix suggestions - AI service unavailable');
    }
    
    return {
        ...output,
        trace: output.trace && output.trace.length > 0 ? output.trace : ["Analyzed input", "Generated code suggestion and explanation"]
    };
  }
);

