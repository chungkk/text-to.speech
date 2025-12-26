// Fetch all Vietnamese voices from ElevenLabs API
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║       FETCH VIETNAMESE VOICES FROM ELEVENLABS             ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

rl.question('Paste your ElevenLabs API key: ', async (apiKey) => {
  apiKey = apiKey.trim();
  
  if (!apiKey) {
    console.log('❌ No API key provided');
    rl.close();
    return;
  }

  console.log('');
  console.log('Fetching all voices from ElevenLabs...');
  console.log('');

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ ERROR Response:');
      console.log(errorText);
      rl.close();
      return;
    }

    const data = await response.json();
    console.log(`✓ Found ${data.voices.length} total voices`);
    console.log('');
    
    // Filter for Vietnamese voices
    const vietnameseVoices = data.voices.filter(voice => {
      const labels = voice.labels || {};
      const lang = labels.language?.toLowerCase() || '';
      const desc = (voice.description || '').toLowerCase();
      const name = voice.name.toLowerCase();
      
      // Check if voice supports Vietnamese
      return lang.includes('vietnam') || 
             lang.includes('vietnamese') ||
             lang.includes('viet') ||
             desc.includes('vietnam') ||
             desc.includes('vietnamese') ||
             desc.includes('tiếng việt') ||
             name.includes('vietnam') ||
             name.includes('vietnamese') ||
             labels.accent === 'vietnamese';
    });

    console.log(`✓ Found ${vietnameseVoices.length} Vietnamese voices`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VIETNAMESE VOICES:');
    console.log('═══════════════════════════════════════════════════════════');
    
    vietnameseVoices.forEach((voice, index) => {
      console.log(`\n${index + 1}. ${voice.name}`);
      console.log(`   ID: ${voice.voice_id}`);
      console.log(`   Category: ${voice.category || 'N/A'}`);
      console.log(`   Description: ${voice.description || 'No description'}`);
      console.log(`   Labels:`, JSON.stringify(voice.labels || {}, null, 2));
      console.log(`   Preview URL: ${voice.preview_url || 'N/A'}`);
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('CODE FORMAT FOR TYPESCRIPT (copy vào route.ts):');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    vietnameseVoices.forEach((voice, index) => {
      const labels = voice.labels || {};
      const gender = labels.gender === 'male' ? 'Nam' : labels.gender === 'female' ? 'Nữ' : 'Voice';
      const age = labels.age || '';
      const useCase = labels.use_case || labels['use case'] || 'general';
      
      let description = voice.description || `Giọng ${gender}`;
      
      console.log(`  {`);
      console.log(`    id: '${voice.voice_id}',`);
      console.log(`    name: '🇻🇳 ${voice.name}',`);
      console.log(`    language: 'Vietnamese',`);
      console.log(`    description: '${description.replace(/'/g, "\\'")}',`);
      console.log(`    previewText: 'Xin chào, tôi là ${voice.name}. ${description.replace(/'/g, "\\'")}'`);
      console.log(`  },`);
    });

    // Also search in shared voices for Vietnamese
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Searching shared/community voices...');
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
      const sharedResponse = await fetch('https://api.elevenlabs.io/v1/shared-voices?page_size=100&search=vietnamese', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': apiKey,
        },
      });

      if (sharedResponse.ok) {
        const sharedData = await sharedResponse.json();
        console.log(`✓ Found ${sharedData.voices?.length || 0} shared Vietnamese voices`);
        
        if (sharedData.voices && sharedData.voices.length > 0) {
          sharedData.voices.slice(0, 20).forEach((voice, index) => {
            console.log(`\n${index + 1}. ${voice.name}`);
            console.log(`   ID: ${voice.voice_id}`);
            console.log(`   Category: ${voice.category || 'shared'}`);
            console.log(`   Description: ${voice.description || 'No description'}`);
          });
        }
      }
    } catch (err) {
      console.log('Could not fetch shared voices:', err.message);
    }

  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  console.log('');
  rl.close();
});
