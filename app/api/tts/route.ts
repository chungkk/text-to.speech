import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ApiKey from '@/models/ApiKey';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// Available voices - German voices (Most popular and high quality)
export const AVAILABLE_VOICES = [
  // === NATIVE GERMAN VOICES (Beste Qualität für Deutsch) ===
  { 
    id: 'TX3LPaxmHKxFdv7VOQHJ', 
    name: '🇩🇪 Helmut - Epischer Trailer', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐⭐ BESTE WAHL - Tiefe, kraftvolle deutsche Stimme, sehr authentisch',
    previewText: 'Guten Tag, ich bin Helmut. Meine Stimme ist tief und kraftvoll, perfekt für epische Erzählungen und dramatische Inhalte auf Deutsch.'
  },
  { 
    id: 'iP95p4xoKVk53GoZ742B', 
    name: '🇩🇪 Chris - Casual Deutsch', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐⭐ NATIVE - Lockere, freundliche deutsche Stimme für alltägliche Inhalte',
    previewText: 'Hallo, ich heiße Chris. Ich spreche Deutsch wie ein echter Muttersprachler, entspannt und natürlich für Videos und Podcasts.'
  },
  { 
    id: 'qJClEJyMLJV5sMjVazal', 
    name: '🇩🇪 Otto - Intelligent & Klar', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐⭐ NATIVE - Intelligente, klare deutsche Stimme für Bildung',
    previewText: 'Guten Tag, ich bin Otto. Meine klare und intelligente deutsche Stimme ist perfekt für Bildungsinhalte, Erklärvideos und wissenschaftliche Themen.'
  },
  { 
    id: 'nPczCjzI2devNBz1zQrb', 
    name: '🇩🇪 Brian - Professionell', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐⭐ NATIVE - Klare, professionelle deutsche Stimme für Business',
    previewText: 'Guten Tag, ich bin Brian. Meine klare deutsche Aussprache eignet sich perfekt für geschäftliche Präsentationen und Schulungen.'
  },
  { 
    id: 'XrExE9yKIg1WjnnlVkGX', 
    name: '🇩🇪 Matilda - Warm & Freundlich', 
    language: 'Deutsch (Muttersprachlerin)',
    description: '⭐⭐⭐ NATIVE - Warme weibliche Stimme, perfekt für Hörbücher',
    previewText: 'Hallo, ich bin Matilda. Meine warme deutsche Stimme macht Geschichten lebendig und fesselt Ihr Publikum von Anfang bis Ende.'
  },
  { 
    id: 'XB0fDUnXU5powFXDhCwa', 
    name: '🇩🇪 Charlotte - Elegant', 
    language: 'Deutsch (Muttersprachlerin)',
    description: '⭐⭐ NATIVE - Raffinierte deutsche Stimme für gehobene Inhalte',
    previewText: 'Guten Tag, ich heiße Charlotte. Ich spreche elegant und klar auf Deutsch, ideal für gehobene und kulturelle Inhalte.'
  },
  { 
    id: 'pFZP5JQG7iQjIQuC4Bku', 
    name: '🇩🇪 Lily - Jugendlich', 
    language: 'Deutsch (Muttersprachlerin)',
    description: '⭐⭐ NATIVE - Junge, energische deutsche Stimme für moderne Inhalte',
    previewText: 'Hi, ich bin Lily. Meine junge deutsche Stimme passt super zu Social Media, Vlogs und modernen Erklärvideos.'
  },
  { 
    id: 'pqHfZKP75CvOlQylNhV4', 
    name: '🇩🇪 Bill - Warmherzig', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Warme männliche Stimme für Tutorials',
    previewText: 'Hallo, ich bin Bill. Meine warmherzige deutsche Stimme schafft Vertrauen und macht komplexe Themen leicht zugänglich.'
  },
  { 
    id: 'N2lVS1w4EtoT3dr4eOWO', 
    name: '🇩🇪 Callum - Dramatisch', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Intensive deutsche Stimme für Thriller',
    previewText: 'Guten Tag, ich bin Callum. Meine dramatische deutsche Stimme zieht Zuhörer in spannende Geschichten und Thriller hinein.'
  },
  { 
    id: 'ThT5KcBeYPX3keUQqHPh', 
    name: '🇩🇪 Dorothy - Sophistiziert', 
    language: 'Deutsch (Muttersprachlerin)',
    description: '⭐⭐ NATIVE - Elegante weibliche Stimme für Kultur',
    previewText: 'Guten Tag, ich bin Dorothy. Meine kultivierte deutsche Aussprache eignet sich perfekt für Literatur und anspruchsvolle Themen.'
  },
  { 
    id: 'CYw3kZ02Hs0563khs1Fj', 
    name: '🇩🇪 Dave - Charaktervoll', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Markante Stimme für Dokumentationen',
    previewText: 'Hallo, ich bin Dave. Meine charaktervolle Stimme verleiht deutschen Dokumentationen und Reportagen Autorität und Glaubwürdigkeit.'
  },
  { 
    id: 'IKne3meq5aSn9XLyUdCD', 
    name: '🇩🇪 Charlie - Entspannt', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Lockere deutsche Stimme für Vlogs',
    previewText: 'Hey, ich bin Charlie. Meine entspannte deutsche Art macht Inhalte locker und verständlich für jedermann.'
  },
  { 
    id: 'onwK4e9ZLuTAKqWW03F9', 
    name: '🇩🇪 Daniel - Autoritativ', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐⭐ NATIVE - Kraftvolle Nachrichten-Stimme',
    previewText: 'Guten Tag, ich bin Daniel. Meine klare und kraftvolle deutsche Stimme eignet sich perfekt für Nachrichten und offizielle Ankündigungen.'
  },
  { 
    id: 'VR6AewLTigWG4xSOukaG', 
    name: '🇩🇪 Arnold - Klar & Energisch', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Dynamische Stimme für Erklärvideos',
    previewText: 'Hallo, ich bin Arnold. Meine klare und energische Stimme macht deutsche Tutorials und Anleitungen leicht verständlich.'
  },
  { 
    id: 'JBFqnCBsd6RMkjVDRZzb', 
    name: '🇩🇪 George - Warm & Beruhigend', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Sanfte männliche Stimme',
    previewText: 'Guten Tag, ich bin George. Meine warme und beruhigende deutsche Stimme ist ideal für entspannende Inhalte und Hörbücher.'
  },
  { 
    id: 'cgSgspJ2msm6clMCkdW9', 
    name: '🇩🇪 Jessica - Professionell', 
    language: 'Deutsch (Muttersprachlerin)',
    description: '⭐⭐⭐ NATIVE - Ausdrucksstarke weibliche Stimme',
    previewText: 'Hallo, ich bin Jessica. Meine professionelle deutsche Stimme eignet sich hervorragend für Business-Präsentationen und E-Learning.'
  },
  { 
    id: 'cjVigY5qzO86Huf0OWal', 
    name: '🇩🇪 Eric - Freundlich', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Zugängliche männliche Stimme',
    previewText: 'Hallo, ich bin Eric. Meine freundliche deutsche Stimme schafft eine angenehme Atmosphäre für jede Art von Inhalt.'
  },
  { 
    id: 'FGY2WhTYpPnrIDTdsKH5', 
    name: '🇩🇪 Laura - Lebhaft', 
    language: 'Deutsch (Muttersprachlerin)',
    description: '⭐⭐ NATIVE - Energische weibliche Stimme',
    previewText: 'Hi, ich bin Laura. Meine lebhafte deutsche Stimme bringt Schwung in Werbung und dynamische Präsentationen.'
  },
  { 
    id: 'GBv7mTt0atIp3Br8iCZE', 
    name: '🇩🇪 Thomas - Ausgeglichen', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Vielseitige männliche Stimme',
    previewText: 'Guten Tag, ich bin Thomas. Meine ausgewogene deutsche Stimme ist vielseitig einsetzbar für verschiedenste Projekte.'
  },
  { 
    id: 'ODq5zmih8GrVes37Dizd', 
    name: '🇩🇪 Patrick - Selbstbewusst', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Starke männliche Stimme',
    previewText: 'Hallo, ich bin Patrick. Meine selbstbewusste deutsche Stimme überzeugt bei Präsentationen und Werbeinhalten.'
  },
  { 
    id: 'SOYHLrjzK2X1ezoPC6cr', 
    name: '🇩🇪 Harry - Charakteristisch', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Unverwechselbare männliche Stimme',
    previewText: 'Guten Tag, ich bin Harry. Meine charakteristische deutsche Stimme bleibt im Gedächtnis und hebt Ihre Inhalte hervor.'
  },
  { 
    id: 'TxGEqnHWrfWFTfGW9XjX', 
    name: '🇩🇪 Josh - Jung & Modern', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Jugendliche männliche Stimme',
    previewText: 'Hey, ich bin Josh. Meine junge deutsche Stimme spricht die Sprache der Generation Z, perfekt für Social Media.'
  },
  { 
    id: 'MF3mGyEYCl7XYWbV9V6O', 
    name: '🇩🇪 Elli - Dynamisch', 
    language: 'Deutsch (Muttersprachlerin)',
    description: '⭐⭐ NATIVE - Lebhafte weibliche Stimme',
    previewText: 'Hi, ich bin Elli. Meine dynamische deutsche Stimme bringt Energie in Werbespots und macht Ihre Botschaft unvergesslich.'
  },
  
  // === ADDITIONAL GERMAN NATIVE VOICES ===
  { 
    id: 'zrHiDhphv9ZnVXBqCLjz', 
    name: '🇩🇪 Clyde - Vielseitig', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Vielseitige männliche Stimme',
    previewText: 'Guten Tag, ich bin Clyde. Meine vielseitige deutsche Stimme passt sich jedem Projekt an, von Hörbüchern bis Werbung.'
  },
  { 
    id: '2EiwWnXFnvU5JabPnv8n', 
    name: '🇩🇪 Marcus - Stark & Direkt', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Kraftvolle männliche Stimme',
    previewText: 'Hallo, ich bin Marcus. Meine starke und direkte deutsche Stimme eignet sich perfekt für überzeugende Präsentationen.'
  },
  { 
    id: '5Q0t7uMcjvnagumLfvZi', 
    name: '🇩🇪 Emily - Expressiv', 
    language: 'Deutsch (Muttersprachlerin)',
    description: '⭐⭐ NATIVE - Ausdrucksstarke weibliche Stimme',
    previewText: 'Hallo, ich bin Emily. Meine expressive deutsche Stimme bringt Emotionen in jede Geschichte und fesselt Ihr Publikum.'
  },
  { 
    id: 'EXAVITQu4vr4xnSDxMaL', 
    name: '🇩🇪 Sarah - Angenehm', 
    language: 'Deutsch (Muttersprachlerin)',
    description: '⭐⭐⭐ NATIVE - Sehr angenehme weibliche Stimme',
    previewText: 'Hallo, ich bin Sarah. Meine angenehme deutsche Stimme schafft eine beruhigende Atmosphäre für Meditation und Hörbücher.'
  },
  { 
    id: 'pNInz6obpgDQGcFmaJgB', 
    name: '🇩🇪 Adam - Tief', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐⭐ NATIVE - Tiefe, resonante männliche Stimme',
    previewText: 'Guten Tag, ich bin Adam. Meine tiefe deutsche Stimme verleiht jedem Inhalt Autorität und Professionalität.'
  },
  { 
    id: 'ErXwobaYiN019PkySvjV', 
    name: '🇩🇪 Antoni - Sanft', 
    language: 'Deutsch (Muttersprachler)',
    description: '⭐⭐ NATIVE - Sanfte männliche Stimme',
    previewText: 'Hallo, ich bin Antoni. Meine sanfte deutsche Stimme ist perfekt für entspannende Podcasts und lange Erzählungen.'
  },

  // === ENGLISH VOICES (Popular & High Quality) ===
  { 
    id: '21m00Tcm4TlvDq8ikWAM', 
    name: '🇺🇸 Rachel - Calm & Professional', 
    language: 'English (Native)',
    description: '⭐⭐⭐ BEST - Clear American female voice for narration',
    previewText: 'Hello, I am Rachel. My calm and professional voice is perfect for audiobooks, documentaries, and educational content.'
  },
  { 
    id: 'AZnzlk1XvdvUeBnXmlld', 
    name: '🇺🇸 Domi - Strong & Confident', 
    language: 'English (Native)',
    description: '⭐⭐⭐ POPULAR - Powerful American female voice',
    previewText: 'Hi, I am Domi. My strong and confident voice commands attention, ideal for advertising and impactful presentations.'
  },
  { 
    id: 'pNInz6obpgDQGcFmaJgB', 
    name: '🇺🇸 Adam - Deep & Professional', 
    language: 'English (Native)',
    description: '⭐⭐⭐ TOP RATED - Deep American male voice for everything',
    previewText: 'Hello, I am Adam. My deep, resonant voice is versatile and engaging, perfect for audiobooks, podcasts, and narration.'
  },
  { 
    id: 'EXAVITQu4vr4xnSDxMaL', 
    name: '🇺🇸 Sarah - Soft & Warm', 
    language: 'English (Native)',
    description: '⭐⭐⭐ POPULAR - Gentle American female voice',
    previewText: 'Hello, I am Sarah. My soft and warm voice creates a comforting atmosphere, perfect for meditation and storytelling.'
  },
  { 
    id: 'ErXwobaYiN019PkySvjV', 
    name: '🇺🇸 Antoni - Warm & Pleasant', 
    language: 'English (Native)',
    description: '⭐⭐ Well-balanced American male voice',
    previewText: 'Hello, I am Antoni. My warm and pleasant voice is easy to listen to, ideal for podcasts and long-form content.'
  },
  { 
    id: 'TxGEqnHWrfWFTfGW9XjX', 
    name: '🇺🇸 Josh - Young & Energetic', 
    language: 'English (Native)',
    description: '⭐⭐ Youthful American male voice for modern content',
    previewText: 'Hey, I am Josh. My young and energetic voice resonates with Gen Z, perfect for social media and vlogs.'
  },
  { 
    id: 'MF3mGyEYCl7XYWbV9V6O', 
    name: '🇺🇸 Elli - Dynamic & Expressive', 
    language: 'English (Native)',
    description: '⭐⭐ Lively American female voice for ads',
    previewText: 'Hi, I am Elli. My dynamic and expressive voice brings energy to commercials and makes your message unforgettable.'
  },
  { 
    id: 'VR6AewLTigWG4xSOukaG', 
    name: '🇺🇸 Arnold - Clear & Articulate', 
    language: 'English (Native)',
    description: '⭐ Crisp American male voice for tutorials',
    previewText: 'Hello, I am Arnold. My clear and articulate voice makes complex topics easy to understand in tutorials and guides.'
  },
  { 
    id: 'IKne3meq5aSn9XLyUdCD', 
    name: '🇬🇧 Charlie - British Casual', 
    language: 'English (British)',
    description: '⭐⭐ Relaxed British male voice',
    previewText: 'Hello, I am Charlie. My relaxed British accent makes any topic approachable and engaging for diverse audiences.'
  },
  { 
    id: 'onwK4e9ZLuTAKqWW03F9', 
    name: '🇬🇧 Daniel - British Authority', 
    language: 'English (British)',
    description: '⭐⭐ Strong British male voice for news',
    previewText: 'Good day, I am Daniel. My authoritative British voice is perfect for news broadcasts and official announcements.'
  },

  // === VIETNAMESE VOICES (Tiếng Việt) ===
  { 
    id: 'bIHbv24MWmeRgasZH58o', 
    name: '🇻🇳 Linh - Nữ Miền Bắc', 
    language: 'Vietnamese',
    description: '⭐⭐⭐ Giọng nữ Hà Nội chuẩn, rõ ràng',
    previewText: 'Xin chào, tôi là Linh. Giọng nói của tôi mang âm hưởng miền Bắc thuần túy, phù hợp cho tin tức và giáo dục.'
  },
  { 
    id: 'ThT5KcBeYPX3keUQqHPh', 
    name: '🇻🇳 Mai - Nữ Duyên Dáng', 
    language: 'Vietnamese',
    description: '⭐⭐⭐ Giọng nữ nhẹ nhàng, ấm áp',
    previewText: 'Xin chào, tôi là Mai. Giọng nói nhẹ nhàng của tôi tạo cảm giác thân thiện, phù hợp cho sách nói và podcast.'
  },
  { 
    id: 'pNInz6obpgDQGcFmaJgB', 
    name: '🇻🇳 Minh - Nam Trầm Ấm', 
    language: 'Vietnamese',
    description: '⭐⭐⭐ Giọng nam trầm, chuyên nghiệp',
    previewText: 'Xin chào, tôi là Minh. Giọng trầm ấm của tôi phù hợp cho thuyết trình, quảng cáo và kể chuyện.'
  },
  { 
    id: 'EXAVITQu4vr4xnSDxMaL', 
    name: '🇻🇳 Hương - Nữ Miền Nam', 
    language: 'Vietnamese',
    description: '⭐⭐ Giọng nữ Sài Gòn vui tươi',
    previewText: 'Chào bạn, mình là Hương. Giọng nói của mình mang âm hưởng miền Nam, vui tươi và gần gũi.'
  },
  { 
    id: 'ErXwobaYiN019PkySvjV', 
    name: '🇻🇳 Tuấn - Nam Miền Trung', 
    language: 'Vietnamese',
    description: '⭐⭐ Giọng nam miền Trung đặc trưng',
    previewText: 'Xin chào, tôi là Tuấn. Giọng nói của tôi mang âm hưởng miền Trung, phù hợp cho nội dung văn hóa.'
  },
  { 
    id: 'MF3mGyEYCl7XYWbV9V6O', 
    name: '🇻🇳 Lan - Nữ Trẻ Trung', 
    language: 'Vietnamese',
    description: '⭐⭐ Giọng nữ trẻ, năng động',
    previewText: 'Chào mọi người, mình là Lan. Giọng nói trẻ trung của mình phù hợp cho video social media và vlog.'
  },
  { 
    id: 'TxGEqnHWrfWFTfGW9XjX', 
    name: '🇻🇳 Khang - Nam Trẻ', 
    language: 'Vietnamese',
    description: '⭐ Giọng nam trẻ, hiện đại',
    previewText: 'Chào bạn, mình là Khang. Giọng nói của mình phù hợp với giới trẻ, lý tưởng cho content online.'
  },
];

const CHARACTERS_PER_TOKEN = 1;

async function syncQuotaFromElevenLabs(apiKey: any) {
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
      ...apiKey.toObject(),
      remainingTokens: remainingCharacters,
      totalTokens: characterLimit,
      isActive: remainingCharacters > 0,
    };
  } catch (error) {
    console.error(`Error syncing quota for ${apiKey.name}:`, error);
    return null;
  }
}

async function getAvailableApiKey(requiredTokens: number, excludeIds: string[] = []) {
  await connectDB();
  
  console.log(`🔍 Looking for best-fit API key for ${requiredTokens} tokens (excluding ${excludeIds.length} keys)`);
  
  // Always sync all active keys first to ensure accurate quotas
  const allActive = await ApiKey.find({ isActive: true });
  console.log(`🔄 Syncing ${allActive.length} active keys to get real-time quotas...`);
  
  for (const key of allActive) {
    const lastUpdated = key.updatedAt || key.createdAt;
    const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    // Only sync if not recently updated (within 1 hour)
    if (hoursSinceUpdate > 1) {
      await syncQuotaFromElevenLabs(key);
    }
  }
  
  // Get all available keys (not excluded, active, sufficient quota)
  const query: any = {
    isActive: true,
    remainingTokens: { $gte: requiredTokens }
  };
  
  if (excludeIds.length > 0) {
    query._id = { $nin: excludeIds };
  }
  
  // Find all matching keys and sort by remainingTokens ASCENDING (smallest first)
  const availableKeys = await ApiKey.find(query).sort({ remainingTokens: 1 });
  
  let apiKey = null;
  
  if (availableKeys.length > 0) {
    // Best-fit strategy: use smallest key that fits (avoid wasting large quotas)
    apiKey = availableKeys[0];
    console.log(`🎯 Best-fit: ${apiKey.name} with ${apiKey.remainingTokens} tokens for ${requiredTokens} required`);
  } else {
    console.log(`❌ No key found with >= ${requiredTokens} tokens`);
  }

  // Auto-refresh if key hasn't been synced recently
  if (apiKey) {
    const lastUpdated = apiKey.updatedAt || apiKey.createdAt;
    const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    // If key not updated in 6 hours, sync quota
    if (hoursSinceUpdate > 6) {
      console.log(`⏰ Key ${apiKey.name} not synced for ${hoursSinceUpdate.toFixed(1)}h, refreshing...`);
      const syncedKey = await syncQuotaFromElevenLabs(apiKey);
      if (syncedKey) {
        apiKey = syncedKey;
      }
    }
  }

  // If no key found, try syncing all active keys (excluding already tried ones)
  if (!apiKey) {
    console.log('⚠ No key with sufficient quota in DB, trying to sync all active keys...');
    
    const query: any = { isActive: true };
    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds };
    }
    
    const allActiveKeys = await ApiKey.find(query).sort({ remainingTokens: -1 });
    
    if (allActiveKeys.length === 0) {
      console.log('✗ No more keys to try (all excluded or inactive)');
    } else {
      for (const key of allActiveKeys) {
        const syncedKey = await syncQuotaFromElevenLabs(key);
        if (syncedKey && syncedKey.remainingTokens >= requiredTokens) {
          console.log(`✓ Found available quota after sync: ${syncedKey.name}`);
          return syncedKey;
        }
      }
    }
  }

  if (!apiKey) {
    const inactiveKeys = await ApiKey.findOne({ 
      isActive: false,
      remainingTokens: { $gte: requiredTokens }
    });
    
    if (inactiveKeys) {
      throw new Error('All API keys are deactivated. Please activate at least one key in Admin Panel.');
    }
    throw new Error('No API key available with sufficient tokens. Please add more keys or check quotas in Admin Panel.');
  }

  return apiKey;
}

async function updateApiKeyUsage(keyId: string, tokensUsed: number) {
  await ApiKey.findByIdAndUpdate(keyId, {
    $inc: { remainingTokens: -tokensUsed },
    lastUsed: new Date(),
  });
}

// Generate cache filename based on text, voiceId, and voice settings
function generateCacheKey(text: string, voiceId: string, voiceSettings: any): string {
  const content = JSON.stringify({ text, voiceId, voiceSettings });
  return createHash('md5').update(content).digest('hex');
}

// Check if cached audio exists
async function getCachedAudio(cacheKey: string): Promise<Buffer | null> {
  try {
    const cacheDir = path.join(process.cwd(), 'public', 'audio-cache');
    const filePath = path.join(cacheDir, `${cacheKey}.mp3`);
    const buffer = await fs.readFile(filePath);
    console.log(`✓ Cache HIT: ${cacheKey}`);
    return buffer;
  } catch (error) {
    console.log(`✗ Cache MISS: ${cacheKey}`);
    return null;
  }
}

// Save audio to cache
async function saveCachedAudio(cacheKey: string, audioBuffer: Buffer): Promise<void> {
  try {
    const cacheDir = path.join(process.cwd(), 'public', 'audio-cache');
    await fs.mkdir(cacheDir, { recursive: true });
    const filePath = path.join(cacheDir, `${cacheKey}.mp3`);
    await fs.writeFile(filePath, audioBuffer);
    console.log(`✓ Cached audio saved: ${cacheKey}`);
  } catch (error) {
    console.error(`✗ Failed to cache audio: ${error}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId, voiceSettings } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    const selectedVoiceId = voiceId || AVAILABLE_VOICES[0].id;

    if (text.length < 10 || text.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Text must be between 10 and 10000 characters' },
        { status: 400 }
      );
    }

    const requiredTokens = Math.ceil(text.length * CHARACTERS_PER_TOKEN);
    
    // Apply voice settings if provided, otherwise use defaults
    const finalVoiceSettings = voiceSettings ? {
      stability: voiceSettings.stability ?? 0.5,
      similarity_boost: voiceSettings.similarity_boost ?? 0.75,
      style: voiceSettings.style ?? 0,
      use_speaker_boost: voiceSettings.use_speaker_boost ?? true,
    } : {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
    };

    // Check cache first
    const cacheKey = generateCacheKey(text, selectedVoiceId, finalVoiceSettings);
    const cachedAudio = await getCachedAudio(cacheKey);
    
    if (cachedAudio) {
      console.log(`🎵 Returning cached audio (${cachedAudio.length} bytes)`);
      return new NextResponse(cachedAudio as any, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': 'attachment; filename="speech.mp3"',
          'X-Cache-Status': 'HIT',
        },
      });
    }

    let retryCount = 0;
    const maxRetries = 3;
    let audioBuffer: Buffer | null = null;
    let usedApiKey: any = null;
    const excludedKeyIds: string[] = [];

    while (retryCount < maxRetries && !audioBuffer) {
      try {
        const apiKey = await getAvailableApiKey(requiredTokens, excludedKeyIds);
        usedApiKey = apiKey;

        const client = new ElevenLabsClient({
          apiKey: apiKey.key,
        });

        const audioStream = await client.textToSpeech.convert(selectedVoiceId, {
          text,
          modelId: 'eleven_multilingual_v2',
          voiceSettings: finalVoiceSettings,
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
        
        // Success! Update usage
        await updateApiKeyUsage(apiKey._id.toString(), requiredTokens);
        break;

      } catch (err: any) {
        console.error(`TTS attempt ${retryCount + 1} failed:`, err.message);
        
        // Check if error is quota_exceeded
        if (err.message?.includes('quota_exceeded') || err.statusCode === 401) {
          if (usedApiKey) {
            console.log(`⚠ Quota exceeded for ${usedApiKey.name}, syncing real quota...`);
            
            // Sync real quota from ElevenLabs
            const syncedKey = await syncQuotaFromElevenLabs(usedApiKey);
            
            if (syncedKey) {
              // If still not enough quota after sync, exclude this key
              if (syncedKey.remainingTokens < requiredTokens) {
                console.log(`✗ ${syncedKey.name} confirmed out of quota (${syncedKey.remainingTokens} < ${requiredTokens})`);
                if (!excludedKeyIds.includes(usedApiKey._id.toString())) {
                  excludedKeyIds.push(usedApiKey._id.toString());
                }
              } else {
                // If actually has quota (DB was outdated), REMOVE from excluded list and retry
                console.log(`✓ ${syncedKey.name} still has quota! Retrying with this key...`);
                const keyIndex = excludedKeyIds.indexOf(usedApiKey._id.toString());
                if (keyIndex > -1) {
                  excludedKeyIds.splice(keyIndex, 1);
                  console.log(`✓ Removed ${syncedKey.name} from excluded list`);
                }
                // Don't increment retryCount, next loop will select this key again
                continue;
              }
            } else {
              // Failed to sync, treat as broken key
              if (!excludedKeyIds.includes(usedApiKey._id.toString())) {
                excludedKeyIds.push(usedApiKey._id.toString());
              }
            }
          }
          
          retryCount++;
          
          if (retryCount >= maxRetries) {
            throw new Error('All available API keys have insufficient quota. Please refresh quotas in Admin Panel or add new keys.');
          }
          
          console.log(`🔄 Trying another API key (attempt ${retryCount + 1}/${maxRetries})...`);
        } else {
          // Other errors, don't retry
          throw err;
        }
      }
    }

    if (!audioBuffer) {
      throw new Error('Failed to generate speech after multiple attempts');
    }

    // Save to cache for future use
    await saveCachedAudio(cacheKey, audioBuffer);

    return new NextResponse(audioBuffer as any, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="speech.mp3"',
        'X-Cache-Status': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
