
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
            { text: `Act as an expert graphic designer tasked with creating a raffle ticket. Your design must be inspired by the provided prize image, capturing its essence and excitement.

The ticket must be a vertical, visually stunning, modern, and elegant masterpiece. It should feel like a premium, collectible event ticket.

**Design Instructions:**
1.  **Analyze the Prize Image:** Deeply analyze the provided image. Go beyond just colors. Consider its shapes, textures, mood, and the concept of the prize itself.
2.  **Abstract Interpretation:** Do not just copy the image. Create an abstract, artistic design that incorporates the theme, colors, and feeling of the prize. For example, if it's a sports car, evoke speed and luxury. If it's a tropical vacation, evoke relaxation and nature.
3.  **Layout & Typography:** The design must be clean and balanced. All text must be perfectly legible and integrated beautifully into the design.

**Required Text Content (MUST be included clearly):**
-   Raffle Name: "${input.raffleName}"
-   Ticket Number: A large, prominent, and stylish display of the number "${input.raffleNumber}"
-   Organizer: "Organized by: ${input.organizerName}"
-   Draw Details: "Draws with ${input.lottery} on ${input.gameDate}"

Do not add any other text or elements not specified. Your final output must be ONLY the generated image of the ticket.`},
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
