
/**
 * @fileOverview A Genkit flow for generating documentation like READMEs or Changelogs.
 *
 * - generateDocumentation - A function that takes context and generates documentation.
 * - GenerateDocumentationInput - The input type for the generateDocumentation function.
 * - GenerateDocumentationOutput - The return type for the generateDocumentation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// import type { ProjectParseResult } from '@/services/documentation-parser'; // Future import for structured data

const GenerateDocumentationInputSchema = z.object({
  docType: z.enum(['readme', 'changelog', 'docs_page']).describe("The type of documentation to generate."),
  context: z.string().describe("The context or source material for generating the documentation (e.g., commit messages, code diffs, feature descriptions, or stringified JSON of parsed project data)."),
  // structuredContext: z.custom<ProjectParseResult>().optional().describe("Optional structured data from project parsing. If provided, this might be preferred over raw context string."),
  projectName: z.string().optional().describe("The name of the project, if applicable."),
  version: z.string().optional().describe("The version number, if generating a changelog or release notes."),
  title: z.string().optional().describe("A specific title for a 'docs_page' if needed."),
});
export type GenerateDocumentationInput = z.infer<typeof GenerateDocumentationInputSchema>;

const GenerateDocumentationOutputSchema = z.object({
  generatedContent: z.string().describe("The generated documentation content in Markdown format."),
  title: z.string().optional().describe("A suggested title for the documentation (especially if not provided for docs_page)."),
});
export type GenerateDocumentationOutput = z.infer<typeof GenerateDocumentationOutputSchema>;

export async function generateDocumentation(
  input: GenerateDocumentationInput
): Promise<GenerateDocumentationOutput> {
  return generateDocumentationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDocumentationPrompt',
  input: {schema: GenerateDocumentationInputSchema},
  output: {schema: GenerateDocumentationOutputSchema},
  prompt: `You are an expert technical writer. Your task is to generate clear, concise, and accurate documentation.
{{#if projectName}}Project Name: {{{projectName}}}{{/if}}
{{#if version}}Version: {{{version}}}{{/if}}
Document Type: {{{docType}}}
{{#if title}}Requested Page Title: {{{title}}}{{/if}}

Context for documentation:
{{{context}}}
{{#if structuredContext}}
Structured Data (prefer this if available):
{{{JSONstringify structuredContext}}}
{{/if}}

Based on the provided context (and structured data if available), generate the requested documentation content in Markdown format.
If generating a README, include sections like Introduction, Features, Getting Started, and Usage.
If generating a Changelog, list changes under headings like Added, Changed, Fixed, Removed, based on the context (which might be commit messages).
If generating a docs_page, structure it logically based on the context and use the requested page title if provided, otherwise suggest one.
Provide a suitable title in the output if it's a 'docs_page' and no title was given in the input, or if it's a README.
`,
});

const generateDocumentationFlow = ai.defineFlow(
  {
    name: 'generateDocumentationFlow',
    inputSchema: GenerateDocumentationInputSchema,
    outputSchema: GenerateDocumentationOutputSchema,
  },
  async (input: GenerateDocumentationInput) => {
    // In a real scenario, you might fetch additional context here,
    // e.g., from a version control system or task manager, or use structuredContext.
    if (input.docType === "readme" && !input.projectName && !input.context.includes("ACAS Runner")) {
        // Mocking a slightly more complex response for README if project name is missing from input
        return {
            generatedContent: `# Mock Project README\n\nThis is a mock README generated because no project name was provided.\n\n## Introduction\nThis project does amazing things.\n\n## Features\n- Feature 1\n- Feature 2\n\n## Getting Started\n\`\`\`bash\nnpm install mock-project\n\`\`\`\n`,
            title: "Mock Project README"
        };
    }
    
    const {output} = await prompt(input);
    if (!output) {
        // Fallback mock response if AI fails or returns nothing
        return {
            generatedContent: `# Mock ${input.docType}\n\nThis is a fallback mock ${input.docType} generated due to an AI processing issue.\n\nContext provided:\n${input.context}\n`,
            title: input.title || `Mock ${input.docType}`
        }
    }
    // Ensure title is set if it's a docs_page and AI didn't provide one or input didn't have one
    if (input.docType === 'docs_page' && !output.title && !input.title) {
        output.title = `Generated Document: ${input.context.substring(0,30)}...`;
    }
    if(input.docType === 'readme' && !output.title){
        output.title = `${input.projectName || 'Project'} README`;
    }
    return output;
  }
);
