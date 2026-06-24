'use server';

import { ai } from '@/ai/genkit';

/**
 * @fileOverview Acciones de servidor para la gestión de rifas.
 * 
 * - generateRaffleDescription: Genera una descripción creativa usando IA para el premio de la rifa.
 */

export async function generateRaffleDescription(raffleName: string) {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: `Eres un experto en marketing para sorteos. Genera una descripción corta, emocionante y vendedora para una rifa cuyo premio principal es: "${raffleName}". La respuesta debe estar en español y tener un máximo de 200 caracteres.`,
    });
    
    return { description: response.text };
  } catch (error) {
    console.error('Error generating raffle description:', error);
    return { error: 'No se pudo generar la descripción automáticamente. Por favor, escríbela manualmente.' };
  }
}
