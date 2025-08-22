'use server';

import { generateRaffleDescription as generateRaffleDescriptionFlow } from '@/ai/flows/generate-raffle-description';

export async function generateRaffleDescription(raffleName: string): Promise<{description: string} | {error: string}> {
  if (!raffleName) {
    return { error: 'El nombre de la rifa es obligatorio.' };
  }
  try {
    const result = await generateRaffleDescriptionFlow({ raffleName });
    return { description: result.description };
  } catch (e) {
    console.error(e);
    return { error: 'No se pudo generar la descripción. Por favor, inténtalo de nuevo.' };
  }
}
