/**
 * @fileOverview Implements the Real-time AI Trace flow, displaying the AI's decision-making process.
 *
 * - realTimeAiTrace - A function that generates a human-readable trace of the AI's reasoning.
 * - RealTimeAiTraceInput - The input type for the realTimeAiTrace function.
 * - RealTimeAiTraceOutput - The return type for the realTimeAiTrace function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RealTimeAiTraceInputSchema = z.object({
  steps: z.array(z.string()).describe('A list of steps taken by the AI.'),
  input: z.string().describe('The original input to the AI system.'),
  output: z.string().describe('The final output of the AI system.'),
  toolsUsed: z.array(z.string()).optional().describe('List of tools used by the AI.'),
  pluginChain: z.array(z.string()).optional().describe('The chain of plugins that modified the AI messages.'),
});
export type RealTimeAiTraceInput = z.infer<typeof RealTimeAiTraceInputSchema>;

const RealTimeAiTraceOutputSchema = z.object({
  trace: z.string().describe('A human-readable explanation of the AI reasoning process.'),
});
export type RealTimeAiTraceOutput = z.infer<typeof RealTimeAiTraceOutputSchema>;

export async function realTimeAiTrace(input: RealTimeAiTraceInput): Promise<RealTimeAiTraceOutput> {
  return realTimeAiTraceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'realTimeAiTracePrompt',
  input: {schema: RealTimeAiTraceInputSchema},
  output: {schema: RealTimeAiTraceOutputSchema},
  prompt: `You are an expert AI trace explainer. Your job is to take the internal steps, inputs, outputs, tools, and plugins from an AI system and turn them into a human-readable explanation of how the AI arrived at its conclusion.

Original Input: {{{input}}}

Steps:
{{#each steps}}- {{{this}}}
{{/each}}

Final Output: {{{output}}}

{{#if toolsUsed}}Tools Used:
{{#each toolsUsed}}- {{{this}}}
{{/each}}{{/if}}

{{#if pluginChain}}Plugin Chain:
{{#each pluginChain}}- {{{this}}}
{{/each}}{{/if}}

Explain the AI's reasoning:
`,
});

const realTimeAiTraceFlow = ai.defineFlow(
  {
    name: 'realTimeAiTraceFlow',
    inputSchema: RealTimeAiTraceInputSchema,
    outputSchema: RealTimeAiTraceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
