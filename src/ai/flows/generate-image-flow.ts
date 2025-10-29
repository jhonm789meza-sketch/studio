'use server';
/**
 * @fileOverview A flow for generating an image from a text prompt using OpenAI.
 *
 * - generateImage - A function that handles image generation.
 */

import { z } from 'zod';
import { uploadString, ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import axios from 'axios';

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().optional(),
  error: z.string().optional(),
});

const API_KEY = process.env.OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/images/generations';

export async function generateImage(
  prompt: string
): Promise<z.infer<typeof GenerateImageOutputSchema>> {
    if (!API_KEY) {
        return { error: 'La clave de API de OpenAI no está configurada en el servidor.' };
    }

    try {
        const response = await axios.post(
            API_URL,
            {
                prompt: prompt,
                n: 1,
                size: '1024x1024',
                model: "dall-e-3",
                quality: "standard",
                response_format: 'b64_json', // Request image as base64
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const b64Json = response.data.data[0].b64_json;
        if (!b64Json) {
            throw new Error('La respuesta de la API no incluyó datos de imagen.');
        }

        const dataUrl = `data:image/png;base64,${b64Json}`;

        const storageRef = ref(storage, `generated-images/${Date.now()}.png`);
        const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
        const downloadURL = await getDownloadURL(snapshot.ref);

        return { imageUrl: downloadURL };
    } catch (err: any) {
        console.error('Error generating image with OpenAI:', err.response ? err.response.data : err.message);
        const errorMessage = err.response?.data?.error?.message || err.message || 'Error desconocido al generar la imagen.';
        return { error: `Error de la IA: ${errorMessage}` };
    }
}
