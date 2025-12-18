// Test ElevenLabs API directly
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║         ELEVENLABS API KEY TESTER                         ║');
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
  console.log(`Testing key: ${apiKey.substring(0, 10)}...`);
  console.log(`Key length: ${apiKey.length} characters`);
  console.log('');
  console.log('Calling ElevenLabs API...');
  console.log('');

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey,
      },
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ ERROR Response:');
      console.log(errorText);
      console.log('');
      
      if (response.status === 401) {
        console.log('💡 DIAGNOSIS:');
        console.log('   - API key is invalid or expired');
        console.log('   - Check if key is correct on https://elevenlabs.io/app/settings/api-keys');
        console.log('   - Make sure to copy the FULL key (usually starts with sk_)');
      }
    } else {
      const data = await response.json();
      console.log('✓ SUCCESS! Key is valid!');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('SUBSCRIPTION INFO:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Status:           ${data.status || 'N/A'}`);
      console.log(`Tier:             ${data.tier || 'Free'}`);
      console.log(`Character Limit:  ${(data.character_limit || 0).toLocaleString()} chars/month`);
      console.log(`Character Used:   ${(data.character_count || 0).toLocaleString()} chars`);
      console.log(`Remaining:        ${((data.character_limit || 0) - (data.character_count || 0)).toLocaleString()} chars (${Math.round(((data.character_limit - data.character_count) / data.character_limit) * 100)}%)`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      console.log('✓ You can use this key in your app!');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('');
    console.log('💡 POSSIBLE CAUSES:');
    console.log('   - Network connection issue');
    console.log('   - ElevenLabs API is down');
    console.log('   - Firewall blocking the request');
  }

  console.log('');
  rl.close();
});
