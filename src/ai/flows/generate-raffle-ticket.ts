'use server';

/**
 * @fileOverview Generates a raffle ticket description and a random number.
 * 
 * - generateRifaTicket - A function that handles the ticket generation process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateRifaTicketInputSchema = z.object({
  premio: z.string().describe('The prize of the raffle.'),
});
export type GenerateRifaTicketInput = z.infer<typeof GenerateRifaTicketInputSchema>;

const GenerateRifaTicketOutputSchema = z.object({
  ticket: z.string().describe('A creative description for the raffle ticket.'),
  numero: z.number().describe('A random raffle number between 0 and 99.'),
});
export type GenerateRifaTicketOutput = z.infer<typeof GenerateRifaTicketOutputSchema>;

export async function generateRifaTicket(input: GenerateRifaTicketInput): Promise<GenerateRifaTicketOutput> {
  const result = await generateRifaTicketFlow(input);
  return {
    ticket: result.ticket,
    numero: result.numero,
  };
}

const generateRifaTicketFlow = ai.defineFlow(
  {
    name: 'generateRifaTicketFlow',
    inputSchema: GenerateRifaTicketInputSchema,
    outputSchema: GenerateRifaTicketOutputSchema,
  },
  async ({ premio }) => {
    const prompt = `Genera una descripción corta y emocionante para un tiquete de rifa cuyo premio es: "${premio}". Además, genera un número aleatorio para el tiquete entre 0 y 99.`;
    
    const { output } = await ai.generate({
      prompt,
      model: 'googleai/gemini-pro',
      output: {
        schema: GenerateRifaTicketOutputSchema,
      },
      config: {
        temperature: 0.8,
      },
    });

    if (!output) {
      throw new Error('Failed to generate ticket');
    }
    
    return output;
  }
);
