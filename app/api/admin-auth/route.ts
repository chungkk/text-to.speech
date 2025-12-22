import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const ADMIN_PASSWORD_HASH = '$2b$10$m0q8G4lHDEtlwwGOMPZRVuiAzuSWlNI3fRJ8WnuTv7oKp7EXOlSvq'; // Chungkk123456@@

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (isValid) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('admin_auth', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
      });
      return response;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get('admin_auth');
  
  if (authCookie?.value === 'true') {
    return NextResponse.json({ success: true, authenticated: true });
  }
  
  return NextResponse.json({ success: true, authenticated: false });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_auth');
  return response;
}
