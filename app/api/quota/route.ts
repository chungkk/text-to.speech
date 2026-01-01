import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ApiKey from '@/models/ApiKey';

interface ApiKeyDocument {
  _id: string | { toString(): string };
  key: string;
  name: string;
  remainingTokens: number;
  totalTokens: number;
  isActive: boolean;
}

async function syncQuotaFromElevenLabs(apiKey: ApiKeyDocument) {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey.key,
      },
    });

    if (!response.ok) {
      console.error(`Failed to sync quota for ${apiKey.name}: HTTP ${response.status}`);
      return null;
    }

    const subscription = await response.json();
    const characterCount = subscription.character_count || 0;
    const characterLimit = subscription.character_limit || 10000;
    const remainingCharacters = characterLimit - characterCount;

    // Update database with real quota
    await ApiKey.findByIdAndUpdate(apiKey._id, {
      remainingTokens: remainingCharacters,
      totalTokens: characterLimit,
      isActive: remainingCharacters > 0, // Auto-reactivate if has quota
    });

    console.log(`✓ Synced ${apiKey.name}: ${remainingCharacters}/${characterLimit} remaining`);

    return {
      id: apiKey._id.toString(),
      name: apiKey.name,
      remainingTokens: remainingCharacters,
      totalTokens: characterLimit,
      isActive: remainingCharacters > 0,
    };
  } catch (error) {
    console.error(`Error syncing quota for ${apiKey.name}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    await connectDB();

    console.log('📊 Starting quota check for ALL API keys...');

    // Get ALL API keys (active and inactive) to sync
    const allApiKeys = await ApiKey.find({})
      .select('name key remainingTokens totalTokens isActive')
      .sort({ remainingTokens: -1 });

    if (allApiKeys.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No API keys found. Please add API keys in Admin Panel.'
      }, { status: 404 });
    }

    console.log(`🔍 Found ${allApiKeys.length} total API keys, syncing with ElevenLabs...`);

    // Sync ALL keys in parallel
    const syncPromises = allApiKeys.map(key => syncQuotaFromElevenLabs(key));
    const syncedResults = await Promise.all(syncPromises);

    // Filter out failed syncs and only keep active keys with quota
    const validKeys = syncedResults.filter((key): key is NonNullable<typeof key> =>
      key !== null && key.isActive && key.remainingTokens > 0
    );

    if (validKeys.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'All API keys have 0 quota. Please add more keys or wait for quota reset.'
      }, { status: 404 });
    }

    // Sort by remaining tokens descending
    validKeys.sort((a, b) => b.remainingTokens - a.remainingTokens);

    // Get the best key (highest quota)
    const bestKey = validKeys[0];

    // Calculate total available tokens across all valid keys
    const totalAvailable = validKeys.reduce((sum, key) => sum + key.remainingTokens, 0);

    console.log(`✅ Best key: ${bestKey.name} with ${bestKey.remainingTokens} tokens`);
    console.log(`📊 Total available: ${totalAvailable} tokens across ${validKeys.length} keys`);

    return NextResponse.json({
      success: true,
      data: {
        maxTokensPerRequest: bestKey.remainingTokens,
        totalAvailableTokens: totalAvailable,
        activeKeysCount: validKeys.length,
        keys: validKeys.map(key => ({
          name: key.name,
          remainingTokens: key.remainingTokens,
          totalTokens: key.totalTokens,
          percentageRemaining: ((key.remainingTokens / key.totalTokens) * 100).toFixed(1)
        }))
      }
    });
  } catch (error) {
    console.error('Quota check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check quota'
    }, { status: 500 });
  }
}
