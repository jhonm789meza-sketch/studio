
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
  },
  async (input) => {
    if (!input.prizeImageUrl) {
        throw new Error('Prize image URL is required to generate a ticket image.');
    }
    const prizeImageUri = await imageUrlToDataUri(input.prizeImageUrl);

    const { media } = await ai.generate({
        prompt: [
            { media: { url: prizeImageUri } },
            { text: `As an expert ticket designer, create an attractive, vintage-style raffle ticket.

**Design Requirements:**
1.  **Background:** Use the provided image as the main background for the ticket. Apply a subtle visual treatment (like a slight blur or a color overlay) to ensure the text on top is perfectly readable.
2.  **Style:** The design should be classic, elegant, and resemble a traditional raffle ticket. Use a mix of serif and decorative fonts.
3.  **Layout:** Create a horizontal ticket layout.

**Required Text (MUST be clearly visible on the ticket):**
-   Raffle Name: "${input.raffleName}"
-   Ticket Number: "TICKET N° ${input.raffleNumber}"
-   Draw Details: "Plays with ${input.lottery} on ${input.gameDate}"
-   Organizer: "Organized by: ${input.organizerName}"

**Important Rules:**
-   Do not add any text or elements not specified above.
-   Your final output must be ONLY the generated ticket image.`},
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
