// Fetch all German voices from ElevenLabs API
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║         FETCH GERMAN VOICES FROM ELEVENLABS               ║');
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
    
    // Filter for German voices
    const germanVoices = data.voices.filter(voice => {
      const labels = voice.labels || {};
      const lang = labels.language?.toLowerCase() || '';
      const desc = (voice.description || '').toLowerCase();
      const name = voice.name.toLowerCase();
      
      // Check if voice supports German
      return lang.includes('german') || 
             lang.includes('deutsch') || 
             desc.includes('german') ||
             desc.includes('deutsch') ||
             name.includes('german') ||
             name.includes('deutsch') ||
             labels.accent === 'german' ||
             (labels.use_case && desc.includes('german'));
    });

    console.log(`✓ Found ${germanVoices.length} German voices`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('GERMAN VOICES:');
    console.log('═══════════════════════════════════════════════════════════');
    
    germanVoices.forEach((voice, index) => {
      console.log(`\n${index + 1}. ${voice.name}`);
      console.log(`   ID: ${voice.voice_id}`);
      console.log(`   Category: ${voice.category || 'N/A'}`);
      console.log(`   Description: ${voice.description || 'No description'}`);
      console.log(`   Labels:`, JSON.stringify(voice.labels || {}, null, 2));
      console.log(`   Preview URL: ${voice.preview_url || 'N/A'}`);
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('CODE FORMAT FOR TYPESCRIPT:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    germanVoices.forEach((voice, index) => {
      const labels = voice.labels || {};
      const gender = labels.gender ? `${labels.gender.charAt(0).toUpperCase() + labels.gender.slice(1)}` : 'Voice';
      const age = labels.age || '';
      const accent = labels.accent || 'German';
      const useCase = labels.use_case || labels['use case'] || 'general';
      
      let description = voice.description || `${gender} voice`;
      if (age) description += `, ${age}`;
      
      console.log(`  {`);
      console.log(`    id: '${voice.voice_id}',`);
      console.log(`    name: '🇩🇪 ${voice.name}',`);
      console.log(`    language: 'Deutsch (${accent})',`);
      console.log(`    description: '${description}',`);
      console.log(`    previewText: 'Guten Tag, ich bin ${voice.name}. ${description}.'`);
      console.log(`  },`);
    });

  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  console.log('');
  rl.close();
});
