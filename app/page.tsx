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

export default function Home() {
  // Language state with localStorage
  const [currentLang, setCurrentLang] = useState<Language>('de');
  const t = getTranslation(currentLang);

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') as Language;
    if (savedLang && ['de', 'en', 'vi'].includes(savedLang)) {
      setCurrentLang(savedLang);
    }
  }, []);

  // Save language to localStorage when changed
  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    localStorage.setItem('appLanguage', lang);
  };

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [isPlayingGenerated, setIsPlayingGenerated] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  
  // Gender filter state
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  
  // Audio player states
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioSize, setAudioSize] = useState(0);
  
  // Voice Settings for expressive speech
  const [stability, setStability] = useState(0.3);
  const [similarityBoost, setSimilarityBoost] = useState(0.85);
  const [style, setStyle] = useState(0.5);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);

  // Helper function to check if current settings match a preset
  const isPresetActive = (presetStability: number, presetSimilarity: number, presetStyle: number, presetBoost: boolean) => {
    return stability === presetStability && 
           similarityBoost === presetSimilarity && 
           style === presetStyle && 
           useSpeakerBoost === presetBoost;
  };

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

  // Helper function to determine gender from voice name
  const getVoiceGender = (voiceName: string): 'male' | 'female' => {
    const femaleName = ['Matilda', 'Charlotte', 'Lily', 'Sarah', 'Elli', 'Dorothy', 'Rachel', 'Domi', 'Bella', 'Emily', 'Freya', 'Grace', 'Jessica', 'Laura', 'Nicole', 'Serena'];
    const name = voiceName.split(' ')[1] || voiceName; // Get first word after emoji
    return femaleName.some(fn => name.includes(fn)) ? 'female' : 'male';
  };

  // Group voices by language with gender filter
  const germanVoices = voices.filter(v => {
    const isGerman = v.language?.includes('Deutsch') || v.language?.includes('DE');
    if (!isGerman) return false;
    if (genderFilter === 'all') return true;
    return getVoiceGender(v.name) === genderFilter;
  });
  const englishVoices = voices.filter(v => {
    const isEnglish = v.language?.includes('English') || v.language?.includes('British');
    if (!isEnglish) return false;
    if (genderFilter === 'all') return true;
    return getVoiceGender(v.name) === genderFilter;
  });
  const vietnameseVoices = voices.filter(v => {
    const isVietnamese = v.language?.includes('Vietnamese');
    if (!isVietnamese) return false;
    if (genderFilter === 'all') return true;
    return getVoiceGender(v.name) === genderFilter;
  });

  const handlePreviewVoice = async (voiceId: string) => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }

    if (previewingVoiceId === voiceId) {
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voiceId);

    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voiceId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to load preview (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onended = () => {
        setPreviewingVoiceId(null);
        setCurrentAudio(null);
        window.URL.revokeObjectURL(url);
      };

      setCurrentAudio(audio);
      await audio.play();
    } catch (err: any) {
      console.error('Preview error:', err);
      setPreviewingVoiceId(null);
      setError('Failed to play preview');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (text.length < 100) {
      setError('Text must be at least 100 characters');
      return;
    }

    if (text.length > 10000) {
      setError('Text must be less than 10000 characters');
      return;
    }

    setLoading(true);

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
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Get audio metadata
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
      };
      setAudioSize(blob.size);
      
      // Save selected voice name
      const selectedVoice = voices.find(v => v.id === selectedVoiceId);
      if (selectedVoice) {
        setSelectedVoiceName(selectedVoice.name);
      }
      
      setGeneratedAudio({ blob, url });
      
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayGenerated = () => {
    if (!generatedAudio) return;

    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }

    if (isPlayingGenerated) {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
      setIsPlayingGenerated(false);
      return;
    }

    const audio = new Audio(generatedAudio.url);
    
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
    };
    
    audio.ontimeupdate = () => {
      setAudioCurrentTime(audio.currentTime);
    };
    
    audio.onended = () => {
      setIsPlayingGenerated(false);
      setCurrentAudio(null);
      setAudioCurrentTime(0);
    };
    
    setCurrentAudio(audio);
    setIsPlayingGenerated(true);
    audio.play();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentAudio) return;
    const time = parseFloat(e.target.value);
    currentAudio.currentTime = time;
    setAudioCurrentTime(time);
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

  const handleDownload = () => {
    if (!generatedAudio) return;

    const a = document.createElement('a');
    a.href = generatedAudio.url;
    a.download = `speech-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    if (generatedAudio) {
      window.URL.revokeObjectURL(generatedAudio.url);
    }
    setGeneratedAudio(null);
    setIsPlayingGenerated(false);
    setText('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header currentLang={currentLang} onLanguageChange={handleLanguageChange} />
      
      <div className="max-w-[95%] mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-xl p-8">

          <form onSubmit={handleSubmit}>
            {/* 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Column 1: Text Input */}
              <div className="lg:col-span-1">
              <label htmlFor="text" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                {t.textInputLabel}
              </label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base font-normal bg-white shadow-sm"
                placeholder={t.textInputPlaceholder}
                disabled={loading}
                style={{ 
                  lineHeight: '1.9',
                  letterSpacing: '0.01em',
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  color: '#1f2937'
                }}
              />
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${
                    text.length < 100 
                      ? 'text-orange-600' 
                      : text.length > 10000 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {text.length.toLocaleString()}
                  </p>
                  <span className="text-sm text-gray-400">/</span>
                  <p className="text-sm text-gray-500">10,000</p>
                </div>
                {text.length < 100 && text.length > 0 && (
                  <p className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">
                    {t.charactersRemaining.replace('{count}', (100 - text.length).toString())}
                  </p>
                )}
                {text.length === 0 && (
                  <p className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                    {t.minCharacters}
                  </p>
                )}
                {text.length >= 100 && text.length <= 10000 && (
                  <p className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {t.ready}
                  </p>
                )}
                {text.length > 10000 && (
                  <p className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                    {t.tooManyCharacters.replace('{count}', (text.length - 10000).toString())}
                  </p>
                )}
              </div>
              </div>

              {/* Column 2: Voice Selection - Stimme auswählen */}
              <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  {t.voiceSelectionLabel}
                </label>
                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {voices.length}
                </span>
              </div>
              
              {/* Gender Filter Buttons */}
              <div className="flex gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => setGenderFilter('all')}
                  className={`flex-1 px-2 py-1 text-[10px] font-semibold rounded transition-all ${
                    genderFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.filterAll}
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('male')}
                  className={`flex-1 px-2 py-1 text-[10px] font-semibold rounded transition-all ${
                    genderFilter === 'male'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.filterMale}
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('female')}
                  className={`flex-1 px-2 py-1 text-[10px] font-semibold rounded transition-all ${
                    genderFilter === 'female'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.filterFemale}
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-1.5 bg-gray-50">
                <div className="space-y-2">
                  {/* German Voices */}
                  {germanVoices.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-700 mb-1 px-0.5 flex items-center gap-1">
                        {t.germanVoices}
                        <span className="text-gray-500 font-normal">({germanVoices.length})</span>
                      </h4>
                      <div className="grid gap-1">
                        {germanVoices.map((voice) => (
                          <div
                            key={voice.id}
                            className={`border rounded p-1.5 cursor-pointer transition-all bg-white ${
                              selectedVoiceId === voice.id
                                ? 'border-blue-500 ring-1 ring-blue-200'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                            onClick={() => setSelectedVoiceId(voice.id)}
                          >
                            <div className="flex items-center gap-1.5">
                              <input
                                type="radio"
                                name="voice"
                                value={voice.id}
                                checked={selectedVoiceId === voice.id}
                                onChange={() => setSelectedVoiceId(voice.id)}
                                className="w-3 h-3 text-blue-600 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-[10px] truncate">{voice.name}</h3>
                                <p className="text-[9px] text-gray-500 truncate leading-tight">{voice.description}</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewVoice(voice.id);
                                }}
                                disabled={loading}
                                className="px-1.5 py-0.5 bg-green-600 text-white text-[9px] rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center gap-0.5 flex-shrink-0"
                              >
                                {previewingVoiceId === voice.id ? (
                                  <>
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {t.stopButton}
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    {t.previewButton}
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                </div>
              </div>
              </div>

              {/* Column 3: Voice Settings - Schnelleinstellungen */}
              <div className="lg:col-span-1">
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 h-full">
              <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                </svg>
                {t.voiceSettingsTitle}
              </h3>
              
              {/* Preset Buttons - Moved to Top */}
              <div className="mb-4 pb-4 border-b border-blue-200">
                <p className="text-xs font-medium text-gray-700 mb-2">{t.presetsTitle}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {/* Row 1: Standard & Common */}
                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.5);
                      setSimilarityBoost(0.75);
                      setStyle(0);
                      setUseSpeakerBoost(true);
                    }}
                    className={`px-3 py-2 text-xs bg-white border text-gray-700 rounded-lg hover:bg-gray-50 transition-colors relative ${
                      isPresetActive(0.5, 0.75, 0, true) ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'
                    }`}
                  >
                    {isPresetActive(0.5, 0.75, 0, true) && (
                      <div className="absolute top-1 right-1">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className="font-semibold">{t.presetStandard}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{t.presetStandardDesc}</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.3);
                      setSimilarityBoost(0.85);
                      setStyle(0.5);
                      setUseSpeakerBoost(true);
                    }}
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-yellow-400 via-red-400 to-red-500 text-white font-bold rounded-lg hover:from-yellow-500 hover:to-red-600 transition-colors shadow-md relative ${
                      isPresetActive(0.3, 0.85, 0.5, true) ? 'ring-4 ring-green-400' : ''
                    }`}
                  >
                    {isPresetActive(0.3, 0.85, 0.5, true) && (
                      <div className="absolute top-1 right-1">
                        <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-1">
                      <span>🇩🇪</span>
                      <span>{t.presetGerman.replace('🇩🇪 ', '')}</span>
                    </div>
                    <div className="text-[10px] mt-0.5">{t.presetGermanDesc}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.8);
                      setSimilarityBoost(0.5);
                      setStyle(0);
                      setUseSpeakerBoost(false);
                    }}
                    className={`px-3 py-2 text-xs bg-white border text-gray-700 rounded-lg hover:bg-gray-50 transition-colors relative ${
                      isPresetActive(0.8, 0.5, 0, false) ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300'
                    }`}
                  >
                    {isPresetActive(0.8, 0.5, 0, false) && (
                      <div className="absolute top-1 right-1">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className="font-semibold">{t.presetAudiobook}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{t.presetAudiobookDesc}</div>
                  </button>

                  {/* Row 2: Expressive */}
                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.15);
                      setSimilarityBoost(0.9);
                      setStyle(0.65);
                      setUseSpeakerBoost(true);
                    }}
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md relative ${
                      isPresetActive(0.15, 0.9, 0.65, true) ? 'ring-4 ring-green-400' : ''
                    }`}
                  >
                    {isPresetActive(0.15, 0.9, 0.65, true) && (
                      <div className="absolute top-1 right-1">
                        <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div>{t.presetExpressive}</div>
                    <div className="text-[10px] mt-0.5">{t.presetExpressiveDesc}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.2);
                      setSimilarityBoost(0.95);
                      setStyle(0.8);
                      setUseSpeakerBoost(true);
                    }}
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-red-600 to-orange-600 text-white font-bold rounded-lg hover:from-red-700 hover:to-orange-700 transition-colors shadow-md relative ${
                      isPresetActive(0.2, 0.95, 0.8, true) ? 'ring-4 ring-green-400' : ''
                    }`}
                  >
                    {isPresetActive(0.2, 0.95, 0.8, true) && (
                      <div className="absolute top-1 right-1">
                        <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div>{t.presetDramatic}</div>
                    <div className="text-[10px] mt-0.5">{t.presetDramaticDesc}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.25);
                      setSimilarityBoost(0.88);
                      setStyle(0.6);
                      setUseSpeakerBoost(true);
                    }}
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors shadow-md relative ${
                      isPresetActive(0.25, 0.88, 0.6, true) ? 'ring-4 ring-green-400' : ''
                    }`}
                  >
                    {isPresetActive(0.25, 0.88, 0.6, true) && (
                      <div className="absolute top-1 right-1">
                        <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div>{t.presetPodcast}</div>
                    <div className="text-[10px] mt-0.5">{t.presetPodcastDesc}</div>
                  </button>

                  {/* Row 3: Specialized */}
                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.18);
                      setSimilarityBoost(0.92);
                      setStyle(0.75);
                      setUseSpeakerBoost(true);
                    }}
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors shadow-md relative ${
                      isPresetActive(0.18, 0.92, 0.75, true) ? 'ring-4 ring-green-400' : ''
                    }`}
                  >
                    {isPresetActive(0.18, 0.92, 0.75, true) && (
                      <div className="absolute top-1 right-1">
                        <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div>{t.presetAdvertising}</div>
                    <div className="text-[10px] mt-0.5">{t.presetAdvertisingDesc}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.12);
                      setSimilarityBoost(0.95);
                      setStyle(0.85);
                      setUseSpeakerBoost(true);
                    }}
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-colors shadow-md relative ${
                      isPresetActive(0.12, 0.95, 0.85, true) ? 'ring-4 ring-green-400' : ''
                    }`}
                  >
                    {isPresetActive(0.12, 0.95, 0.85, true) && (
                      <div className="absolute top-1 right-1">
                        <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div>{t.presetStorytelling}</div>
                    <div className="text-[10px] mt-0.5">{t.presetStorytellingDesc}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStability(0.22);
                      setSimilarityBoost(0.87);
                      setStyle(0.55);
                      setUseSpeakerBoost(true);
                    }}
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors shadow-md relative ${
                      isPresetActive(0.22, 0.87, 0.55, true) ? 'ring-4 ring-green-400' : ''
                    }`}
                  >
                    {isPresetActive(0.22, 0.87, 0.55, true) && (
                      <div className="absolute top-1 right-1">
                        <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div>{t.presetTutorial}</div>
                    <div className="text-[10px] mt-0.5">{t.presetTutorialDesc}</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stability */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t.stability}: {stability.toFixed(2)}
                    <span className="text-gray-500 ml-1">{t.stabilityDesc}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={stability}
                    onChange={(e) => setStability(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{t.moreEmotion}</span>
                    <span>{t.moreStable}</span>
                  </div>
                </div>

                {/* Similarity Boost */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t.similarityBoost}: {similarityBoost.toFixed(2)}
                    <span className="text-gray-500 ml-1">{t.similarityBoostDesc}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={similarityBoost}
                    onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{t.lower}</span>
                    <span>{t.higher}</span>
                  </div>
                </div>

                {/* Style Exaggeration */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t.style}: {style.toFixed(2)}
                    <span className="text-gray-500 ml-1">{t.styleDesc}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={style}
                    onChange={(e) => setStyle(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{t.normal}</span>
                    <span>{t.dramatic}</span>
                  </div>
                </div>

                {/* Speaker Boost */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSpeakerBoost}
                      onChange={(e) => setUseSpeakerBoost(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-xs font-medium text-gray-700">
                      {t.speakerBoost}
                      <span className="block text-gray-500 font-normal">{t.speakerBoostDesc}</span>
                    </span>
                  </label>
                </div>
              </div>


            </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* MP3 Generation Button / Audio Result - Same Position */}
            <div className="sticky bottom-0 left-0 right-0 bg-white pt-4 pb-2 -mx-8 px-8 border-t-2 border-blue-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
              {!generatedAudio ? (
                <>
                  <button
                    type="submit"
                    disabled={loading || text.length < 100 || text.length > 10000}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-3">
                        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span className="text-base">{t.generating}</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        {t.generateButton}
                      </span>
                    )}
                  </button>
                  {text.length < 100 && text.length > 0 && (
                    <p className="text-center text-xs text-red-600 mt-2">
                      {t.charactersRemaining.replace('{count}', (100 - text.length).toString())}
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {/* Audio Player Card */}
                  <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-green-800 font-bold text-lg flex items-center gap-2">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {t.audioCreated}
                        </p>
                        {selectedVoiceName && (
                          <p className="text-green-700 text-sm flex items-center gap-1 ml-8">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold">{selectedVoiceName}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-green-700">
                        <div className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          <span className="font-semibold">{formatTime(audioDuration)}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                          </svg>
                          <span className="font-semibold">{formatFileSize(audioSize)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Audio Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2 text-sm text-green-700">
                        <span className="font-mono font-bold">{formatTime(audioCurrentTime)}</span>
                        <span className="font-mono">{formatTime(audioDuration)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={audioDuration || 100}
                        value={audioCurrentTime}
                        onChange={handleSeek}
                        className="w-full h-3 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600 hover:accent-green-700"
                        style={{
                          background: `linear-gradient(to right, #059669 0%, #059669 ${(audioCurrentTime / (audioDuration || 1)) * 100}%, #bbf7d0 ${(audioCurrentTime / (audioDuration || 1)) * 100}%, #bbf7d0 100%)`
                        }}
                      />
                    </div>

                    {/* Control Buttons */}
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={handlePlayGenerated}
                        className="py-3 px-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        {isPlayingGenerated ? (
                          <>
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{t.pauseButton}</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            <span>{t.playButton}</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="py-3 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span>{t.downloadButton}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleReset}
                        className="py-3 px-4 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        <span>{t.newButton}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
