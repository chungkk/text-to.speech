'use client';

import { useState, useEffect } from 'react';

interface QuotaLoadingButtonProps {
    isLoading: boolean;
    isSuccess: boolean;
    loadingText?: string;
    successText?: string;
    subText?: string;
}

export default function QuotaLoadingButton({
    isLoading,
    isSuccess,
    loadingText = 'Đang kiểm tra quota...',
    successText = 'Đã kiểm tra xong!',
    subText = 'Đang sync với ElevenLabs API'
}: QuotaLoadingButtonProps) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isLoading) {
            setVisible(true);
            setShowSuccess(false);
        } else if (isSuccess && visible) {
            setShowSuccess(true);
            // Hide after 3 seconds when success
            const timer = setTimeout(() => {
                setVisible(false);
                setShowSuccess(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isLoading, isSuccess, visible]);

    if (!visible && !isLoading) return null;

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 transition-all duration-500 transform ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
        >
            <div
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-sm border-2 transition-all duration-300 ${showSuccess
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-400 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-400 text-white'
                    }`}
                style={{
                    boxShadow: showSuccess
                        ? '0 10px 40px rgba(34, 197, 94, 0.4)'
                        : '0 10px 40px rgba(59, 130, 246, 0.4)'
                }}
            >
                {/* Icon */}
                <div className={`flex-shrink-0 ${showSuccess ? '' : 'animate-pulse'}`}>
                    {showSuccess ? (
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <svg
                                className="w-6 h-6 text-white animate-bounce-once"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <svg
                                className="animate-spin w-6 h-6 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Text */}
                <div className="flex flex-col">
                    <span className="font-bold text-sm">
                        {showSuccess ? successText : loadingText}
                    </span>
                    <span className="text-xs opacity-80">
                        {showSuccess ? '✨ Sẵn sàng sử dụng' : subText}
                    </span>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-1 -right-1">
                    {showSuccess ? (
                        <div className="w-4 h-4 bg-green-400 rounded-full animate-ping" />
                    ) : (
                        <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                    )}
                </div>
            </div>

            {/* Custom CSS for animation */}
            <style jsx>{`
        @keyframes bounce-once {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.5s ease-in-out;
        }
      `}</style>
        </div>
    );
}
