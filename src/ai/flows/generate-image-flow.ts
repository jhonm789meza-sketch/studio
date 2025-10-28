'use server';
/**
 * @fileOverview A flow for generating an image from a text prompt.
 *
 * - generateImage - A function that handles image generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { uploadString, ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().optional(),
  error: z.string().optional(),
});

export async function generateImage(
  prompt: string
): Promise<z.infer<typeof GenerateImageOutputSchema>> {
  return generateImageFlow(prompt);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: z.string(),
    outputSchema: GenerateImageOutputSchema,
  },
  async (prompt) => {
    try {
      const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: prompt,
      });

      if (!media || !media.url) {
        throw new Error('La IA no pudo generar una imagen.');
      }

      // The image is a data URI (e.g., "data:image/png;base64,..."). We need to upload it to Firebase Storage.
      const storageRef = ref(storage, `generated-images/${Date.now()}.png`);
      
      const snapshot = await uploadString(storageRef, media.url, 'data_url');
      const downloadURL = await getDownloadURL(snapshot.ref);

      return { imageUrl: downloadURL };
    } catch (err: any) {
        const errorMessage = err.cause?.message || err.message || 'Error desconocido al generar la imagen.';
        // Check for specific billing error
        if (errorMessage.includes('only be accessed by billed users')) {
            return { error: 'La generación de imágenes con IA requiere un plan de facturación activo en su cuenta de Google Cloud.' };
        }
        return { error: `Error de la IA: ${errorMessage}` };
    }
  }
);
