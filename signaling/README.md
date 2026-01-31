# WebRTC Signaling Server

Node.js signaling server cho WebRTC video calling.

## Cài đặt

```bash
npm install
```

## Chạy server

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm start
```

Server sẽ chạy trên port 3000 (hoặc PORT trong file .env).

## API Endpoints

- `GET /health` - Kiểm tra trạng thái server
- `GET /room/:roomId` - Lấy thông tin phòng

## Socket.IO Events

### Client -> Server
- `join-room` - Tham gia phòng
- `leave-room` - Rời phòng
- `offer` - Gửi WebRTC offer
- `answer` - Gửi WebRTC answer
- `ice-candidate` - Gửi ICE candidate
- `toggle-video` - Bật/tắt video
- `toggle-audio` - Bật/tắt audio

### Server -> Client
- `user-connected` - User khác vào phòng
- `user-disconnected` - User khác rời phòng
- `existing-users` - Danh sách users hiện có
- `offer` - Nhận WebRTC offer
- `answer` - Nhận WebRTC answer
- `ice-candidate` - Nhận ICE candidate
- `user-video-toggled` - User khác bật/tắt video
- `user-audio-toggled` - User khác bật/tắt audio
