import { NextResponse } from 'next/server';
import { AVAILABLE_VOICES } from '../tts/route';

export async function GET() {
  return NextResponse.json({ success: true, data: AVAILABLE_VOICES });
}
