import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:4200", // Angular dev server
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Types
interface UserInfo {
  userId: string;
  userName: string;
  roomId: string;
}

interface JoinRoomData {
  roomId: string;
  userId: string;
  userName: string;
}

interface OfferData {
  offer: RTCSessionDescriptionInit;
  to: string;
}

interface AnswerData {
  answer: RTCSessionDescriptionInit;
  to: string;
}

interface IceCandidateData {
  candidate: RTCIceCandidateInit;
  to: string;
}

interface ToggleMediaData {
  roomId: string;
  enabled: boolean;
}

// Store connected users and their rooms
const users = new Map<string, UserInfo>();
const rooms = new Map<string, Set<string>>();

io.on('connection', (socket: Socket) => {
  console.log('New client connected:', socket.id);

  // Join a room
  socket.on('join-room', ({ roomId, userId, userName }: JoinRoomData) => {
    socket.join(roomId);
    
    // Store user info
    users.set(socket.id, { userId, userName, roomId });
    
    // Add room info
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set<string>());
    }
    rooms.get(roomId)!.add(socket.id);

    // Notify others in the room
    socket.to(roomId).emit('user-connected', {
      socketId: socket.id,
      userId,
      userName
    });

    // Send existing users in the room
    const existingUsers = Array.from(rooms.get(roomId)!)
      .filter(id => id !== socket.id)
      .map(id => {
        const user = users.get(id);
        return {
          socketId: id,
          userId: user?.userId,
          userName: user?.userName
        };
      });

    socket.emit('existing-users', existingUsers);

    console.log(`User ${userName} (${userId}) joined room ${roomId}`);
  });

  // WebRTC signaling: offer
  socket.on('offer', ({ offer, to }: OfferData) => {
    console.log('Sending offer from', socket.id, 'to', to);
    io.to(to).emit('offer', {
      offer,
      from: socket.id
    });
  });

  // WebRTC signaling: answer
  socket.on('answer', ({ answer, to }: AnswerData) => {
    console.log('Sending answer from', socket.id, 'to', to);
    io.to(to).emit('answer', {
      answer,
      from: socket.id
    });
  });

  // WebRTC signaling: ICE candidate
  socket.on('ice-candidate', ({ candidate, to }: IceCandidateData) => {
    console.log('Sending ICE candidate from', socket.id, 'to', to);
    io.to(to).emit('ice-candidate', {
      candidate,
      from: socket.id
    });
  });

  // Leave room
  socket.on('leave-room', () => {
    handleDisconnect(socket);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    handleDisconnect(socket);
  });

  // Toggle video
  socket.on('toggle-video', ({ roomId, enabled }: ToggleMediaData) => {
    socket.to(roomId).emit('user-video-toggled', {
      socketId: socket.id,
      enabled
    });
  });

  // Toggle audio
  socket.on('toggle-audio', ({ roomId, enabled }: ToggleMediaData) => {
    socket.to(roomId).emit('user-audio-toggled', {
      socketId: socket.id,
      enabled
    });
  });
});

function handleDisconnect(socket: Socket): void {
  const user = users.get(socket.id);
  
  if (user) {
    const { roomId, userId, userName } = user;
    
    // Remove from room
    if (rooms.has(roomId)) {
      rooms.get(roomId)!.delete(socket.id);
      
      // Remove room if empty
      if (rooms.get(roomId)!.size === 0) {
        rooms.delete(roomId);
      }
      
      // Notify others
      socket.to(roomId).emit('user-disconnected', {
        socketId: socket.id,
        userId,
        userName
      });
    }
    
    // Remove user
    users.delete(socket.id);
    
    console.log(`User ${userName} left room ${roomId}`);
  }
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    activeConnections: users.size,
    activeRooms: rooms.size
  });
});

// Get room info
app.get('/room/:roomId', (req: Request, res: Response) => {
  const roomId = req.params.roomId;
  const room = rooms.get(roomId);
  
  if (room) {
    const participants = Array.from(room).map(socketId => {
      const user = users.get(socketId);
      return {
        userId: user?.userId,
        userName: user?.userName
      };
    });
    
    res.json({
      roomId,
      participants,
      count: participants.length
    });
  } else {
    res.json({
      roomId,
      participants: [],
      count: 0
    });
  }
});

server.listen(PORT, () => {
  console.log(`WebRTC Signaling Server is running on port ${PORT}`);
});
