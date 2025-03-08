import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/csrf';

export async function GET() {
  try {
    // Generate a new CSRF token
    const token = generateCsrfToken();
    
    // Return the token to the client
    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
} 