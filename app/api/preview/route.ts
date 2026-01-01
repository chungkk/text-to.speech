import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ApiKey from '@/models/ApiKey';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { AVAILABLE_VOICES } from '../tts/route';

async function getAnyActiveApiKey(minTokens: number = 100) {
  await connectDB();

  // First try to find a key with enough tokens
  let apiKey = await ApiKey.findOne({
    isActive: true,
    remainingTokens: { $gte: minTokens }
  }).sort({ remainingTokens: -1 });

  // If not found, try any active key (might have outdated remainingTokens in DB)
  if (!apiKey) {
    apiKey = await ApiKey.findOne({ isActive: true }).sort({ remainingTokens: -1 });
  }

  if (!apiKey) {
    throw new Error('No active API key available. Please add API keys in Admin Panel.');
  }

  return apiKey;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { voiceId } = body;

    if (!voiceId) {
      return NextResponse.json(
        { success: false, error: 'Voice ID is required' },
        { status: 400 }
      );
    }

    const voice = AVAILABLE_VOICES.find(v => v.id === voiceId);
    if (!voice) {
      return NextResponse.json(
        { success: false, error: 'Invalid voice ID' },
        { status: 400 }
      );
    }

    // Estimate tokens needed for preview (usually 100-200 chars)
    const estimatedTokens = voice.previewText.length;
    let apiKey = await getAnyActiveApiKey(estimatedTokens);

    let retryCount = 0;
    const maxRetries = 3;
    let audioBuffer: Buffer | null = null;

    while (retryCount < maxRetries && !audioBuffer) {
      try {
        const client = new ElevenLabsClient({
          apiKey: apiKey.key,
        });

        const audioStream = await client.textToSpeech.convert(voiceId, {
          text: voice.previewText,
          modelId: 'eleven_multilingual_v2',
        });

        const chunks: Uint8Array[] = [];
        const reader = audioStream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }

        audioBuffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
        break; // Success, exit loop

      } catch (err) {
        console.error(`Preview attempt ${retryCount + 1} failed:`, err instanceof Error ? err.message : err);

        // Check if error is quota_exceeded
        if ((err as { message?: string }).message?.includes('quota_exceeded') || (err as { statusCode?: number }).statusCode === 401) {
          // Mark this key as out of quota
          await ApiKey.findByIdAndUpdate(apiKey._id, {
            remainingTokens: 0,
            isActive: false,
          });

          retryCount++;

          if (retryCount < maxRetries) {
            // Try to get another key
            try {
              apiKey = await getAnyActiveApiKey(estimatedTokens);
              console.log(`Retrying with another API key: ${apiKey.name}`);
            } catch {
              throw new Error('All API keys have been exhausted. Please check quotas in Admin Panel or add new keys.');
            }
          } else {
            throw new Error('All API keys have insufficient quota. Please check Admin Panel.');
          }
        } else {
          // Other errors, don't retry
          throw err;
        }
      }
    }

    if (!audioBuffer) {
      throw new Error('Failed to generate preview after multiple attempts');
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Preview Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
