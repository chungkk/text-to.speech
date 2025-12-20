import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ApiKey from '@/models/ApiKey';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyId, apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Call ElevenLabs API directly to get subscription info
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API Error:', response.status, errorText);
      
      if (response.status === 401) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid API key - Key may be expired, revoked, or incorrect',
            details: errorText,
            keyPreview: `${apiKey.substring(0, 10)}...`,
          },
          { status: 401 }
        );
      }
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    const subscription = await response.json();
    console.log('Subscription data:', subscription);
    
    const characterCount = subscription.character_count || 0;
    const characterLimit = subscription.character_limit || 10000;
    const remainingCharacters = characterLimit - characterCount;

    // Update database if keyId provided
    if (keyId) {
      await connectDB();
      const updateData: any = {
        remainingTokens: remainingCharacters,
        totalTokens: characterLimit,
      };
      
      // Auto-reactivate key if it has remaining quota
      if (remainingCharacters > 0) {
        updateData.isActive = true;
      }
      
      await ApiKey.findByIdAndUpdate(keyId, updateData);
    }

    return NextResponse.json({
      success: true,
      data: {
        characterCount,
        characterLimit,
        remainingCharacters,
        percentage: Math.round((remainingCharacters / characterLimit) * 100),
      },
    });
  } catch (error: any) {
    console.error('Check quota error:', error);
    
    // Handle specific ElevenLabs errors
    if (error.statusCode === 401) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check quota' },
      { status: 500 }
    );
  }
}
