import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ApiKey from '@/models/ApiKey';

async function getAvailableApiKey() {
  await connectDB();
  
  const apiKey = await ApiKey.findOne({
    isActive: true,
    remainingTokens: { $gte: 100 } // Sound effects require minimal tokens
  }).sort({ remainingTokens: -1 });

  if (!apiKey) {
    throw new Error('No API key available. Please add a key in Admin Panel.');
  }

  return apiKey;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      text, 
      duration_seconds = 5, 
      prompt_influence = 0.7 
    } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text prompt is required' },
        { status: 400 }
      );
    }

    if (duration_seconds < 0.5 || duration_seconds > 22) {
      return NextResponse.json(
        { success: false, error: 'Duration must be between 0.5 and 22 seconds' },
        { status: 400 }
      );
    }

    const apiKey = await getAvailableApiKey();

    console.log(`🎵 Generating sound effect: "${text}"`);

    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey.key,
      },
      body: JSON.stringify({
        text,
        duration_seconds,
        prompt_influence,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API Error:', errorText);
      throw new Error(`Failed to generate sound effect: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    console.log(`✓ Sound effect generated (${audioBuffer.byteLength} bytes)`);

    return new NextResponse(Buffer.from(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="sound-effect.mp3"',
      },
    });
  } catch (error: any) {
    console.error('Sound Effect Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate sound effect' },
      { status: 500 }
    );
  }
}
