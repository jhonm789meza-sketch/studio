import { NextRequest, NextResponse } from 'next/server';
import { generateTicketDetails } from '@/ai/flows/generate-ticket-details';
import { generateQRCode } from '@/lib/qr-generator';

export async function POST(request: NextRequest) {
  try {
    const { prompt, type = 'event' } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // 1. Generate structured content with AI
    const ticketContent = await generateTicketDetails({ prompt, ticketType: type });
    
    // 2. Generate QR code from ticket data
    const qrCode = await generateQRCode(ticketContent.qr_data);
    
    // In a real app, you might generate a full image here.
    // For now, we'll return the QR code as the main image and the structured content.
    const ticketImage = qrCode; 

    return NextResponse.json({
      success: true,
      data: {
        content: ticketContent,
        image: ticketImage,
        qr_code: qrCode
      }
    });

  } catch (error) {
    console.error('Ticket generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error during ticket generation.' },
      { status: 500 }
    );
  }
}
