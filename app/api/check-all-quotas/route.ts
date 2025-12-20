import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ApiKey from '@/models/ApiKey';

export async function POST() {
  try {
    await connectDB();
    const keys = await ApiKey.find();

    if (keys.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No API keys found',
      });
    }

    const results = await Promise.allSettled(
      keys.map(async (key) => {
        try {
          const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'xi-api-key': key.key,
            },
          });

          if (!response.ok) {
            return {
              id: key._id,
              name: key.name,
              success: false,
              error: response.status === 401 ? 'Invalid API key' : `HTTP ${response.status}`,
            };
          }

          const subscription = await response.json();
          const characterCount = subscription.character_count || 0;
          const characterLimit = subscription.character_limit || 10000;
          const remainingCharacters = characterLimit - characterCount;

          // Update database with auto-reactivation
          const updateData: any = {
            remainingTokens: remainingCharacters,
            totalTokens: characterLimit,
          };
          
          // Auto-reactivate key if it has remaining quota
          if (remainingCharacters > 0) {
            updateData.isActive = true;
          }
          
          await ApiKey.findByIdAndUpdate(key._id, updateData);

          return {
            id: key._id,
            name: key.name,
            success: true,
            characterCount,
            characterLimit,
            remainingCharacters,
            percentage: Math.round((remainingCharacters / characterLimit) * 100),
          };
        } catch (error: any) {
          return {
            id: key._id,
            name: key.name,
            success: false,
            error: error.message,
          };
        }
      })
    );

    const processedResults = results.map((result) => 
      result.status === 'fulfilled' ? result.value : { success: false, error: 'Request failed' }
    );

    const successCount = processedResults.filter((r) => r.success).length;
    const failedCount = processedResults.length - successCount;

    return NextResponse.json({
      success: true,
      data: {
        total: keys.length,
        successful: successCount,
        failed: failedCount,
        results: processedResults,
      },
    });
  } catch (error: any) {
    console.error('Check all quotas error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check quotas' },
      { status: 500 }
    );
  }
}
