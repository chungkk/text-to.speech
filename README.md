# ElevenLabs Text-to-Speech Application

Ứng dụng chuyển đổi văn bản thành giọng nói sử dụng ElevenLabs API với giọng **Helmut - German Epic Trailer Voice**.

## Tính năng

- 🎙️ Chuyển đổi văn bản (100-10,000 ký tự) thành file MP3
- 🔄 Tự động xoay vòng API keys khi hết quota
- 📊 Quản lý nhiều API keys với tracking tokens
- 💾 Lưu trữ API keys trong MongoDB
- 🎨 Giao diện đơn giản, dễ sử dụng

## Cài đặt

### 1. Cài đặt dependencies11

```bash
npm install
```

### 2. Cấu hình MongoDB

Chỉnh sửa file `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/elevenlabs-tts
```

Hoặc sử dụng MongoDB Atlas:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/elevenlabs-tts
```

### 3. Khởi động MongoDB (nếu dùng local)

```bash
mongod
```

### 4. Chạy ứng dụng

```bash
npm run dev
```

Truy cập: http://localhost:3000

## Hướng dẫn sử dụng

### 1. Thêm API Keys

1. Truy cập trang Admin: http://localhost:3000/admin
2. Click "Add New API Key"
3. Nhập thông tin:
   - **Name**: Tên để nhận diện (ví dụ: "Key 1")
   - **API Key**: API key từ ElevenLabs (lấy tại https://elevenlabs.io/app/settings/api-keys)
   - **Total Tokens**: Tổng số tokens có sẵn (mặc định: 10,000)
4. Click "Add Key"

### 2. Chuyển đổi Text thành Speech

1. Truy cập trang chính: http://localhost:3000
2. Nhập văn bản (100-10,000 ký tự)
3. Click "Generate MP3"
4. File MP3 sẽ tự động download

### 3. Quản lý API Keys

Trong trang Admin, bạn có thể:

- Xem danh sách tất cả API keys
- Xem số tokens còn lại của mỗi key
- Activate/Deactivate keys
- Xóa keys không cần thiết

## Cơ chế hoạt động

1. **Auto Rotation**: Hệ thống tự động chọn API key có nhiều tokens nhất và còn hoạt động
2. **Token Tracking**: Mỗi lần sử dụng, số tokens tương ứng sẽ được trừ đi
3. **Fallback**: Khi một key hết tokens, hệ thống tự động chuyển sang key tiếp theo

## Voice ID

Ứng dụng sử dụng **Helmut - German Epic Trailer Voice**:

- Voice ID: `TX3LPaxmHKxFdv7VOQHJ`
- Model: `eleven_multilingual_v2`

## Cấu trúc project

```
eleven/
├── app/
│   ├── api/
│   │   ├── keys/
│   │   │   └── route.ts      # API quản lý keys
│   │   └── tts/
│   │       └── route.ts      # API text-to-speech
│   ├── admin/
│   │   └── page.tsx          # Trang quản lý keys
│   └── page.tsx              # Trang chính
├── lib/
│   └── mongodb.ts            # MongoDB connection
├── models/
│   └── ApiKey.ts             # Schema API keys
└── .env.local                # Biến môi trường
```

## Lưu ý

- Mỗi API key ElevenLabs thường có 10,000 characters/month (free tier)
- 1 character ≈ 1 token
- Hệ thống sẽ tự động ngừng khi tất cả keys đều hết tokens
- Tokens sẽ được reset vào đầu tháng theo chu kỳ của ElevenLabs

## Troubleshooting

### Lỗi kết nối MongoDB

- Kiểm tra MongoDB đang chạy: `mongod`
- Kiểm tra connection string trong `.env.local`

### Lỗi "No API key available"

- Thêm ít nhất một API key trong trang Admin
- Kiểm tra API key còn tokens
- Kiểm tra key đang ở trạng thái Active

### Lỗi ElevenLabs API

- Kiểm tra API key còn hiệu lực
- Kiểm tra quota còn lại trên ElevenLabs dashboard
