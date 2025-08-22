# **App Name**: RifaExpress

## Core Features:

- Raffle Listings: Display available raffles with details (name, description, ticket price, drawing date) from a local JSON file.
- Ticket Selection: Show a ticket selection grid; allow users to pick numbers, updating selected numbers and the total in real-time.
- My Tickets: Display a user's purchased tickets, listing raffle details and selected numbers, retrieved from local storage.
- Raffle Creation: Form to input details for a new raffle (name, description, ticket price, total tickets, drawing date, prize image URL); store this data locally.
- Raffle Details Modal: Modal with raffle details and number selection. Track selections, ensuring unavailable tickets cannot be chosen.
- Celebratory Animation: Trigger confetti animation on successful ticket purchase to celebrate user participation.
- AI Raffle Description: Use AI to create engaging descriptions of the raffles based only on the name of the raffle; make sure to create unique text blurbs using LLM's reasoning tool.

## Style Guidelines:

- Primary color: Saturated blue (#4F46E5) for reliability and financial theme.
- Background color: Very light blue (#F5F3FF) to differentiate content areas subtly.
- Accent color: Vivid violet (#A855F7) to create visual interest.
- Body and headline font: 'Inter' sans-serif for legibility and a modern feel.
- Modern, flat icons from Font Awesome, consistent in style and size.
- Clean, grid-based layout for raffle listings and ticket selection. Effective use of whitespace.
- Subtle transitions and animations to enhance user experience (e.g., fade-in, scale on hover).