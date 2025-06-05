
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
    // Mocking a specific common error for better demo if it arises
    if (input.error.toLowerCase().includes("cannot read properties of undefined") && input.fileContext.includes(".name")) {
        const originalCode = input.fileContext.match(/const\s+\w+\s*=\s*\w+\.profile\.name;/)?.[0] || "const userName = user.profile.name;";
        const suggested = originalCode.replace('.profile.name', '?.profile?.name');
        return {
            explanation: "The error is likely a TypeError because 'profile' might be undefined when accessing '.name'. Using optional chaining (?.) can prevent this.",
            suggestedCode: suggested,
            diff: `--- a/original.js
+++ b/fixed.js
@@ -1,1 +1,1 @@
-${originalCode}
+${suggested}`,
            confidenceScore: 0.90,
            trace: ["Detected undefined property access", "Applied optional chaining pattern", "Generated diff"]
        };
    }
    
    const {output} = await prompt(input);

    if (!output) {
        return {
            explanation: "Mock AI: I couldn't determine a specific fix. Please ensure all variables are initialized and check for typos.",
            suggestedCode: "// No specific code change suggested, please review manually.",
            trace: ["Received input", "AI processing failed", "Returned fallback"],
            confidenceScore: 0.2
        };
    }
    return {
        ...output,
        trace: output.trace && output.trace.length > 0 ? output.trace : ["Analyzed input", "Generated code suggestion and explanation"] // Mock trace
    };
  }
);
