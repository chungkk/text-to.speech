import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Password hash stored server-side (SHA-256)
// This is NOT the plain password, only the hash
const ADMIN_PASSWORD_HASH = '5ecae39ebaed740931e8f02c46b66ed2b16d7d40fb8c78bdcecaad1c191f091b';

// Generate a session token
function generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Simple in-memory session store (in production, use Redis or database)
const sessions = new Map<string, { expiresAt: number }>();

// Clean expired sessions periodically
function cleanExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
        if (session.expiresAt < now) {
            sessions.delete(token);
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password, action, token } = body;

        // Verify existing session
        if (action === 'verify' && token) {
            cleanExpiredSessions();
            const session = sessions.get(token);
            if (session && session.expiresAt > Date.now()) {
                return NextResponse.json({ success: true, valid: true });
            }
            return NextResponse.json({ success: true, valid: false });
        }

        // Logout
        if (action === 'logout' && token) {
            sessions.delete(token);
            return NextResponse.json({ success: true });
        }

        // Login
        if (!password) {
            return NextResponse.json(
                { success: false, error: 'Password is required' },
                { status: 400 }
            );
        }

        // Hash the provided password and compare
        const hashedInput = crypto.createHash('sha256').update(password).digest('hex');

        if (hashedInput !== ADMIN_PASSWORD_HASH) {
            // Add delay to prevent brute force
            await new Promise(resolve => setTimeout(resolve, 1000));
            return NextResponse.json(
                { success: false, error: 'Incorrect password' },
                { status: 401 }
            );
        }

        // Password correct, create session
        cleanExpiredSessions();
        const sessionToken = generateSessionToken();
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        sessions.set(sessionToken, { expiresAt });

        return NextResponse.json({
            success: true,
            token: sessionToken,
            expiresAt,
        });
    } catch (error) {
        console.error('Admin auth error:', error);
        return NextResponse.json(
            { success: false, error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
