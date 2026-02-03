'use server';

import {ai} from '@/ai/genkit';
import { z } from 'zod';

const EditImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      'The image to edit, as a data URI that must include a MIME type and use Base64 encoding.'
    ),
  prompt: z.string().describe('The user prompt describing the edits to be made.'),
});
export type EditImageInput = z.infer<typeof EditImageInputSchema>;

const EditImageOutputSchema = z.object({
  newImageDataUri: z
    .string()
    .describe(
      'The edited image, as a data URI that must include a MIME type and use Base64 encoding.'
    ),
});
export type EditImageOutput = z.infer<typeof EditImageOutputSchema>;

const editImageFlow = ai.defineFlow(
  {
    name: 'editImageFlow',
    inputSchema: EditImageInputSchema,
    outputSchema: EditImageOutputSchema,
  },
  async (input) => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: [
        {media: {url: input.imageDataUri}},
        {text: `Perform the following edit: ${input.prompt}`},
      ],
      config: {
        responseModalities: ['IMAGE'],
      },
    });
    
    if (!media || !media.url) {
        throw new Error('Image generation failed.');
    }

    return {newImageDataUri: media.url};
  }
);

export async function editImage(input: EditImageInput): Promise<EditImageOutput> {
    return editImageFlow(input);
}
