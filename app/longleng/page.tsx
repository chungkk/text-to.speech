'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Language, getTranslation } from '@/lib/translations';

export default function LongTextSplitter() {
  const [currentLang, setCurrentLang] = useState<Language>('de');
  const [inputText, setInputText] = useState('');
  const [splitTexts, setSplitTexts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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
    try {
      const chunks = splitText(inputText);
      setSplitTexts(chunks);
    } catch (error) {
      console.error('Error splitting text:', error);
    } finally {
      setLoading(false);
    }
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
                  <button
                    onClick={handleCopyAll}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Copy Tất Cả
                  </button>
                </div>

                {splitTexts.map((chunk, index) => (
                  <div key={index} className="border-2 border-purple-200 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-semibold text-purple-900">
                        Đoạn {index + 1}
                      </h3>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-600">
                          {chunk.length.toLocaleString()} ký tự
                        </span>
                        <button
                          onClick={() => handleCopy(chunk, index)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                        {chunk}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
