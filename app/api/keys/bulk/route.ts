import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ApiKey from '@/models/ApiKey';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { keys, startNumber = 1, totalTokens = 10000 } = body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keys array is required and must not be empty' },
        { status: 400 }
      );
    }

    const results = {
      successful: 0,
      failed: 0,
      total: keys.length,
      details: [] as Array<{ key: string; status: 'success' | 'failed'; reason?: string }>
    };

    // Process each key
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i].trim();
      const name = `${startNumber + i}`;

      if (!key || key.length === 0) {
        results.failed++;
        results.details.push({
          key: `Key at position ${i + 1}`,
          status: 'failed',
          reason: 'Empty key'
        });
        continue;
      }

      try {
        // Check if key already exists
        const existingKey = await ApiKey.findOne({ key });
        if (existingKey) {
          results.failed++;
          results.details.push({
            key: key.substring(0, 10) + '...',
            status: 'failed',
            reason: 'Key already exists'
          });
          continue;
        }

        // Create the API key
        await ApiKey.create({
          key,
          name,
          totalTokens,
          remainingTokens: totalTokens,
          isActive: true
        });

        results.successful++;
        results.details.push({
          key: key.substring(0, 10) + '...',
          status: 'success'
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          key: key.substring(0, 10) + '...',
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    }, { status: 201 });
  } catch (error) {
    console.error('Bulk add error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add API keys' },
      { status: 500 }
    );
  }
}
