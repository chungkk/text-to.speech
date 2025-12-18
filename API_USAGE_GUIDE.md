# ElevenLabs API Usage Guide

## Cách tính API Usage

### 1. **Character = Token (1:1)**
```
1 ký tự = 1 token
```

**Ví dụ:**
- Text: "Hallo Welt" (10 ký tự) = **10 tokens**
- Text: "Guten Tag, wie geht es dir?" (28 ký tự) = **28 tokens**

### 2. **ElevenLabs Free Tier**
- **10,000 characters/month** miễn phí mỗi API key
- Reset vào đầu mỗi tháng (theo billing cycle)
- Áp dụng cho tất cả giọng đọc

### 3. **Hệ thống Auto-Rotation**

Khi bạn có nhiều API keys, hệ thống tự động:

#### a) Chọn Key Tốt Nhất
```javascript
// Ưu tiên key có nhiều tokens nhất
const apiKey = await ApiKey.findOne({
  isActive: true,
  remainingTokens: { $gte: requiredTokens }
}).sort({ remainingTokens: -1 });
```

#### b) Trừ Tokens Sau Khi Dùng
```javascript
// Ví dụ: Text có 250 ký tự
requiredTokens = 250
// Sau khi generate thành công:
remainingTokens = remainingTokens - 250
```

#### c) Tự Động Chuyển Sang Key Khác
- Khi Key A hết tokens → tự động dùng Key B
- Khi tất cả keys hết → báo lỗi

## Ví dụ Thực Tế

### Scenario 1: Một API Key
```
Key #1: 10,000 tokens

Text #1: 500 ký tự → Key #1: 9,500 tokens còn lại
Text #2: 1,200 ký tự → Key #1: 8,300 tokens còn lại
Text #3: 8,300 ký tú → Key #1: 0 tokens còn lại ✗ Hết quota
```

### Scenario 2: Ba API Keys
```
Key #1: 10,000 tokens
Key #2: 10,000 tokens
Key #3: 10,000 tokens
TỔNG: 30,000 tokens

Text #1: 5,000 ký tự → Dùng Key #1 (còn 5,000)
Text #2: 3,000 ký tự → Dùng Key #2 (còn 7,000)
Text #3: 6,000 ký tự → Dùng Key #2 (còn 1,000)
Text #4: 4,000 ký tự → Dùng Key #1 (còn 1,000)
Text #5: 2,000 ký tự → Dùng Key #3 (còn 8,000)
... và tiếp tục
```

## Preview API (Nghe Thử Giọng)

**Preview KHÔNG trừ tokens!** ❌

Lý do: Preview dùng text ngắn cố định (~100-150 ký tự) để demo giọng.

```javascript
// app/api/preview/route.ts
// Text được hardcode sẵn cho mỗi giọng
previewText: 'Guten Tag, ich bin Helmut...'
```

**Lưu ý:** Preview vẫn gọi ElevenLabs API nên vẫn tính vào quota, nhưng do text ngắn nên chi phí thấp.

## Cách Tối Ưu API Usage

### 1. **Thêm Nhiều API Keys**
- Mỗi email = 1 API key miễn phí
- Tạo nhiều tài khoản ElevenLabs
- Add vào hệ thống qua Admin Panel

### 2. **Monitor Tokens**
```
Admin Panel → Xem remainingTokens của từng key
```

### 3. **Deactivate Key Tạm Thời**
- Nếu muốn "cất" key cho tháng sau
- Hệ thống sẽ bỏ qua key bị deactivate

### 4. **Reset Hàng Tháng**
- ElevenLabs tự động reset quota đầu tháng
- Bạn CẦN update lại `remainingTokens` trong database:

```javascript
// Chạy script này đầu mỗi tháng
db.apikeys.updateMany(
  {},
  { $set: { remainingTokens: "$totalTokens" } }
)
```

## Chi Phí Ước Tính

| Text Length | Tokens | Keys Needed (10k/key) |
|-------------|--------|----------------------|
| 100-10,000 ký tự/file | 100-10,000 | 1 key = 1-100 files |
| 5,000 ký tự trung bình | 5,000 | 1 key = 2 files |
| 30,000 ký tự/ngày | 30,000 | 3 keys/ngày |
| 300,000 ký tự/tháng | 300,000 | 30 keys/tháng |

## Paid Plans (Nếu Cần)

| Plan | Price | Characters/Month |
|------|-------|------------------|
| **Starter** | $5/month | 30,000 characters |
| **Creator** | $22/month | 100,000 characters |
| **Pro** | $99/month | 500,000 characters |

## Monitoring & Alerts

### Check Usage Qua Admin Panel
1. Vào http://localhost:3000/admin
2. Xem `Remaining Tokens` của mỗi key
3. Xem `Last Used` để biết key nào đang active

### Database Query
```javascript
// Check tổng tokens còn lại
db.apikeys.aggregate([
  { $match: { isActive: true } },
  { $group: { _id: null, total: { $sum: "$remainingTokens" } } }
])
```

## Best Practices

✅ **DO:**
- Thêm 3-5 API keys để dự phòng
- Check tokens trước khi generate text dài
- Update `totalTokens` đúng với plan của bạn
- Tắt key không dùng (deactivate)

❌ **DON'T:**
- Không share API key công khai
- Không commit API key vào Git
- Không quên update tokens sau khi reset hàng tháng

## Troubleshooting

### Error: "No API key available"
**Nguyên nhân:**
- Tất cả keys hết tokens
- Tất cả keys bị deactivate
- Không có key nào trong database

**Giải pháp:**
1. Check Admin Panel
2. Add key mới hoặc activate key cũ
3. Đợi đầu tháng để quota reset

### Error: "Insufficient tokens"
**Nguyên nhân:**
- Text quá dài (>10,000 ký tự)
- Key còn ít tokens hơn yêu cầu

**Giải pháp:**
1. Rút ngắn text
2. Add thêm key
3. Dùng key khác có tokens nhiều hơn
