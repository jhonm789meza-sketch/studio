/**
 * @fileoverview This file initializes and configures the Genkit AI toolkit.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import 'dotenv/config'

// Initialize Genkit and configure plugins.
export const ai = genkit({
  plugins: [
    googleAI({
      // You can specify the API key here, but it's recommended to use the
      // a .env file and the `GEMINI_API_KEY` environment variable.
      // apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  // Log developer-friendly errors and warnings.
  logLevel: 'debug',
  // Perform OpenTelemetry instrumentation and enable traces locally.
  enableTracing: true,
});
