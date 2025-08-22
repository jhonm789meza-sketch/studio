'use server';

import { generateRaffleDescription as generateRaffleDescriptionFlow } from '@/ai/flows/generate-raffle-description';

export async function generateRaffleDescription(raffleName: string): Promise<{description: string} | {error: string}> {
  if (!raffleName) {
    return { error: 'Raffle name is required.' };
  }
  try {
    const result = await generateRaffleDescriptionFlow({ raffleName });
    return { description: result.description };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to generate description. Please try again.' };
  }
}
