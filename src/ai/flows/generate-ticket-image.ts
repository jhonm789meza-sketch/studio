
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
            { text: `Actúa como un diseñador experto en tiquetes con estética retro y vintage. Tu única tarea es crear la imagen de un tiquete de rifa con un diseño clásico y atractivo.

**Instrucciones de Diseño Inspiradas en Tiquetes Clásicos:**

1.  **Formato General:** Crea un tiquete de formato horizontal, similar a una entrada de evento clásica. El diseño debe estar dividido en dos secciones principales: un talón (stub) a la izquierda y el cuerpo principal del tiquete a la derecha.

2.  **Sección Izquierda (Talón):**
    *   **Fondo:** Utiliza un color oscuro y sólido, como negro o un marrón muy oscuro.
    *   **Contenido:** Muestra el texto "TIQUETE N°" y, debajo, el número de la rifa de forma prominente: "${input.raffleNumber}". Utiliza una tipografía de estilo "máquina de escribir" o una fuente sans-serif simple y clara.

3.  **Sección Derecha (Cuerpo Principal):**
    *   **Fondo:** Utiliza la imagen proporcionada como fondo. Aplica un tratamiento visual (como una superposición de color sepia o una ligera opacidad) para darle un aspecto vintage y asegurar que el texto sea legible.
    *   **Tipografía:** Emplea una mezcla de tipografías con serifa, decorativas y de estilo antiguo para el texto, evocando un sentimiento clásico.
    *   **Contenido de Texto Requerido (DEBE ser claramente visible):**
        *   **Título Principal:** El nombre de la rifa: "${input.raffleName}". Este debe ser el elemento de texto más destacado.
        *   **Detalles del Sorteo:** "Juega con ${input.lottery} el ${input.gameDate}".
        *   **Organizador:** "Organiza: ${input.organizerName}".

**Reglas Importantes:**
-   El diseño debe ser cohesivo, equilibrado y profesional.
-   No agregues ningún otro texto o elemento no especificado.
-   Tu resultado final debe ser ÚNICAMENTE la imagen generada del tiquete, sin texto ni comentarios adicionales.`},
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
