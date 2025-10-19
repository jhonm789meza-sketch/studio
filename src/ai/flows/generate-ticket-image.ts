
'use server';

/**
 * @fileOverview Generates a raffle ticket image based on prize image and raffle details.
 *
 * - generateTicketImage - A function that handles the ticket image generation.
 * - GenerateTicketImageInput - The input type for the generateTicketImage function.
 * - GenerateTicketImageOutput - The return type for the generateTicketImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';
import { googleAI } from '@genkit-ai/googleai';

const GenerateTicketImageInputSchema = z.object({
  prizeImageUrl: z.string().url().describe('The URL of the prize image.'),
  raffleName: z.string().describe('The name of the raffle.'),
  raffleNumber: z.string().describe('The ticket number.'),
  organizerName: z.string().describe('The name of the organizer.'),
  gameDate: z.string().describe('The date of the raffle draw.'),
  lottery: z.string().describe('The lottery used for the draw.'),
});
export type GenerateTicketImageInput = z.infer<typeof GenerateTicketImageInputSchema>;

const GenerateTicketImageOutputSchema = z.object({
  ticketImageUrl: z.string().describe("The data URI of the generated ticket image. Expected format: 'data:image/png;base64,<encoded_data>'."),
});
export type GenerateTicketImageOutput = z.infer<typeof GenerateTicketImageOutputSchema>;

export async function generateTicketImage(input: GenerateTicketImageInput): Promise<GenerateTicketImageOutput> {
  return generateTicketImageFlow(input);
}

// Helper to fetch the image and convert to data URI
async function imageUrlToDataUri(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
}


const generateTicketImageFlow = ai.defineFlow(
  {
    name: 'generateTicketImageFlow',
    inputSchema: GenerateTicketImageInputSchema,
    outputSchema: GenerateTicketImageOutputSchema,
    model: googleAI('gemini-2.5-flash-image-preview'),
  },
  async (input) => {
    if (!input.prizeImageUrl) {
        throw new Error('Prize image URL is required to generate a ticket image.');
    }
    const prizeImageUri = await imageUrlToDataUri(input.prizeImageUrl);

    const { media } = await ai.generate({
        prompt: [
            { media: { url: prizeImageUri } },
            { text: `Based on the provided prize image, generate a visually appealing and modern raffle ticket.

The ticket must be vertical, clean, and elegant. It should look like a premium event ticket.

Incorporate colors and themes from the prize image into the ticket design. The design should be abstract and not just a copy of the image.

The ticket MUST include the following information clearly and legibly:
- Raffle Name: "${input.raffleName}"
- Ticket Number: A large, prominent display of the number "${input.raffleNumber}"
- Organizer: "Organized by: ${input.organizerName}"
- Draw Details: "Draws with ${input.lottery} on ${input.gameDate}"

Do not add any other text or elements not specified. The final output must be only the generated image of the ticket.`},
        ],
        model: googleAI('gemini-2.5-flash-image-preview'),
        config: {
            responseModalities: ['IMAGE'],
        },
    });

    if (!media || !media.url) {
      throw new Error('Failed to generate ticket image.');
    }

    return { ticketImageUrl: media.url };
  }
);
