
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
            { text: `Actúa como un diseñador gráfico experto. Tu única tarea es crear una imagen vertical de un tiquete de rifa.

**Instrucciones de Diseño:**
- **Fondo del Tiquete:** Utiliza la imagen proporcionada como fondo principal del tiquete. Puedes aplicar un ligero desenfoque o una superposición de color sutil al fondo para asegurar que el texto superpuesto sea perfectamente legible.
- **Estilo:** El diseño debe ser visualmente impactante, moderno y elegante.
- **Diseño:** Asegúrate de que el diseño sea limpio, equilibrado y que todo el texto sea perfectamente legible.

**Contenido de Texto Requerido (DEBE ser claramente visible en el tiquete):**
-   Nombre de la Rifa: "${input.raffleName}"
-   Número del Tiquete: Muestra el número "${input.raffleNumber}" de forma prominente y con estilo.
-   Organizador: "Organizado por: ${input.organizerName}"
-   Detalles del Sorteo: "Juega con ${input.lottery} el ${input.gameDate}"

**Reglas Importantes:**
-   No agregues ningún otro texto o elemento no especificado anteriormente.
-   Tu resultado final debe ser ÚNICAMENTE la imagen generada del tiquete. No respondas con texto o comentarios.`},
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
