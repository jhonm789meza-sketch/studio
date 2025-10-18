'use server';

/**
 * @fileOverview Extracts dominant colors from an image URL and returns them as a theme.
 *
 * - extractImageColors - A function that handles the color extraction process.
 * - ExtractImageColorsInput - The input type for the extractImageColors function.
 * - ExtractImageColorsOutput - The return type for the extractImageColors function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';

const ExtractImageColorsInputSchema = z.object({
  imageUrl: z.string().url().describe('The URL of the image to analyze.'),
});
export type ExtractImageColorsInput = z.infer<typeof ExtractImageColorsInputSchema>;

const ThemeSchema = z.object({
    primary: z.string().describe("The primary color in HSL format (e.g., '240 5.9% 10%')."),
    background: z.string().describe("The background color in HSL format (e.g., '240 10% 98%')."),
    accent: z.string().describe("The accent color in HSL format (e.g., '240 4.8% 95.9%')."),
});

const ExtractImageColorsOutputSchema = z.object({
  theme: ThemeSchema.describe('The generated color theme based on the image.').optional(),
});
export type ExtractImageColorsOutput = z.infer<typeof ExtractImageColorsOutputSchema>;


export async function extractImageColors(input: ExtractImageColorsInput): Promise<ExtractImageColorsOutput> {
  return extractImageColorsFlow(input);
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


const prompt = ai.definePrompt({
  name: 'extractImageColorsPrompt',
  input: { schema: z.object({ photoDataUri: z.string() }) },
  output: { schema: ExtractImageColorsOutputSchema },
  prompt: `Analyze the provided image and determine a harmonious color palette for a web application theme.

  You must provide three colors in HSL format, where each value is a string representation of the HSL values without 'hsl()' or commas, like 'H S% L%'.
  - Primary: The main color for buttons and important elements.
  - Background: The main background color for the application.
  - Accent: A color for secondary elements or highlights.

  Image: {{media url=photoDataUri}}`,
});

const extractImageColorsFlow = ai.defineFlow(
  {
    name: 'extractImageColorsFlow',
    inputSchema: ExtractImageColorsInputSchema,
    outputSchema: ExtractImageColorsOutputSchema,
  },
  async ({ imageUrl }) => {
    // Basic validation for image extension
    if (!imageUrl.match(/\.(jpeg|jpg|png|gif)$/i)) {
      console.log('Invalid image URL for color extraction, skipping.');
      return { theme: undefined };
    }
    const photoDataUri = await imageUrlToDataUri(imageUrl);
    const { output } = await prompt({ photoDataUri });
    return output!;
  }
);
