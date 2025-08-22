'use server';

/**
 * @fileOverview A raffle description generator AI agent.
 *
 * - generateRaffleDescription - A function that handles the raffle description generation process.
 * - GenerateRaffleDescriptionInput - The input type for the generateRaffleDescription function.
 * - GenerateRaffleDescriptionOutput - The return type for the generateRaffleDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRaffleDescriptionInputSchema = z.object({
  raffleName: z.string().describe('The name of the raffle.'),
});
export type GenerateRaffleDescriptionInput = z.infer<typeof GenerateRaffleDescriptionInputSchema>;

const GenerateRaffleDescriptionOutputSchema = z.object({
  description: z.string().describe('An appealing description of the raffle.'),
});
export type GenerateRaffleDescriptionOutput = z.infer<typeof GenerateRaffleDescriptionOutputSchema>;

export async function generateRaffleDescription(input: GenerateRaffleDescriptionInput): Promise<GenerateRaffleDescriptionOutput> {
  return generateRaffleDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRaffleDescriptionPrompt',
  input: {schema: GenerateRaffleDescriptionInputSchema},
  output: {schema: GenerateRaffleDescriptionOutputSchema},
  prompt: `You are an expert marketing copywriter specializing in generating exciting and appealing descriptions for raffles.

  Given the name of the raffle, create a unique and engaging description to entice people to participate.

Raffle Name: {{{raffleName}}}`,
});

const generateRaffleDescriptionFlow = ai.defineFlow(
  {
    name: 'generateRaffleDescriptionFlow',
    inputSchema: GenerateRaffleDescriptionInputSchema,
    outputSchema: GenerateRaffleDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
