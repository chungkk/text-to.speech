# 🔒 Security Guide

## Các Biện Pháp Bảo Mật Đã Triển Khai

### 1. ⏱️ Rate Limiting
**Mục đích**: Chống abuse và DDoS attacks

**Cấu hình mặc định**:
- `/api/tts`: 20 requests/hour per IP
- `/api/preview`: Không giới hạn (text ngắn, ít tốn quota)
- `/api/keys`: Chỉ local access (nên thêm authentication)

**Cách thay đổi**:
```typescript
// Trong route.ts
const rateLimit = checkRateLimit(clientId, {
  maxRequests: 30,        // Tăng lên 30 requests
  windowMs: 60 * 60 * 1000 // 1 giờ
});
```

### 2. 🔐 API Key Encryption (Optional)
**Mục đích**: Bảo vệ API keys trong database

**Setup**:
1. Generate encryption key:
```bash
openssl rand -hex 32
```

2. Thêm vào `.env.local`:
```env
ENCRYPTION_KEY=your-generated-key-here
```

3. Uncomment encryption code trong `models/ApiKey.ts` (nếu cần)

### 3. 🎭 API Key Masking
**Đã triển khai**:
- Admin Panel chỉ hiển thị: `sk_abc12...xyz9`
- Format: `8 ký tự đầu...4 ký tự cuối`
- Full key không bao giờ gửi về frontend

### 4. 🚫 Auto-Rotation & Key Management
**Cơ chế tự động**:
- Key hết quota → auto disable
- Retry với key khác (lên đến 3 lần)
- Update quota realtime từ ElevenLabs

### 5. 🌐 HTTP Security Headers
**Khuyến nghị thêm vào `next.config.ts`**:
```typescript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

## ⚠️ Best Practices

### 1. Bảo vệ Admin Panel
**Hiện tại**: Không có authentication ❌

**Khuyến nghị**:
```typescript
// Sử dụng NextAuth.js
import { getServerSession } from "next-auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // ... rest of code
}
```

### 2. Environment Variables
**Không commit vào Git**:
```gitignore
.env
.env.local
.env.*.local
```

**Cần thiết**:
- ✅ `.env.example` (template)
- ❌ `.env.local` (actual secrets)

### 3. MongoDB Security
**Connection string secure**:
```env
# ❌ Không tốt
MONGODB_URI=mongodb://admin:password123@localhost:27017/db

# ✅ Tốt hơn
MONGODB_URI=mongodb://user:${MONGODB_PASSWORD}@cluster.mongodb.net/db?retryWrites=true

# ✅ Tốt nhất (Atlas)
MONGODB_URI=mongodb+srv://user:${SECURE_PASS}@cluster.mongodb.net/db?retryWrites=true&w=majority
```

### 4. API Key Rotation
**Định kỳ thay API keys**:
1. Tạo key mới trên ElevenLabs
2. Add vào hệ thống
3. Test hoạt động
4. Deactivate key cũ
5. Sau 7 ngày, xóa key cũ

### 5. Monitoring & Alerts
**Nên theo dõi**:
- Số request bất thường
- API key usage spikes
- Failed authentication attempts
- Database connection errors

**Tool gợi ý**:
- Sentry (error tracking)
- LogRocket (session replay)
- Datadog/New Relic (monitoring)

## 🚨 Rate Limit Details

### Current Implementation:
```
IP + User-Agent fingerprint
├─ /api/tts: 20 req/hour
├─ /api/preview: unlimited
└─ /api/keys: should add auth
```

### Bypass Prevention:
- ✅ Combines IP + User-Agent
- ✅ Cloudflare compatible (cf-connecting-ip)
- ✅ Proxy-aware (x-forwarded-for)
- ⚠️  Can be bypassed with VPN/proxies

### Upgrade to Redis (Production):
```typescript
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function checkRateLimit(key: string) {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3600); // 1 hour
  }
  return count <= 20;
}
```

## 🔍 Security Checklist

### Pre-Production:
- [ ] Thêm authentication cho Admin Panel
- [ ] Enable HTTPS (SSL certificate)
- [ ] Setup security headers
- [ ] Rotate default ENCRYPTION_KEY
- [ ] Review và limit MongoDB permissions
- [ ] Enable MongoDB authentication
- [ ] Setup error monitoring (Sentry)
- [ ] Add CORS restrictions
- [ ] Implement CSRF protection
- [ ] Add request logging

### Post-Production:
- [ ] Monitor rate limit violations
- [ ] Regular API key rotation
- [ ] Security audit monthly
- [ ] Update dependencies (npm audit)
- [ ] Backup database weekly
- [ ] Review access logs
- [ ] Test disaster recovery

## 📞 Incident Response

### If API Key Compromised:
1. **Immediate**: Deactivate key trong Admin Panel
2. **Within 5min**: Revoke key trên ElevenLabs dashboard
3. **Within 30min**: Generate new key
4. **Within 1hr**: Review logs for unauthorized usage
5. **Within 24hr**: Report to ElevenLabs nếu có abuse

### If Database Breached:
1. **Immediate**: Disable MongoDB public access
2. **Within 15min**: Rotate all API keys
3. **Within 1hr**: Export và analyze access logs
4. **Within 24hr**: Restore from backup nếu cần

## 🔗 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [MongoDB Security](https://www.mongodb.com/docs/manual/security/)
- [ElevenLabs API Best Practices](https://elevenlabs.io/docs)
