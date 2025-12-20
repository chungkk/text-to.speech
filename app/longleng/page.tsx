'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Language, getTranslation } from '@/lib/translations';

interface Voice {
  id: string;
  name: string;
  language: string;
  description: string;
  previewText: string;
}

interface AudioData {
  blob: Blob;
  url: string;
  duration: number;
  size: number;
}

export default function LongTextSplitter() {
  const [currentLang, setCurrentLang] = useState<Language>('de');
  const [inputText, setInputText] = useState('');
  const [splitTexts, setSplitTexts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Voice and audio states
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [audioDataMap, setAudioDataMap] = useState<Map<number, AudioData>>(new Map());
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState('');
  
  // Voice Settings
  const [stability, setStability] = useState(0.3);
  const [similarityBoost, setSimilarityBoost] = useState(0.85);
  const [style, setStyle] = useState(0.5);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') as Language;
    if (savedLang && ['de', 'en', 'vi'].includes(savedLang)) {
      setCurrentLang(savedLang);
    }
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    localStorage.setItem('appLanguage', lang);
  };

  // Load voices
  useEffect(() => {
    fetch('/api/voices')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setVoices(data.data);
          setSelectedVoiceId(data.data[0].id);
        }
      })
      .catch(err => console.error('Failed to load voices:', err));
  }, []);

  // Group voices by language
  const germanVoices = voices.filter(v => 
    v.language?.includes('Deutsch') || v.language?.includes('DE')
  );
  const englishVoices = voices.filter(v => 
    v.language?.includes('English') || v.language?.includes('British')
  );
  const vietnameseVoices = voices.filter(v => 
    v.language?.includes('Vietnamese')
  );

  const splitText = (text: string): string[] => {
    const minLength = 9800;
    const maxLength = 9999;
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      const remainingLength = text.length - startIndex;
      
      if (remainingLength <= maxLength) {
        chunks.push(text.slice(startIndex));
        break;
      }

      let endIndex = startIndex + maxLength;
      const segment = text.slice(startIndex, endIndex);
      
      const lastPeriod = segment.lastIndexOf('.');
      const lastExclamation = segment.lastIndexOf('!');
      const lastQuestion = segment.lastIndexOf('?');
      const lastNewline = segment.lastIndexOf('\n');
      
      const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion, lastNewline);
      
      if (lastSentenceEnd > minLength - startIndex) {
        endIndex = startIndex + lastSentenceEnd + 1;
      } else {
        const lastSpace = segment.lastIndexOf(' ');
        if (lastSpace > minLength - startIndex) {
          endIndex = startIndex + lastSpace;
        }
      }

      chunks.push(text.slice(startIndex, endIndex).trim());
      startIndex = endIndex;
    }

    return chunks;
  };

  const handleSplit = () => {
    setLoading(true);
    setError('');
    try {
      const chunks = splitText(inputText);
      setSplitTexts(chunks);
      setAudioDataMap(new Map()); // Clear previous audio
    } catch (error) {
      console.error('Error splitting text:', error);
      setError('Lỗi khi chia text');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAudio = async (text: string, index: number) => {
    if (!selectedVoiceId) {
      setError('Vui lòng chọn giọng đọc');
      return;
    }

    setGeneratingIndex(index);
    setError('');

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: selectedVoiceId,
          voiceSettings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi khi tạo audio');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      await new Promise((resolve) => {
        audio.onloadedmetadata = resolve;
      });

      const audioData: AudioData = {
        blob,
        url,
        duration: audio.duration,
        size: blob.size,
      };

      setAudioDataMap(prev => new Map(prev).set(index, audioData));
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo audio');
      console.error('Audio generation error:', err);
    } finally {
      setGeneratingIndex(null);
    }
  };

  const handlePlayAudio = (index: number) => {
    const audioData = audioDataMap.get(index);
    if (!audioData) return;

    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }

    if (playingIndex === index) {
      setPlayingIndex(null);
      return;
    }

    const audio = new Audio(audioData.url);
    audio.onended = () => {
      setPlayingIndex(null);
      setCurrentAudio(null);
    };

    setCurrentAudio(audio);
    setPlayingIndex(index);
    audio.play();
  };

  const handleDownloadAudio = (index: number) => {
    const audioData = audioDataMap.get(index);
    if (!audioData) return;

    const a = document.createElement('a');
    a.href = audioData.url;
    a.download = `audio-part-${index + 1}-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAllAudios = () => {
    audioDataMap.forEach((audioData, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = audioData.url;
        a.download = `audio-part-${index + 1}-${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 500); // Delay each download
    });
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    alert(`Đã copy đoạn ${index + 1}!`);
  };

  const handleCopyAll = () => {
    const allText = splitTexts.join('\n\n---\n\n');
    navigator.clipboard.writeText(allText);
    alert('Đã copy tất cả các đoạn!');
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <Header currentLang={currentLang} onLanguageChange={handleLanguageChange} />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Chia Text Dài
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Chia text dài thành các đoạn 9800-9999 ký tự để tạo audio
          </p>

          <div className="space-y-6">
            {/* Voice Selection */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-xl">
              <label className="block text-sm font-medium text-gray-800 mb-3">
                Chọn giọng đọc:
              </label>
              <select
                value={selectedVoiceId}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                className="w-full p-3 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white"
              >
                {germanVoices.length > 0 && (
                  <optgroup label="🇩🇪 Deutsch">
                    {germanVoices.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {englishVoices.length > 0 && (
                  <optgroup label="🇬🇧 English">
                    {englishVoices.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {vietnameseVoices.length > 0 && (
                  <optgroup label="🇻🇳 Tiếng Việt">
                    {vietnameseVoices.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Schnelleinstellungen / Voice Settings */}
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                </svg>
                Schnelleinstellungen
              </h3>

              {/* Quick Presets */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  🎨 Schnell-Presets:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Row 1 */}
                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.5);
                      setSimilarityBoost(0.75);
                      setStyle(0);
                      setUseSpeakerBoost(true);
                    }}
                    className="px-3 py-2 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-semibold">🎯 Standard</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Ausgewogen & neutral</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.3);
                      setSimilarityBoost(0.85);
                      setStyle(0.5);
                      setUseSpeakerBoost(true);
                    }}
                    className="px-3 py-2 text-xs bg-gradient-to-br from-yellow-400 via-red-400 to-red-500 text-white font-bold rounded-lg hover:from-yellow-500 hover:to-red-600 transition-colors shadow-md"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>🇩🇪</span>
                      <span className="text-[11px]">Authentisch</span>
                    </div>
                    <div className="text-[10px] mt-0.5">Natürlich & ausdrucksstark</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.8);
                      setSimilarityBoost(0.5);
                      setStyle(0);
                      setUseSpeakerBoost(false);
                    }}
                    className="px-3 py-2 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-semibold">📖 Hörbuch</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Ruhig & konsistent</div>
                  </button>

                  {/* Row 2 */}
                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.15);
                      setSimilarityBoost(0.9);
                      setStyle(0.65);
                      setUseSpeakerBoost(true);
                    }}
                    className="px-3 py-2 text-xs bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                  >
                    <div>🎭 Mega Expressiv</div>
                    <div className="text-[10px] mt-0.5">Emotionen & Variationen</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.2);
                      setSimilarityBoost(0.95);
                      setStyle(0.8);
                      setUseSpeakerBoost(true);
                    }}
                    className="px-3 py-2 text-xs bg-gradient-to-br from-red-600 to-orange-600 text-white font-bold rounded-lg hover:from-red-700 hover:to-orange-700 transition-colors shadow-md"
                  >
                    <div>🎬 Dramatisch ULTRA</div>
                    <div className="text-[10px] mt-0.5">Max Intensität</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.25);
                      setSimilarityBoost(0.88);
                      setStyle(0.6);
                      setUseSpeakerBoost(true);
                    }}
                    className="px-3 py-2 text-xs bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors shadow-md"
                  >
                    <div>🎙️ Podcast Pro</div>
                    <div className="text-[10px] mt-0.5">Dynamisch & fesselnd</div>
                  </button>

                  {/* Row 3 */}
                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.18);
                      setSimilarityBoost(0.92);
                      setStyle(0.75);
                      setUseSpeakerBoost(true);
                    }}
                    className="px-3 py-2 text-xs bg-gradient-to-br from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors shadow-md"
                  >
                    <div>📢 Werbung</div>
                    <div className="text-[10px] mt-0.5">Kraftvoll & überzeugend</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.12);
                      setSimilarityBoost(0.95);
                      setStyle(0.85);
                      setUseSpeakerBoost(true);
                    }}
                    className="px-3 py-2 text-xs bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-colors shadow-md"
                  >
                    <div>🎪 Storytelling</div>
                    <div className="text-[10px] mt-0.5">Episch & fesselnd</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.22);
                      setSimilarityBoost(0.87);
                      setStyle(0.55);
                      setUseSpeakerBoost(true);
                    }}
                    className="px-3 py-2 text-xs bg-gradient-to-br from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors shadow-md"
                  >
                    <div>🎓 Tutorial</div>
                    <div className="text-[10px] mt-0.5">Verständlich & freundlich</div>
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Stability */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Stability (Stabilität)
                    </label>
                    <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {stability.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={stability}
                    onChange={(e) => setStability(parseFloat(e.target.value))}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Höher = gleichmäßiger, niedriger = expressiver
                  </p>
                </div>

                {/* Similarity Boost */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Similarity Boost (Ähnlichkeit)
                    </label>
                    <span className="text-sm font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                      {similarityBoost.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={similarityBoost}
                    onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Höher = näher an Originalstimme
                  </p>
                </div>

                {/* Style */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Style (Stil)
                    </label>
                    <span className="text-sm font-semibold text-pink-600 bg-pink-50 px-3 py-1 rounded-full">
                      {style.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={style}
                    onChange={(e) => setStyle(parseFloat(e.target.value))}
                    className="w-full h-2 bg-pink-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Höher = ausdrucksstärker und dramatischer
                  </p>
                </div>

                {/* Speaker Boost */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block">
                      Speaker Boost
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      Verbessert Stimmklarheit
                    </p>
                  </div>
                  <button
                    onClick={() => setUseSpeakerBoost(!useSpeakerBoost)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useSpeakerBoost ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useSpeakerBoost ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nhập text dài của bạn:
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full h-64 p-4 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
                placeholder="Paste text dài vào đây..."
              />
              <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
                <span>Tổng số ký tự: {inputText.length.toLocaleString()}</span>
                <button
                  onClick={() => setInputText('')}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  Xóa
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleSplit}
              disabled={loading || inputText.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-8 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] font-semibold text-lg shadow-lg"
            >
              {loading ? 'Đang chia...' : 'Chia Text'}
            </button>

            {splitTexts.length > 0 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-lg font-semibold text-purple-900">
                    Đã chia thành {splitTexts.length} đoạn
                  </div>
                  <div className="flex gap-3">
                    {audioDataMap.size > 0 && (
                      <button
                        onClick={handleDownloadAllAudios}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                        </svg>
                        Download Tất Cả Audio
                      </button>
                    )}
                    <button
                      onClick={handleCopyAll}
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Copy Tất Cả Text
                    </button>
                  </div>
                </div>

                {splitTexts.map((chunk, index) => {
                  const audioData = audioDataMap.get(index);
                  const isGenerating = generatingIndex === index;
                  const isPlaying = playingIndex === index;

                  return (
                    <div key={index} className="border-2 border-purple-200 rounded-xl p-6 space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-3">
                        <h3 className="text-xl font-semibold text-purple-900">
                          Đoạn {index + 1}
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-600">
                            {chunk.length.toLocaleString()} ký tự
                          </span>
                          <button
                            onClick={() => handleCopy(chunk, index)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                          >
                            Copy Text
                          </button>
                          <button
                            onClick={() => handleGenerateAudio(chunk, index)}
                            disabled={isGenerating || audioData !== undefined}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isGenerating ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang tạo...
                              </>
                            ) : audioData ? (
                              '✓ Đã tạo'
                            ) : (
                              'Tạo Audio'
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Audio Player */}
                      {audioData && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handlePlayAudio(index)}
                                className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors"
                              >
                                {isPlaying ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                                  </svg>
                                )}
                              </button>
                              <div className="text-sm">
                                <div className="font-semibold text-gray-800">
                                  {formatTime(audioData.duration)}
                                </div>
                                <div className="text-gray-600">
                                  {formatFileSize(audioData.size)}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownloadAudio(index)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                              </svg>
                              Download
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                          {chunk}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
