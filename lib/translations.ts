export type Language = 'de' | 'en' | 'vi';

export interface Translations {
  // Header
  appTitle: string;
  appSubtitle: string;
  adminPanel: string;
  
  // Text Input
  textInputLabel: string;
  textInputPlaceholder: string;
  charactersCount: string;
  minCharacters: string;
  charactersRemaining: string;
  ready: string;
  tooManyCharacters: string;
  
  // Voice Selection
  voiceSelectionLabel: string;
  voicesAvailable: string;
  previewButton: string;
  stopButton: string;
  germanVoices: string;
  englishVoices: string;
  vietnameseVoices: string;
  filterAll: string;
  filterMale: string;
  filterFemale: string;
  
  // Voice Settings
  voiceSettingsTitle: string;
  stability: string;
  stabilityDesc: string;
  moreEmotion: string;
  moreStable: string;
  similarityBoost: string;
  similarityBoostDesc: string;
  lower: string;
  higher: string;
  style: string;
  styleDesc: string;
  normal: string;
  dramatic: string;
  speakerBoost: string;
  speakerBoostDesc: string;
  
  // Presets
  presetsTitle: string;
  presetStandard: string;
  presetStandardDesc: string;
  presetGerman: string;
  presetGermanDesc: string;
  presetAudiobook: string;
  presetAudiobookDesc: string;
  presetExpressive: string;
  presetExpressiveDesc: string;
  presetDramatic: string;
  presetDramaticDesc: string;
  presetPodcast: string;
  presetPodcastDesc: string;
  presetAdvertising: string;
  presetAdvertisingDesc: string;
  presetStorytelling: string;
  presetStorytellingDesc: string;
  presetTutorial: string;
  presetTutorialDesc: string;
  
  // Parameter Guide
  parameterGuideTitle: string;
  stabilityGuide: string;
  similarityGuide: string;
  styleGuide: string;
  speakerBoostGuide: string;
  proTipTitle: string;
  proTipContent: string;
  
  // Generate Button
  generateButton: string;
  generating: string;
  
  // Audio Player
  audioCreated: string;
  duration: string;
  fileSize: string;
  playButton: string;
  pauseButton: string;
  downloadButton: string;
  newButton: string;
  
  // Errors
  errorTextRequired: string;
  errorTextTooShort: string;
  errorTextTooLong: string;
  errorRateLimit: string;
  errorGeneral: string;
}

export const translations: Record<Language, Translations> = {
  de: {
    // Header
    appTitle: 'Text to Speech',
    appSubtitle: 'Powered by ElevenLabs',
    adminPanel: 'Admin Panel',
    
    // Text Input
    textInputLabel: 'Ihr deutscher Text eingeben',
    textInputPlaceholder: 'Geben Sie Ihren deutschen Text hier ein...',
    charactersCount: 'Zeichen',
    minCharacters: 'Min: 100 Zeichen',
    charactersRemaining: 'Noch {count} Zeichen',
    ready: 'Bereit',
    tooManyCharacters: '{count} Zeichen zu viel',
    
    // Voice Selection
    voiceSelectionLabel: 'Stimme auswählen',
    voicesAvailable: 'Stimmen',
    previewButton: '▶',
    stopButton: '■',
    germanVoices: '🇩🇪 Deutsche Stimmen',
    englishVoices: '🇺🇸 English Voices',
    vietnameseVoices: '🇻🇳 Giọng Tiếng Việt',
    filterAll: 'Alle',
    filterMale: '♂️ Männlich',
    filterFemale: '♀️ Weiblich',
    
    // Voice Settings
    voiceSettingsTitle: 'Stimmeneinstellungen (Voice Settings)',
    stability: 'Stability',
    stabilityDesc: '(Niedriger = Ausdrucksvoller)',
    moreEmotion: 'Mehr Emotion',
    moreStable: 'Stabiler',
    similarityBoost: 'Similarity Boost',
    similarityBoostDesc: '(Ähnlichkeit zur Originalstimme)',
    lower: 'Niedriger',
    higher: 'Höher',
    style: 'Style (Stilübertreibung)',
    styleDesc: '(0 = Normal, Höher = Dramatischer)',
    normal: 'Normal',
    dramatic: 'Dramatisch',
    speakerBoost: 'Speaker Boost aktivieren',
    speakerBoostDesc: 'Erhöht die Ähnlichkeit zum Sprecher',
    
    // Presets
    presetsTitle: '⚡ Schnelleinstellungen:',
    presetStandard: '🎯 Standard',
    presetStandardDesc: 'Ausgewogen & neutral',
    presetGerman: '🇩🇪 Authentisch Deutsch',
    presetGermanDesc: 'Natürlich & ausdrucksstark',
    presetAudiobook: '📖 Hörbuch',
    presetAudiobookDesc: 'Ruhig & konsistent',
    presetExpressive: '🎭 Mega Expressiv',
    presetExpressiveDesc: 'Emotionen & Variationen',
    presetDramatic: '🎬 Dramatisch ULTRA',
    presetDramaticDesc: 'Max Intensität',
    presetPodcast: '🎙️ Podcast Pro',
    presetPodcastDesc: 'Dynamisch & fesselnd',
    presetAdvertising: '📢 Werbung Energie',
    presetAdvertisingDesc: 'Kraftvoll & überzeugend',
    presetStorytelling: '🎪 Storytelling Epic',
    presetStorytellingDesc: 'Episch & fesselnd',
    presetTutorial: '🎓 Tutorial Klar',
    presetTutorialDesc: 'Verständlich & freundlich',
    
    // Parameter Guide
    parameterGuideTitle: 'Parameter-Guide für maximale Ausdruckskraft',
    stabilityGuide: 'Stability (Stabilität)',
    similarityGuide: 'Similarity Boost',
    styleGuide: 'Style (Stilübertreibung)',
    speakerBoostGuide: 'Speaker Boost',
    proTipTitle: '🏆 Pro-Tipp für authentisches Deutsch:',
    proTipContent: 'Kombiniere Native German Voices (🇩🇪) mit: Stability 0.2-0.3, Similarity 0.85-0.95, Style 0.5-0.7, Speaker Boost ON',
    
    // Generate Button
    generateButton: 'MP3 generieren',
    generating: 'Wird generiert...',
    
    // Audio Player
    audioCreated: 'MP3 erfolgreich erstellt!',
    duration: 'Dauer',
    fileSize: 'Größe',
    playButton: 'Abspielen',
    pauseButton: 'Pause',
    downloadButton: 'Download',
    newButton: 'Neu',
    
    // Errors
    errorTextRequired: 'Text ist erforderlich',
    errorTextTooShort: 'Text muss mindestens 100 Zeichen haben',
    errorTextTooLong: 'Text darf maximal 10.000 Zeichen haben',
    errorRateLimit: 'Rate-Limit überschritten. Versuchen Sie es später erneut.',
    errorGeneral: 'Ein Fehler ist aufgetreten',
  },
  
  en: {
    // Header
    appTitle: 'Text to Speech',
    appSubtitle: 'Powered by ElevenLabs',
    adminPanel: 'Admin Panel',
    
    // Text Input
    textInputLabel: 'Enter Your German Text',
    textInputPlaceholder: 'Enter your German text here...',
    charactersCount: 'characters',
    minCharacters: 'Min: 100 characters',
    charactersRemaining: '{count} characters needed',
    ready: 'Ready',
    tooManyCharacters: '{count} characters too many',
    
    // Voice Selection
    voiceSelectionLabel: 'Select Voice',
    voicesAvailable: 'voices',
    previewButton: '▶',
    stopButton: '■',
    germanVoices: '🇩🇪 German Voices',
    englishVoices: '🇺🇸 English Voices',
    vietnameseVoices: '🇻🇳 Vietnamese Voices',
    filterAll: 'All',
    filterMale: '♂️ Male',
    filterFemale: '♀️ Female',
    
    // Voice Settings
    voiceSettingsTitle: 'Voice Settings',
    stability: 'Stability',
    stabilityDesc: '(Lower = More Expressive)',
    moreEmotion: 'More Emotion',
    moreStable: 'More Stable',
    similarityBoost: 'Similarity Boost',
    similarityBoostDesc: '(Similarity to Original Voice)',
    lower: 'Lower',
    higher: 'Higher',
    style: 'Style (Exaggeration)',
    styleDesc: '(0 = Normal, Higher = More Dramatic)',
    normal: 'Normal',
    dramatic: 'Dramatic',
    speakerBoost: 'Enable Speaker Boost',
    speakerBoostDesc: 'Increases similarity to speaker',
    
    // Presets
    presetsTitle: '⚡ Quick Settings:',
    presetStandard: '🎯 Standard',
    presetStandardDesc: 'Balanced & neutral',
    presetGerman: '🇩🇪 Authentic German',
    presetGermanDesc: 'Natural & expressive',
    presetAudiobook: '📖 Audiobook',
    presetAudiobookDesc: 'Calm & consistent',
    presetExpressive: '🎭 Mega Expressive',
    presetExpressiveDesc: 'Emotions & variations',
    presetDramatic: '🎬 Ultra Dramatic',
    presetDramaticDesc: 'Max intensity',
    presetPodcast: '🎙️ Podcast Pro',
    presetPodcastDesc: 'Dynamic & engaging',
    presetAdvertising: '📢 Advertising Energy',
    presetAdvertisingDesc: 'Powerful & convincing',
    presetStorytelling: '🎪 Epic Storytelling',
    presetStorytellingDesc: 'Epic & captivating',
    presetTutorial: '🎓 Clear Tutorial',
    presetTutorialDesc: 'Clear & friendly',
    
    // Parameter Guide
    parameterGuideTitle: 'Parameter Guide for Maximum Expression',
    stabilityGuide: 'Stability',
    similarityGuide: 'Similarity Boost',
    styleGuide: 'Style (Exaggeration)',
    speakerBoostGuide: 'Speaker Boost',
    proTipTitle: '🏆 Pro Tip for Authentic German:',
    proTipContent: 'Combine Native German Voices (🇩🇪) with: Stability 0.2-0.3, Similarity 0.85-0.95, Style 0.5-0.7, Speaker Boost ON',
    
    // Generate Button
    generateButton: 'Generate MP3',
    generating: 'Generating...',
    
    // Audio Player
    audioCreated: 'MP3 Successfully Created!',
    duration: 'Duration',
    fileSize: 'Size',
    playButton: 'Play',
    pauseButton: 'Pause',
    downloadButton: 'Download',
    newButton: 'New',
    
    // Errors
    errorTextRequired: 'Text is required',
    errorTextTooShort: 'Text must be at least 100 characters',
    errorTextTooLong: 'Text must be less than 10,000 characters',
    errorRateLimit: 'Rate limit exceeded. Please try again later.',
    errorGeneral: 'An error occurred',
  },
  
  vi: {
    // Header
    appTitle: 'Chuyển Văn Bản Thành Giọng Nói',
    appSubtitle: 'Được hỗ trợ bởi ElevenLabs',
    adminPanel: 'Quản Trị',
    
    // Text Input
    textInputLabel: 'Nhập Văn Bản Tiếng Đức',
    textInputPlaceholder: 'Nhập văn bản tiếng Đức của bạn tại đây...',
    charactersCount: 'ký tự',
    minCharacters: 'Tối thiểu: 100 ký tự',
    charactersRemaining: 'Còn thiếu {count} ký tự',
    ready: 'Sẵn sàng',
    tooManyCharacters: 'Thừa {count} ký tự',
    
    // Voice Selection
    voiceSelectionLabel: 'Chọn Giọng Đọc',
    voicesAvailable: 'giọng',
    previewButton: '▶',
    stopButton: '■',
    germanVoices: '🇩🇪 Giọng Tiếng Đức',
    englishVoices: '🇺🇸 Giọng Tiếng Anh',
    vietnameseVoices: '🇻🇳 Giọng Tiếng Việt',
    filterAll: 'Tất cả',
    filterMale: '♂️ Nam',
    filterFemale: '♀️ Nữ',
    
    // Voice Settings
    voiceSettingsTitle: 'Cài Đặt Giọng Nói',
    stability: 'Độ Ổn Định',
    stabilityDesc: '(Thấp = Biểu cảm hơn)',
    moreEmotion: 'Nhiều Cảm Xúc',
    moreStable: 'Ổn Định Hơn',
    similarityBoost: 'Tăng Độ Tương Đồng',
    similarityBoostDesc: '(Giống giọng gốc)',
    lower: 'Thấp Hơn',
    higher: 'Cao Hơn',
    style: 'Phong Cách',
    styleDesc: '(0 = Bình thường, Cao = Kịch tính)',
    normal: 'Bình Thường',
    dramatic: 'Kịch Tính',
    speakerBoost: 'Bật Speaker Boost',
    speakerBoostDesc: 'Tăng độ giống người nói',
    
    // Presets
    presetsTitle: '⚡ Cài Đặt Nhanh:',
    presetStandard: '🎯 Tiêu Chuẩn',
    presetStandardDesc: 'Cân bằng & trung lập',
    presetGerman: '🇩🇪 Đức Xác Thực',
    presetGermanDesc: 'Tự nhiên & biểu cảm',
    presetAudiobook: '📖 Sách Nói',
    presetAudiobookDesc: 'Êm & nhất quán',
    presetExpressive: '🎭 Siêu Biểu Cảm',
    presetExpressiveDesc: 'Nhiều cảm xúc',
    presetDramatic: '🎬 Cực Kịch Tính',
    presetDramaticDesc: 'Mạnh mẽ tối đa',
    presetPodcast: '🎙️ Podcast Chuyên Nghiệp',
    presetPodcastDesc: 'Năng động & hấp dẫn',
    presetAdvertising: '📢 Quảng Cáo Sôi Động',
    presetAdvertisingDesc: 'Mạnh mẽ & thuyết phục',
    presetStorytelling: '🎪 Kể Chuyện Hoành Tráng',
    presetStorytellingDesc: 'Hùng tráng & cuốn hút',
    presetTutorial: '🎓 Hướng Dẫn Rõ Ràng',
    presetTutorialDesc: 'Dễ hiểu & thân thiện',
    
    // Parameter Guide
    parameterGuideTitle: 'Hướng Dẫn Thông Số Tối Ưu',
    stabilityGuide: 'Độ Ổn Định',
    similarityGuide: 'Tăng Độ Tương Đồng',
    styleGuide: 'Phong Cách',
    speakerBoostGuide: 'Speaker Boost',
    proTipTitle: '🏆 Mẹo Chuyên Nghiệp:',
    proTipContent: 'Kết hợp giọng Đức gốc (🇩🇪) với: Stability 0.2-0.3, Similarity 0.85-0.95, Style 0.5-0.7, Speaker Boost BẬT',
    
    // Generate Button
    generateButton: 'Tạo MP3',
    generating: 'Đang tạo...',
    
    // Audio Player
    audioCreated: 'Đã Tạo MP3 Thành Công!',
    duration: 'Thời lượng',
    fileSize: 'Dung lượng',
    playButton: 'Phát',
    pauseButton: 'Tạm dừng',
    downloadButton: 'Tải xuống',
    newButton: 'Mới',
    
    // Errors
    errorTextRequired: 'Vui lòng nhập văn bản',
    errorTextTooShort: 'Văn bản phải có ít nhất 100 ký tự',
    errorTextTooLong: 'Văn bản không được quá 10.000 ký tự',
    errorRateLimit: 'Vượt quá giới hạn. Vui lòng thử lại sau.',
    errorGeneral: 'Đã xảy ra lỗi',
  },
};

export function getTranslation(lang: Language): Translations {
  return translations[lang] || translations.de;
}

export function formatString(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() || match;
  });
}
