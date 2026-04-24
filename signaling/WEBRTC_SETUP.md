# Hướng dẫn thiết lập WebRTC Video Call

## Tổng quan
Hệ thống WebRTC này bao gồm:
- **Node.js Signaling Server** (Socket.IO) - Xử lý signaling giữa các peers
- **Angular Frontend** - Giao diện video call với WebRTC

## Bước 1: Cài đặt Node.js Signaling Server

### 1.1. Cài dependencies
```bash
cd webrtc-server
npm install
```

### 1.2. Chạy server
```bash
# Development mode (auto-restart)
npm run dev

# hoặc Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## Bước 2: Cài đặt Frontend Angular

### 2.1. Cài socket.io-client
```bash
cd frontend
npm install
```

### 2.2. Chạy Angular dev server
```bash
npm start
```

Angular app sẽ chạy tại: `http://localhost:4200`

## Bước 3: Sử dụng Video Call

### 3.1. Truy cập trang video call
Mở trình duyệt và truy cập:
```
http://localhost:4200/video-call
```

hoặc với room ID cụ thể:
```
http://localhost:4200/video-call/room123
```

### 3.2. Tham gia cuộc gọi
1. Nhập **Mã phòng** (room ID) - cùng mã phòng để gọi với nhau
2. Nhập **User ID** của bạn
3. Nhập **Tên hiển thị**
4. Click **"Tham gia"**

### 3.3. Cho phép quyền camera & microphone
Trình duyệt sẽ yêu cầu quyền truy cập camera và microphone. Click **"Allow"**.

### 3.4. Gọi video
- Mở **2 tab** trình duyệt (hoặc 2 thiết bị khác nhau)
- Cùng nhập **cùng mã phòng**
- Nhập thông tin khác nhau cho mỗi user
- Bấm tham gia ở cả 2 tab
- Video call sẽ tự động kết nối!

## Các tính năng

### ✅ Đã implement
- ✅ Video call 1-1 và nhiều người
- ✅ Bật/tắt camera
- ✅ Bật/tắt microphone
- ✅ Hiển thị số người tham gia
- ✅ Copy link phòng
- ✅ Tự động reconnect khi mất kết nối
- ✅ Responsive design

### 🎛️ Controls
- **📹/📷** - Bật/tắt camera
- **🎤/🔇** - Bật/tắt microphone
- **📞** - Kết thúc cuộc gọi
- **📋** - Copy link phòng

## Kiến trúc hệ thống

```
┌─────────────────┐         WebSocket         ┌─────────────────┐
│   Client A      │◄─────────────────────────►│   Signaling     │
│  (Angular)      │     (Socket.IO)            │   Server        │
└─────────────────┘                            │   (Node.js)     │
        ▲                                      └─────────────────┘
        │                                               ▲
        │         WebRTC P2P Connection                │
        │         (Video/Audio)                        │
        │                                              │
        ▼                                              ▼
┌─────────────────┐         WebSocket         ┌─────────────────┐
│   Client B      │◄───────────────────────────┘
│  (Angular)      │
└─────────────────┘
```

## Cấu trúc file

```
webrtc-server/
├── server.js           # Node.js signaling server
├── package.json        # Dependencies
└── README.md          # Hướng dẫn

frontend/
├── src/app/
│   ├── services/
│   │   └── webrtc.service.ts          # WebRTC logic
│   └── components/
│       └── video-call/
│           ├── video-call.component.ts     # Component
│           ├── video-call.component.html   # Template
│           └── video-call.component.scss   # Styles
```

## Troubleshooting

### 🔴 Không kết nối được signaling server
- Kiểm tra server có đang chạy không: `http://localhost:3000/health`
- Kiểm tra CORS settings trong `server.js`
- Kiểm tra firewall

### 🔴 Không thấy video
- Kiểm tra quyền camera/microphone trong browser
- Mở **Settings** → **Privacy** → **Camera/Microphone**
- Thử reload trang và cho phép lại

### 🔴 Video bị lag hoặc đứng
- Kiểm tra kết nối mạng
- ICE servers (STUN/TURN) có thể cần cấu hình
- Thử giảm resolution trong `webrtc.service.ts`

### 🔴 Lỗi "getUserMedia is not defined"
- WebRTC yêu cầu **HTTPS** hoặc **localhost**
- Đảm bảo đang test trên localhost hoặc deploy với HTTPS

## Production Deployment

### HTTPS bắt buộc
WebRTC yêu cầu HTTPS trong production. Sử dụng:
- Let's Encrypt (free SSL)
- Cloudflare
- AWS Certificate Manager

### TURN Server
Cho môi trường behind NAT/Firewall, cần TURN server:
- [Coturn](https://github.com/coturn/coturn)
- [Twilio TURN](https://www.twilio.com/stun-turn)
- [Xirsys](https://xirsys.com/)

Cập nhật trong `webrtc.service.ts`:
```typescript
private readonly iceServers: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ]
};
```

## Mở rộng

### Thêm tính năng
- Screen sharing
- Recording
- Chat text
- Whiteboard
- Virtual backgrounds
- Noise cancellation

### Tích hợp với backend Django
Có thể tích hợp authentication và room management với Django backend:
- Tạo room từ Django
- Lưu lịch sử cuộc gọi
- Quản lý permissions

## Tài liệu tham khảo

- [WebRTC Docs](https://webrtc.org/)
- [Socket.IO Docs](https://socket.io/docs/)
- [Angular Docs](https://angular.io/)
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

## License
MIT
