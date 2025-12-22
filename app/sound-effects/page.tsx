'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SoundEffectsPage() {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [promptInfluence, setPromptInfluence] = useState(0.7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedAudio, setGeneratedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Categorized example prompts - Optimized for Video Editing
  const promptCategories = {
    "🔥 Most Popular for Videos": [
      "thunder and lightning storm dramatic",
      "ocean waves crashing powerful",
      "rain falling on roof peaceful",
      "fire crackling warm cozy",
      "wind blowing through trees gentle",
      "dog barking excited happy",
      "cat meowing cute adorable",
      "crowd cheering and applauding loud",
      "footsteps on wooden floor creaky",
      "door opening and closing creaking",
      "phone notification ding modern",
      "alarm clock ringing loud morning",
      "car engine starting revving",
      "keyboard typing fast clicking",
      "glass breaking shattering dramatic",
      "camera shutter click professional",
      "swoosh transition whoosh fast",
      "page turn flip paper",
      "pop bubble notification light",
      "glitch digital error distorted",
      "rewind tape sound vintage",
      "heartbeat pulse rhythmic",
      "cinematic boom impact huge",
      "applause clapping audience",
      "success chime celebration bright"
    ],
    "🌊 Nature & Environment": [
      "ocean waves crashing on shore powerful",
      "thunder and heavy rain storm",
      "gentle river flowing stream babbling",
      "wind howling through trees spooky",
      "forest ambience birds chirping peaceful",
      "waterfall cascading down powerful roar",
      "lightning strike and thunder close",
      "earthquake rumbling ground shaking",
      "volcano eruption lava explosion",
      "avalanche falling down mountain rumble",
      "crickets chirping at night summer",
      "rain on leaves gentle patter",
      "ocean underwater bubbles diving",
      "desert wind blowing sand whistling",
      "cave water dripping echo hollow",
      "campfire crackling burning logs",
      "snow crunching footsteps walking",
      "ice cracking breaking frozen lake",
      "jungle ambience tropical birds insects",
      "mountain echo voice reverb",
      "bamboo forest wind rustling",
      "ocean beach seagulls waves",
      "swamp frogs croaking night",
      "rainforest heavy rain canopy",
      "northern lights aurora wind"
    ],
    "🐾 Animals": [
      "dog barking loudly",
      "cat meowing softly",
      "rooster crowing at dawn",
      "wolf howling at night",
      "lion roaring powerfully",
      "elephant trumpeting",
      "horse galloping fast",
      "birds chirping in morning",
      "snake hissing",
      "bee buzzing around",
      "cow mooing in field",
      "dolphin clicking underwater",
      "monkey screaming jungle",
      "owl hooting at night",
      "frog croaking pond"
    ],
    "🚗 Vehicles": [
      "car engine starting",
      "motorcycle revving up",
      "train passing by",
      "airplane taking off",
      "helicopter flying overhead",
      "boat horn blowing",
      "truck backing up beeping",
      "race car speeding past",
      "bicycle bell ringing",
      "subway train arriving",
      "car tires squealing",
      "jet engine roaring",
      "ship horn deep blast",
      "skateboard rolling concrete",
      "ambulance siren wailing"
    ],
    "🏠 Home & Everyday": [
      "door creaking open slowly horror",
      "footsteps on wooden floor walking",
      "glass breaking shattering window",
      "water dripping from faucet leaking",
      "clock ticking loudly suspense",
      "doorbell ringing ding dong",
      "keys jingling metal keychain",
      "microwave beeping done finished",
      "coffee maker brewing morning",
      "vacuum cleaner running cleaning",
      "shower water running bathroom",
      "toilet flushing flush sound",
      "lightswitch clicking on off",
      "curtains opening sliding morning",
      "drawer opening closing sliding",
      "zipper zipping up closing",
      "paper tearing ripping sheet",
      "book pages turning flipping",
      "bag rustling plastic shopping",
      "toaster popping up bread",
      "scissors cutting paper snip",
      "envelope opening tearing",
      "bottle cap opening twist",
      "can opening pull tab",
      "refrigerator door opening closing",
      "washing machine spinning cycle",
      "dryer tumbling clothes",
      "hairdryer blowing hot air",
      "electric toothbrush buzzing",
      "iron steaming hissing",
      "fan spinning rotating blades",
      "radiator hissing steam heating",
      "floorboards creaking old house",
      "window opening sliding",
      "blinds closing rattling"
    ],
    "💼 Office & Tech": [
      "keyboard typing fast",
      "phone ringing urgently",
      "printer printing papers",
      "papers shuffling",
      "pen clicking repeatedly",
      "stapler punching",
      "chair squeaking",
      "elevator dinging arrival",
      "copy machine copying",
      "mouse clicking",
      "laptop closing shut",
      "USB plugging in",
      "camera shutter click",
      "notification pop up",
      "error beep computer"
    ],
    "🎵 Musical": [
      "drums beating rhythmically",
      "guitar strumming gently",
      "piano playing melody",
      "violin playing beautifully",
      "trumpet fanfare celebration",
      "DJ scratching record",
      "bass drop heavy electronic",
      "cymbal crash loud",
      "church bells ringing",
      "music box playing delicate",
      "saxophone smooth jazz",
      "flute playing soft",
      "accordion playing waltz",
      "harmonica blues style",
      "harp glissando elegant"
    ],
    "⚔️ Action & Combat": [
      "sword clashing metal epic fight",
      "gunshot firing pistol bang loud",
      "explosion booming loud massive blast",
      "punch hitting hard impact knockout",
      "arrow whooshing past flying fast",
      "whip cracking sharp leather snap",
      "laser beam shooting sci-fi pew pew",
      "grenade exploding bomb blast",
      "chainsaw revving cutting horror",
      "fireworks exploding bursting celebration",
      "machinegun rapid fire automatic",
      "cannon firing boom artillery",
      "shield blocking hit clang metal",
      "knife stabbing flesh squelch",
      "bones cracking breaking snap",
      "shotgun pump action reload",
      "rifle bolt action loading",
      "sword unsheathing metal scrape",
      "bow string pulling tension",
      "crossbow firing bolt release",
      "throwing knife spinning whoosh",
      "mace swing heavy whoosh thud",
      "spear thrust impaling",
      "axe chopping wood splitting",
      "hammer smashing crushing impact",
      "nunchucks swinging whooshing",
      "katana slice cutting air",
      "battle cry warrior yelling",
      "armor clanking metal movement",
      "war drum beating rhythm march"
    ],
    "😱 Horror & Scary": [
      "ghost whisper eerie female",
      "creaky door opening slow",
      "footsteps approaching menacing",
      "heartbeat pounding fast anxious",
      "woman screaming terrified",
      "wolf howling distant lonely",
      "chains rattling metal",
      "wind howling scary haunted",
      "crow cawing ominous dark",
      "breathing heavy panicked",
      "child laughing creepy",
      "music box broken distorted",
      "basement door slamming",
      "bones cracking snapping",
      "whispers multiple voices overlapping"
    ],
    "🎮 Gaming & UI Sounds": [
      "level up sound triumphant fanfare",
      "coin collected ding classic retro",
      "power up activated magical sparkle",
      "game over defeat sad melody",
      "boss music intense dramatic epic",
      "jump sound bouncy cartoon boing",
      "item pickup swoosh quick collect",
      "achievement unlocked fanfare success",
      "health refill sound restore magic",
      "menu select click beep interface",
      "error sound negative buzz wrong",
      "explosion game boom blast",
      "checkpoint saved confirm checkpoint",
      "inventory open interface swoosh",
      "pause menu whoosh freeze",
      "button click UI press confirm",
      "hover sound interface highlight",
      "notification alert popup appear",
      "loading spinner progress waiting",
      "success sound checkmark complete",
      "failure sound error denied",
      "upgrade sound enhancement improve",
      "unlock sound achievement badge",
      "quest complete victory fanfare",
      "damage taken hit hurt ouch",
      "shield block defense clang",
      "critical hit extra damage pow",
      "combo multiplier chain streak",
      "countdown timer beeping urgent",
      "teleport zap sound effect magic"
    ],
    "🍔 Food & Kitchen": [
      "sizzling bacon cooking pan",
      "popcorn popping rapidly",
      "ice cubes dropping in glass",
      "wine pouring into glass",
      "apple crunching bite crisp",
      "knife chopping vegetables fast",
      "blender mixing smoothie",
      "champagne bottle popping cork",
      "soda can opening fizz",
      "potato chips crunching loud",
      "water boiling bubbling",
      "egg cracking shell",
      "toast popping up",
      "coffee grinding beans",
      "whisking beating eggs"
    ],
    "🌃 Urban & City": [
      "busy street traffic noise",
      "ambulance siren wailing emergency",
      "construction site drilling jackhammer",
      "crowd cheering loudly stadium",
      "subway passing underground rumble",
      "street musician playing violin",
      "market vendors shouting selling",
      "traffic light beeping crosswalk",
      "garbage truck collecting waste",
      "fountain water flowing park",
      "police siren approaching",
      "bus air brakes hissing",
      "skateboard tricks landing",
      "street food sizzling",
      "nightclub music thumping"
    ],
    "🎬 Cinematic & Transitions": [
      "dramatic orchestral hit epic trailer",
      "suspenseful string tension building horror",
      "whoosh transition fast swoosh pass",
      "riser building up slowly crescendo intense",
      "impact boom powerful cinematic explosion",
      "glitch digital distorted error VHS",
      "rewind tape rewinding backwards vintage",
      "record scratch sudden DJ vinyl",
      "cinematic braaam inception deep rumble",
      "time ticking dramatic clock suspense",
      "drone ambient dark atmospheric moody",
      "heartbeat tension increasing anxiety",
      "camera flash old vintage click",
      "film projector running clicking mechanical",
      "vinyl record crackling warm nostalgic",
      "slow motion time slowdown",
      "fast forward speed up whoosh",
      "page flip turn transition paper",
      "fade in ambient swoosh soft",
      "fade out disappear magic",
      "zoom in camera lens focusing",
      "zoom out pull back wide",
      "pan left transition sweep",
      "pan right camera movement smooth",
      "reveal dramatic curtain opening",
      "reverse cymbal backward music",
      "stutter glitch repeat loop",
      "freeze frame stop sudden",
      "scene change cut transition quick",
      "montage music upbeat inspirational"
    ],
    "⚡ Sci-Fi & Futuristic": [
      "spaceship flying past whoosh",
      "laser gun shooting pew",
      "robot walking mechanical steps",
      "teleportation zap sound",
      "force field buzzing energy",
      "hologram appearing digital",
      "alien creature growling",
      "warp drive engaging",
      "scanner beeping analyzing",
      "power up charging energy",
      "robot transformation morphing",
      "satellite beeping signal",
      "computer processing data",
      "cyborg movement servo motors",
      "energy weapon charging up"
    ],
    "💥 Impact & Hit Sounds": [
      "metal crash loud clang heavy",
      "wood breaking splintering crack",
      "body fall heavy thud ground",
      "head punch knockout hard hit",
      "rock smashing concrete destruction",
      "bottle smashing ground glass shatter",
      "drum hit powerful boom deep",
      "door slam shut loud bang",
      "hammer hitting nail pounding",
      "baseball bat hitting ball crack",
      "boxing glove punch hit knockout",
      "car crash collision crunch metal",
      "thunder clap close lightning boom",
      "giant footstep earthquake rumble",
      "wrecking ball demolition impact",
      "glass window shattering explosion",
      "brick wall collapsing crumbling",
      "tree falling forest timber",
      "ice breaking cracking frozen",
      "bone breaking snap fracture",
      "skull crack head injury",
      "jaw punch face hit hard",
      "body slam wrestling impact",
      "tackle football collision",
      "pile of books falling thud",
      "dishes crashing kitchen accident",
      "furniture breaking destruction",
      "stone hitting water splash",
      "snowball hitting face splat",
      "pillow fight soft thump"
    ],
    "🌧️ Weather & Ambience": [
      "heavy rain storm downpour",
      "light rain gentle patter",
      "thunderstorm with wind",
      "snowstorm blizzard howling",
      "wind chimes gentle breeze",
      "autumn leaves rustling",
      "spring birds singing",
      "summer crickets night",
      "winter wind cold harsh",
      "foghorn distant harbor",
      "hail hitting roof metal",
      "tornado approaching roar",
      "desert sandstorm blowing",
      "tropical rain forest",
      "mountain wind whistling"
    ],
    "🚨 Alarms & Warnings": [
      "fire alarm ringing loud",
      "car alarm blaring",
      "tornado siren warning",
      "burglar alarm triggered",
      "smoke detector beeping",
      "nuclear warning siren",
      "emergency broadcast alert",
      "air raid siren wailing",
      "school bell ringing",
      "phone alarm buzzing",
      "timer beeping countdown",
      "hospital monitor flatline",
      "security alarm breach",
      "evacuation alarm urgent",
      "warning beep repetitive"
    ],
    "😂 Comedy & Cartoon Effects": [
      "slip and fall banana peel slide",
      "boing spring bounce cartoon jump",
      "slide whistle falling down descending",
      "bonk hit head cartoon knock",
      "sproing jumping spring bounce high",
      "crash cymbal comedy timing funny",
      "squeaky toy squeeze rubber duck",
      "balloon inflating expanding air filling",
      "bubble pop light delicate burst",
      "zipper fast comedy quick unzip",
      "kazoo funny horn silly noise",
      "clown horn honk bike horn",
      "water splash slapstick face slap",
      "whoopee cushion fart gas funny",
      "cartoon run fast feet running away",
      "pop cork champagne celebration",
      "twinkle sparkle magic fairy dust",
      "record scratch DJ stop music",
      "rubber chicken squeeze squeak toy",
      "pie in face splat comedy",
      "car horn beep beep silly",
      "spring door stopper boing vibrate",
      "anvil drop heavy thud cartoon",
      "glass break shatter window smash",
      "anvil falling whistling down fast",
      "eyes popping out bulge surprise",
      "jaw drop mouth open shocked",
      "steam whistle blowing train",
      "bicycle bell ring ding ding",
      "party horn blowing celebration noise"
    ],
    "💬 Human Sounds": [
      "man coughing sick",
      "woman laughing happy",
      "baby crying loud",
      "crowd gasping shocked",
      "people whispering secrets",
      "snoring loud sleeping",
      "sneeze achoo",
      "yawn tired sleepy",
      "hiccup repeated",
      "clapping hands applause",
      "footsteps running fast",
      "breathing exhausted panting",
      "throat clearing ahem",
      "knuckles cracking pop",
      "kissing lips smack"
    ],
    "🎪 Fantasy & Magic": [
      "magic spell casting shimmer",
      "fairy wings fluttering sparkle",
      "wand wave magical swoosh",
      "portal opening dimensional",
      "dragon roaring fierce",
      "potion bubbling cauldron",
      "enchantment spell chime",
      "crystal resonating vibration",
      "fairy dust sparkling",
      "magical transformation",
      "unicorn neighing mystical",
      "spell book opening ancient",
      "phoenix rebirth flames",
      "wizard staff striking ground",
      "mystical energy humming"
    ],
    "🏆 Sports & Stadium": [
      "basketball bouncing court dribbling",
      "soccer ball kicked goal net swish",
      "tennis racket hitting ball ace",
      "bowling ball strike pins crash",
      "golf ball hit driver tee shot",
      "referee whistle blow loud sharp",
      "crowd cheering goal scored celebration",
      "stadium roar touchdown victory",
      "boxing bell round start ding",
      "race starting gun bang pistol",
      "baseball bat crack hit home run",
      "hockey puck hitting boards glass",
      "volleyball spike net hard hit",
      "swimming pool splash dive water",
      "gymnasium sneakers squeaking rubber",
      "basketball swish net perfect shot",
      "football punt kick whoosh",
      "cricket bat hitting ball crack",
      "ping pong ball bouncing table",
      "badminton shuttlecock hitting racket",
      "ice skates scraping ice rink",
      "skateboard ollie trick landing",
      "surfboard riding wave water",
      "ski poles planting snow",
      "bike chain clicking pedaling",
      "weightlifting barbell dropping plates",
      "treadmill running belt moving",
      "jump rope whipping air skipping",
      "punching bag heavy hit thud",
      "sports whistle three blows"
    ]
  };

  const [selectedCategory, setSelectedCategory] = useState<string>("🔥 Most Popular for Videos");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");

  const handlePromptSelect = (promptText: string) => {
    setPrompt(promptText);
    setSelectedPrompt(promptText);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a sound description');
      return;
    }

    setLoading(true);
    setError('');
    if (generatedAudio) {
      URL.revokeObjectURL(generatedAudio.url);
      setGeneratedAudio(null);
    }

    try {
      const response = await fetch('/api/sound-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: prompt,
          duration_seconds: duration,
          prompt_influence: promptInfluence,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate sound effect');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setGeneratedAudio({ blob, url });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!generatedAudio) return;

    if (audioElement && !audioElement.paused) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(generatedAudio.url);
      audio.play();
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!generatedAudio) return;
    const a = document.createElement('a');
    a.href = generatedAudio.url;
    a.download = `sound-effect-${Date.now()}.mp3`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="bg-white p-2 rounded-lg shadow-md">
                <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">🎵 Sound Effects</h1>
                <p className="text-purple-100 text-sm">Powered by ElevenLabs AI</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all font-semibold border border-white/30"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Home
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all font-semibold shadow-sm"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              🎵 Sound Effects Generator
            </h1>
            <p className="text-gray-600">Generate realistic sound effects using AI</p>
          </div>

          {/* Prompt Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sound Description
            </label>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setSelectedPrompt(""); // Clear selection when manually typing
              }}
              placeholder="Describe the sound you want to generate (e.g., 'thunder and rain')"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none"
              rows={3}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Tip: Be specific and descriptive for better results. Click prompts below to auto-fill.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Browse by Category
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(promptCategories).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    selectedCategory === category
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={loading}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Example Prompts for Selected Category */}
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
              <div className="flex flex-wrap gap-2">
                {promptCategories[selectedCategory as keyof typeof promptCategories].map((example, idx) => {
                  const isSelected = selectedPrompt === example;
                  return (
                    <button
                      key={idx}
                      onClick={() => handlePromptSelect(example)}
                      className={`px-3 py-2 text-sm rounded-lg transition-all border shadow-sm hover:shadow relative ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-700 font-semibold'
                          : 'bg-white hover:bg-purple-100 text-gray-700 hover:text-purple-700 border-gray-200 hover:border-purple-300'
                      }`}
                      disabled={loading}
                    >
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          ✓
                        </span>
                      )}
                      {example}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Duration Slider */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Duration: {duration} seconds
            </label>
            <input
              type="range"
              min="0.5"
              max="22"
              step="0.5"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              disabled={loading}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.5s</span>
              <span>22s</span>
            </div>
          </div>

          {/* Prompt Influence Slider */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prompt Influence: {promptInfluence.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={promptInfluence}
              onChange={(e) => setPromptInfluence(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              disabled={loading}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>More Random (0)</span>
              <span>More Accurate (1)</span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className={`w-full py-4 rounded-xl font-semibold text-white text-lg transition-all transform ${
              loading || !prompt.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating Sound...
              </span>
            ) : (
              '🎵 Generate Sound Effect'
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <p className="text-red-700 font-medium">❌ {error}</p>
            </div>
          )}

          {/* Audio Player */}
          {generatedAudio && (
            <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                ✅ Sound Effect Generated
              </h3>
              
              <div className="flex gap-3">
                <button
                  onClick={handlePlayPause}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Play
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download MP3
                </button>
              </div>
              
              <audio src={generatedAudio.url} className="w-full mt-4" controls />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 rounded-xl p-6 border-l-4 border-blue-500">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for Better Results</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be specific and descriptive in your prompts</li>
            <li>• Use natural language (e.g., "dog barking loudly" instead of just "dog")</li>
            <li>• Adjust duration based on the type of sound effect</li>
            <li>• Higher prompt influence = more accurate to your description</li>
            <li>• Lower prompt influence = more creative/random variations</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
