// CSRF Protection Module

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Generate a CSRF token
export function generateCsrfToken(): string {
  const token = crypto.randomBytes(16).toString('hex');
  
  // Store the token in a cookie
  cookies().set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 3600 // 1 hour
  });
  
  return token;
}

// Verify a CSRF token
export function verifyCsrfToken(request: NextRequest): boolean {
  const cookieToken = cookies().get('csrf-token')?.value;
  const headerToken = request.headers.get('x-csrf-token');
  
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  return cookieToken === headerToken;
}

// Middleware to check CSRF token for POST requests
export function csrfProtection(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    // Only check CSRF for non-GET methods
    if (request.method !== 'GET') {
      const isValid = verifyCsrfToken(request);
      
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid or missing CSRF token' },
          { status: 403 }
        );
      }
    }
    
    return handler(request);
  };
} 