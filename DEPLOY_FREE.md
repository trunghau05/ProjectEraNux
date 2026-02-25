# Deploy free cho ProjectEraNux

## Mô hình đề xuất (free)
- Frontend (Angular): Cloudflare Pages hoặc Netlify
- Backend (Django): Render/Railway (free tier)
- Signaling (Node + Socket.IO): Render/Railway (free tier)
- Database: MySQL free tier (Aiven/PlanetScale free nếu còn) hoặc chuyển Postgres free (Neon/Supabase)

> Lưu ý: Free tier có thể sleep sau một thời gian không truy cập.

## 1) Chuẩn bị biến môi trường

### Backend (`backend/.env`)
Tham khảo file [backend/.env.example](backend/.env.example).

Thiết lập tối thiểu khi production:
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS=your-backend-domain`
- `DJANGO_CORS_ALLOW_ALL_ORIGINS=False`
- `DJANGO_CORS_ALLOWED_ORIGINS=https://your-frontend-domain`
- `DB_*` theo database host miễn phí bạn chọn

### Signaling (`signaling/.env`)
Tham khảo file [signaling/.env.example](signaling/.env.example).

Production:
- `PORT` do nền tảng cấp (thường tự có sẵn)
- `CORS_ORIGINS=https://your-frontend-domain`

### Frontend production endpoints
Sửa file [frontend/src/environments/environment.prod.ts](frontend/src/environments/environment.prod.ts):
- `apiBaseUrl`: domain backend Django
- `signalingServerUrl`: domain signaling server

## 2) Deploy từng service

### Frontend
- Build command: `npm run build`
- Output dir: `dist/frontend/browser` (Angular 21 application builder)

### Backend
- Start command ví dụ: `python manage.py migrate ; python manage.py runserver 0.0.0.0:$PORT`
- Nên dùng gunicorn nếu platform hỗ trợ: `gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT`

### Signaling
- Build command: `npm run build`
- Start command: `npm run start`

## 3) WebRTC production note
- Cần HTTPS cho frontend/signaling/backend.
- STUN-only có thể đủ cho demo.
- Nếu người dùng ở mạng chặn P2P, cần TURN server (thường phát sinh chi phí).

## 4) Checklist nhanh
- Frontend gọi đúng backend/signaling production URL
- CORS backend và signaling chỉ cho phép frontend domain
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS` đã khai báo domain thực tế
