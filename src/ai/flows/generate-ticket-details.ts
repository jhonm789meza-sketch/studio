'use server';

/**
 * @fileOverview Generates structured ticket details from a text prompt.
 * 
 * - generateTicketDetails - A function that creates detailed ticket content using AI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GenerateTicketDetailsInputSchema = z.object({
  prompt: z.string().describe('The user-provided description of the event or ticket.'),
  ticketType: z.string().describe('The type of ticket (e.g., event, concert, conference).'),
});

const TicketContentSchema = z.object({
  event_name: z.string().describe('A creative and professional name for the event. Should be concise and engaging.'),
  date: z.string().describe('A realistic future date for the event in YYYY-MM-DD format. Must be a plausible date for the described event.'),
  time: z.string().describe('A valid time for the event, including AM/PM (e.g., 8:00 PM).'),
  location: z.string().describe('A specific and credible location for the event. Be creative and realistic (e.g., "Grand Arena", "National Auditorium", "City Convention Center").'),
  seat: z.string().describe('A seat number or location (e.g., A12, VIP-3, General Admission). Invent a plausible seat based on the event type.'),
  price: z.string().describe('The price of the ticket, formatted with a currency symbol (e.g., $75.00). Must be a realistic price for the event.'),
  organizer: z.string().describe('A realistic name for the organizing company or entity (e.g., "Apex Events", "Starlight Productions").'),
  ticket_id: z.string().describe('A unique ticket ID, following a pattern like TKT- followed by 6 random alphanumeric characters (e.g., TKT-A4B1C2).'),
  qr_data: z.string().describe('A string of data to be encoded in the QR code, typically containing the ticket ID, event name, and date.'),
});

export type TicketContent = z.infer<typeof TicketContentSchema>;

const generateDetailsPrompt = ai.definePrompt({
    name: 'generateTicketDetailsPrompt',
    model: googleAI('gemini-1.5-flash-latest'),
    input: { schema: GenerateTicketDetailsInputSchema },
    output: { schema: TicketContentSchema },
    prompt: `You are an expert event planner AI. Your task is to generate realistic and complete details for a ticket based on a user's prompt and a ticket type.

    User Prompt: "{{prompt}}"
    Ticket Type: "{{ticketType}}"

    Requirements:
    - Generate a creative, professional, and exciting event_name based on the user's prompt.
    - Provide a realistic future date (YYYY-MM-DD) and a valid time.
    - Create a specific and believable location.
    - Assign a plausible seat number/section (e.g., SEC-104 Row G Seat 12, VIP Lounge, General Admission).
    - Determine a plausible price with a currency symbol.
    - Invent a realistic organizer name.
    - Generate a unique ticket_id with the format TKT- followed by 6 random alphanumeric characters.
    - Create a qr_data string that includes the ticket_id and a short version of the event_name for QR code encoding.

    You must respond ONLY with a valid JSON object that conforms to the output schema.
    `,
    config: {
      temperature: 0.8,
    }
});


export const generateTicketDetails = ai.defineFlow(
  {
    name: 'generateTicketDetailsFlow',
    inputSchema: GenerateTicketDetailsInputSchema,
    outputSchema: TicketContentSchema,
  },
  async (input) => {
    const { output } = await generateDetailsPrompt(input);

    if (!output) {
      throw new Error('AI failed to generate ticket details.');
    }
    
    return output;
  }
);

    