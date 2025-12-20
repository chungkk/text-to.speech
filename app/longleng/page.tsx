'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Language } from '@/lib/translations';

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

interface TextChunk {
  chunk: string;
  suggestedApiKey: string;
  maxTokens: number;
}

interface QuotaInfo {
  maxTokensPerRequest: number;
  totalAvailableTokens: number;
  activeKeysCount: number;
  keys: Array<{
    name: string;
    remainingTokens: number;
    totalTokens: number;
    percentageRemaining: string;
  }>;
}

export default function LongTextSplitter() {
  const [currentLang, setCurrentLang] = useState<Language>('de');
  const [inputText, setInputText] = useState('');
  const [splitTexts, setSplitTexts] = useState<TextChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  
  // Voice and audio states
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [generatingIndexes, setGeneratingIndexes] = useState<Set<number>>(new Set());
  const [audioDataMap, setAudioDataMap] = useState<Map<number, AudioData>>(new Map());
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState('');
  const [generatingAll, setGeneratingAll] = useState(false);
  
  // Voice Settings
  const [stability, setStability] = useState(0.3);
  const [similarityBoost, setSimilarityBoost] = useState(0.85);
  const [style, setStyle] = useState(0.5);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);

  // Merge audio states
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);

  // Helper function to check if current settings match a preset
  const isPresetActive = (presetStability: number, presetSimilarity: number, presetStyle: number, presetBoost: boolean) => {
    return stability === presetStability && 
           similarityBoost === presetSimilarity && 
           style === presetStyle && 
           useSpeakerBoost === presetBoost;
  };

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

  // Fetch quota info
  const fetchQuotaInfo = async () => {
    setLoadingQuota(true);
    try {
      const response = await fetch('/api/quota');
      const data = await response.json();
      if (data.success) {
        setQuotaInfo(data.data);
      } else {
        setError(data.error || 'Không thể lấy thông tin quota');
      }
    } catch (err) {
      console.error('Failed to fetch quota:', err);
      setError('Lỗi khi lấy thông tin quota');
    } finally {
      setLoadingQuota(false);
    }
  };

  // Load quota info on mount
  useEffect(() => {
    fetchQuotaInfo();
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

  const splitTextByApiQuotas = (text: string, apiKeys: QuotaInfo['keys']): { chunk: string; suggestedApiKey: string; maxTokens: number }[] => {
    const chunks: { chunk: string; suggestedApiKey: string; maxTokens: number }[] = [];
    let startIndex = 0;
    
    // Sort keys: smaller quotas first to avoid wasting large quotas on small texts
    const sortedKeys = [...apiKeys].sort((a, b) => a.remainingTokens - b.remainingTokens);
    const usedKeyIds = new Set<string>();

    console.log(`📏 Splitting text by API quotas (best-fit strategy):`, sortedKeys.map(k => `${k.name}: ${k.remainingTokens}`));
    console.log(`📄 Total text length: ${text.length} chars`);

    while (startIndex < text.length) {
      const remainingText = text.length - startIndex;
      
      // Find best-fit API key: smallest key that can fit the remaining text (or largest available chunk)
      let bestKey = null;
      let bestKeyIndex = -1;
      
      for (let i = 0; i < sortedKeys.length; i++) {
        const key = sortedKeys[i];
        if (usedKeyIds.has(key.name)) continue; // Skip already used keys
        
        const safeMaxLength = Math.min(key.remainingTokens - 50, 9950);
        if (safeMaxLength < 100) continue; // Skip keys with insufficient quota
        
        // Best fit: smallest key that can handle remaining text
        if (safeMaxLength >= remainingText) {
          bestKey = key;
          bestKeyIndex = i;
          break; // Found perfect fit
        }
        
        // If no perfect fit yet, keep track of largest available
        if (!bestKey || key.remainingTokens > bestKey.remainingTokens) {
          bestKey = key;
          bestKeyIndex = i;
        }
      }
      
      if (!bestKey) {
        const remaining = text.length - startIndex;
        console.error(`❌ Ran out of API keys! Remaining text: ${remaining} chars`);
        setError(`Không đủ API keys để chia hết text. Còn thiếu ${remaining} ký tự. Vui lòng thêm API keys hoặc chia text nhỏ hơn.`);
        break;
      }
      
      const currentApiKey = bestKey;
      
      console.log(`\n🎯 Best-fit key: ${currentApiKey.name} (${currentApiKey.remainingTokens} tokens) for ${remainingText} chars`);
      
      // Safety buffer: use 50 chars less than quota, max 9950 (closer to API limit)
      const safeMaxLength = Math.min(currentApiKey.remainingTokens - 50, 9950);
      const minLength = Math.min(Math.floor(safeMaxLength * 0.8), safeMaxLength - 100);

      // If remaining text fits in this API's quota
      if (remainingText <= safeMaxLength) {
        const finalChunk = text.slice(startIndex).trim();
        chunks.push({
          chunk: finalChunk,
          suggestedApiKey: currentApiKey.name,
          maxTokens: currentApiKey.remainingTokens
        });
        console.log(`✅ Final chunk: ${finalChunk.length} chars → ${currentApiKey.name} (perfect fit!)`);
        usedKeyIds.add(currentApiKey.name);
        break;
      }

      // Find natural break point
      let endIndex = startIndex + safeMaxLength;
      const segment = text.slice(startIndex, endIndex);
      
      const lastPeriod = segment.lastIndexOf('.');
      const lastExclamation = segment.lastIndexOf('!');
      const lastQuestion = segment.lastIndexOf('?');
      const lastNewline = segment.lastIndexOf('\n');
      
      const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion, lastNewline);
      
      if (lastSentenceEnd > minLength) {
        endIndex = startIndex + lastSentenceEnd + 1;
      } else {
        const lastSpace = segment.lastIndexOf(' ');
        if (lastSpace > minLength) {
          endIndex = startIndex + lastSpace + 1; // +1 to skip the space
        }
      }

      const chunkText = text.slice(startIndex, endIndex).trim();
      chunks.push({
        chunk: chunkText,
        suggestedApiKey: currentApiKey.name,
        maxTokens: currentApiKey.remainingTokens
      });
      
      console.log(`📦 Chunk ${chunks.length}: ${chunkText.length} chars → ${currentApiKey.name}`);
      
      // Mark this key as used
      usedKeyIds.add(currentApiKey.name);

      // Skip whitespace at the beginning of next chunk
      while (endIndex < text.length && /\s/.test(text[endIndex])) {
        endIndex++;
      }

      startIndex = endIndex;
    }

    const totalCharsInChunks = chunks.reduce((sum, c) => sum + c.chunk.length, 0);
    console.log(`\n✅ Split complete:`);
    console.log(`   - ${chunks.length} chunks using ${usedKeyIds.size} API keys`);
    console.log(`   - Original text: ${text.length} chars`);
    console.log(`   - Total in chunks: ${totalCharsInChunks} chars`);
    console.log(`   - Difference: ${text.length - totalCharsInChunks} chars (whitespace trimmed)`);
    chunks.forEach((c, i) => console.log(`   ${i+1}. ${c.chunk.length} chars → ${c.suggestedApiKey}`));

    return chunks;
  };

  const handleSplit = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Force refresh quota to get real-time data from ElevenLabs
      console.log('🔄 Refreshing quota info before split...');
      await fetchQuotaInfo();
      
      if (!quotaInfo || quotaInfo.keys.length === 0) {
        setError('Không có API keys khả dụng. Vui lòng thêm API keys trong Admin Panel.');
        return;
      }
      
      console.log('📊 Available quotas:', quotaInfo.keys.map(k => `${k.name}: ${k.remainingTokens} tokens`));
      console.log(`📄 Input text: ${inputText.length} characters`);
      
      // Split text using all available API keys
      const chunks = splitTextByApiQuotas(inputText, quotaInfo.keys);
      
      if (chunks.length === 0) {
        setError('Không thể chia text. Vui lòng kiểm tra quota API keys.');
        return;
      }
      
      setSplitTexts(chunks);
      setAudioDataMap(new Map()); // Clear previous audio
      
      // Show summary
      const totalChars = chunks.reduce((sum, c) => sum + c.chunk.length, 0);
      console.log(`📊 Summary: ${chunks.length} chunks, ${totalChars} total chars (original: ${inputText.length})`);
      
      if (totalChars !== inputText.length) {
        console.warn(`⚠️ Character count mismatch! Original: ${inputText.length}, Split: ${totalChars}`);
      }
    } catch (error) {
      console.error('Error splitting text:', error);
      setError('Lỗi khi chia text');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAudio = async (textChunk: TextChunk, index: number) => {
    if (!selectedVoiceId) {
      setError('Vui lòng chọn giọng đọc');
      return;
    }

    setGeneratingIndexes(prev => new Set(prev).add(index));
    setError('');

    try {
      console.log(`🎵 Generating audio for chunk ${index + 1} using suggested API: ${textChunk.suggestedApiKey}`);
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textChunk.chunk,
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi tạo audio';
      setError(`Đoạn ${index + 1}: ${errorMessage}`);
      console.error('Audio generation error:', err);
    } finally {
      setGeneratingIndexes(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const handleGenerateAllAudios = async () => {
    if (!selectedVoiceId) {
      setError('Vui lòng chọn giọng đọc');
      return;
    }

    setGeneratingAll(true);
    setError('');

    // Generate all audios that don't exist yet
    const promises = splitTexts.map(async (textChunk, index) => {
      if (!audioDataMap.has(index)) {
        await handleGenerateAudio(textChunk, index);
      }
    });

    try {
      await Promise.all(promises);
    } catch (err) {
      console.error('Error generating all audios:', err);
    } finally {
      setGeneratingAll(false);
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

  const handleCopy = (textChunk: TextChunk, index: number) => {
    navigator.clipboard.writeText(textChunk.chunk);
    alert(`Đã copy đoạn ${index + 1}!`);
  };

  const handleCopyAll = () => {
    const allText = splitTexts.map(tc => tc.chunk).join('\n\n---\n\n');
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

  const handleMergeAllAudios = async () => {
    if (audioDataMap.size === 0) {
      setError('Không có audio nào để ghép');
      return;
    }

    if (audioDataMap.size !== splitTexts.length) {
      setError('Vui lòng tạo audio cho tất cả các đoạn trước khi ghép');
      return;
    }

    setIsMerging(true);
    setMergeProgress(0);
    setError('');

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const audioBuffers: AudioBuffer[] = [];

      // Load all audio files
      for (let i = 0; i < splitTexts.length; i++) {
        const audioData = audioDataMap.get(i);
        if (!audioData) {
          throw new Error(`Audio cho đoạn ${i + 1} không tồn tại`);
        }

        setMergeProgress(((i + 1) / splitTexts.length) * 50); // 0-50% for loading

        const arrayBuffer = await audioData.blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.push(audioBuffer);
      }

      // Calculate total length
      const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
      const numberOfChannels = audioBuffers[0].numberOfChannels;
      const sampleRate = audioBuffers[0].sampleRate;

      // Create merged buffer
      const mergedBuffer = audioContext.createBuffer(
        numberOfChannels,
        totalLength,
        sampleRate
      );

      // Copy all buffers into merged buffer
      let offset = 0;
      for (let i = 0; i < audioBuffers.length; i++) {
        const buffer = audioBuffers[i];
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          mergedBuffer.copyToChannel(channelData, channel, offset);
        }
        offset += buffer.length;
        setMergeProgress(50 + ((i + 1) / audioBuffers.length) * 50); // 50-100% for merging
      }

      // Convert to WAV
      const wavBlob = await audioBufferToWav(mergedBuffer);
      
      // Download
      const url = window.URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merged-audio-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert(`✅ Đã ghép thành công ${splitTexts.length} audio!`);
    } catch (err) {
      console.error('Merge error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Lỗi khi ghép audio: ${errorMessage}`);
    } finally {
      setIsMerging(false);
      setMergeProgress(0);
    }
  };

  // Convert AudioBuffer to WAV blob
  const audioBufferToWav = (buffer: AudioBuffer): Promise<Blob> => {
    return new Promise((resolve) => {
      const numberOfChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const format = 1; // PCM
      const bitDepth = 16;

      const bytesPerSample = bitDepth / 8;
      const blockAlign = numberOfChannels * bytesPerSample;

      const data = [];
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = buffer.getChannelData(channel)[i];
          const intSample = Math.max(-1, Math.min(1, sample));
          data.push(intSample < 0 ? intSample * 0x8000 : intSample * 0x7FFF);
        }
      }

      const dataLength = data.length * bytesPerSample;
      const bufferLength = 44 + dataLength;
      const arrayBuffer = new ArrayBuffer(bufferLength);
      const view = new DataView(arrayBuffer);

      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      // WAV header
      writeString(0, 'RIFF');
      view.setUint32(4, bufferLength - 8, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true); // fmt chunk size
      view.setUint16(20, format, true);
      view.setUint16(22, numberOfChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * blockAlign, true); // byte rate
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitDepth, true);
      writeString(36, 'data');
      view.setUint32(40, dataLength, true);

      // Write audio data
      let offset = 44;
      for (let i = 0; i < data.length; i++) {
        view.setInt16(offset, data[i], true);
        offset += 2;
      }

      resolve(new Blob([arrayBuffer], { type: 'audio/wav' }));
    });
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
            {/* Quota Info Display */}
            {loadingQuota && !quotaInfo ? (
              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-6 rounded-xl border-2 border-blue-300">
                <div className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div>
                    <div className="font-semibold text-blue-800">Đang kiểm tra quota của TẤT CẢ API keys...</div>
                    <div className="text-sm text-blue-600">Đang sync với ElevenLabs API</div>
                  </div>
                </div>
              </div>
            ) : quotaInfo ? (
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-6 rounded-xl border-2 border-green-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                    </svg>
                    Quota API (Đã kiểm tra TẤT CẢ keys)
                  </h3>
                  <button
                    onClick={fetchQuotaInfo}
                    disabled={loadingQuota}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {loadingQuota ? (
                      <>
                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang sync...
                      </>
                    ) : (
                      <>
                        🔄 Sync lại tất cả
                      </>
                    )}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Max tokens/lần</div>
                    <div className="text-2xl font-bold text-green-600">
                      {quotaInfo.maxTokensPerRequest.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Tổng còn lại</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {quotaInfo.totalAvailableTokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">API keys hoạt động</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {quotaInfo.activeKeysCount}
                    </div>
                  </div>
                </div>

                {quotaInfo.maxTokensPerRequest < 5000 && (
                  <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 text-sm text-yellow-800">
                    ⚠️ <strong>Cảnh báo:</strong> Quota khả dụng thấp ({quotaInfo.maxTokensPerRequest.toLocaleString()} tokens). 
                    Text sẽ được chia thành các đoạn nhỏ hơn để phù hợp.
                  </div>
                )}

                {/* Show individual key quotas */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd"/>
                    </svg>
                    Chi tiết {quotaInfo.keys.length} API keys
                  </summary>
                  <div className="mt-3 space-y-2">
                    {quotaInfo.keys.map((key, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-gray-800">{key.name}</span>
                          <span className="text-sm text-green-600 font-semibold">{key.percentageRemaining}%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>{key.remainingTokens.toLocaleString()} / {key.totalTokens.toLocaleString()} tokens</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              parseFloat(key.percentageRemaining) > 50 ? 'bg-green-500' :
                              parseFloat(key.percentageRemaining) > 20 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${key.percentageRemaining}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ) : null}

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
                    className={`px-3 py-2 text-xs bg-white border rounded-lg hover:bg-gray-50 transition-colors relative ${
                      isPresetActive(0.5, 0.75, 0, true) ? 'border-blue-500 border-2 ring-2 ring-blue-200' : 'border-gray-300'
                    }`}
                  >
                    {isPresetActive(0.5, 0.75, 0, true) && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
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
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-yellow-400 via-red-400 to-red-500 text-white font-bold rounded-lg hover:from-yellow-500 hover:to-red-600 transition-colors shadow-md relative ${
                      isPresetActive(0.3, 0.85, 0.5, true) ? 'ring-4 ring-yellow-300' : ''
                    }`}
                  >
                    {isPresetActive(0.3, 0.85, 0.5, true) && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
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
                    className={`px-3 py-2 text-xs bg-white border rounded-lg hover:bg-gray-50 transition-colors relative ${
                      isPresetActive(0.8, 0.5, 0, false) ? 'border-blue-500 border-2 ring-2 ring-blue-200' : 'border-gray-300'
                    }`}
                  >
                    {isPresetActive(0.8, 0.5, 0, false) && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
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
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md relative ${
                      isPresetActive(0.15, 0.9, 0.65, true) ? 'ring-4 ring-purple-300' : ''
                    }`}
                  >
                    {isPresetActive(0.15, 0.9, 0.65, true) && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
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
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-red-600 to-orange-600 text-white font-bold rounded-lg hover:from-red-700 hover:to-orange-700 transition-colors shadow-md relative ${
                      isPresetActive(0.2, 0.95, 0.8, true) ? 'ring-4 ring-red-300' : ''
                    }`}
                  >
                    {isPresetActive(0.2, 0.95, 0.8, true) && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
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
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-colors shadow-md relative ${
                      isPresetActive(0.25, 0.88, 0.6, true) ? 'ring-4 ring-blue-300' : ''
                    }`}
                  >
                    {isPresetActive(0.25, 0.88, 0.6, true) && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
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
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors shadow-md relative ${
                      isPresetActive(0.18, 0.92, 0.75, true) ? 'ring-4 ring-orange-300' : ''
                    }`}
                  >
                    {isPresetActive(0.18, 0.92, 0.75, true) && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
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
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-colors shadow-md relative ${
                      isPresetActive(0.12, 0.95, 0.85, true) ? 'ring-4 ring-indigo-300' : ''
                    }`}
                  >
                    {isPresetActive(0.12, 0.95, 0.85, true) && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
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
                    className={`px-3 py-2 text-xs bg-gradient-to-br from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors shadow-md relative ${
                      isPresetActive(0.22, 0.87, 0.55, true) ? 'ring-4 ring-green-300' : ''
                    }`}
                  >
                    {isPresetActive(0.22, 0.87, 0.55, true) && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
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
                    {audioDataMap.size > 0 && (
                      <span className="text-sm text-green-600 ml-2">
                        ({audioDataMap.size}/{splitTexts.length} audio)
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {/* Generate All Button */}
                    {audioDataMap.size < splitTexts.length && (
                      <button
                        onClick={handleGenerateAllAudios}
                        disabled={generatingAll || generatingIndexes.size > 0}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
                      >
                        {generatingAll || generatingIndexes.size > 0 ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang tạo {generatingIndexes.size} audio...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
                            </svg>
                            🎵 Tạo Tất Cả Audio
                          </>
                        )}
                      </button>
                    )}
                    {audioDataMap.size > 0 && (
                      <>
                        <button
                          onClick={handleMergeAllAudios}
                          disabled={isMerging || audioDataMap.size !== splitTexts.length}
                          className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
                        >
                          {isMerging ? (
                            <>
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Đang ghép {mergeProgress.toFixed(0)}%
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                              </svg>
                              🎵 Ghép Tất Cả Audio
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleDownloadAllAudios}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                          Download Riêng Lẻ
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleCopyAll}
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Copy Tất Cả Text
                    </button>
                  </div>
                </div>

                {splitTexts.map((textChunk, index) => {
                  const audioData = audioDataMap.get(index);
                  const isGenerating = generatingIndexes.has(index);
                  const isPlaying = playingIndex === index;

                  return (
                    <div key={index} className="border-2 border-purple-200 rounded-xl p-6 space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-3">
                        <div>
                          <h3 className="text-xl font-semibold text-purple-900">
                            Đoạn {index + 1}
                          </h3>
                          <div className="text-xs text-gray-500 mt-1">
                            API: {textChunk.suggestedApiKey} ({textChunk.maxTokens.toLocaleString()} tokens)
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-600">
                            {textChunk.chunk.length.toLocaleString()} ký tự
                          </span>
                          <button
                            onClick={() => handleCopy(textChunk, index)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                          >
                            Copy Text
                          </button>
                          <button
                            onClick={() => handleGenerateAudio(textChunk, index)}
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
                          {textChunk.chunk}
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
