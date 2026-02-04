const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for extension
        methods: ["GET", "POST"]
    }
});

// Root route for Glitch/Check
app.get('/', (req, res) => {
    res.send('TV+ Party Server is Running!');
});

// Ping endpoint to keep Glitch awake
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// Track users in rooms: { roomId: [socketId, ...] }
const roomsUsers = {};

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join a specific room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);

        // Add to room tracking
        if (!roomsUsers[roomId]) {
            roomsUsers[roomId] = [];
        }
        if (!roomsUsers[roomId].includes(socket.id)) {
            roomsUsers[roomId].push(socket.id);
        }

        // Notify presence
        io.to(roomId).emit('room-users', roomsUsers[roomId]);
    });

    // Relaying Sync Actions (Play/Pause/Seek)
    socket.on('sync-action', (data) => {
        // data: { roomId, type: 'PLAY'|'PAUSE'|'SEEK', time: number }
        const { roomId, ...actionPayload } = data;
        if (roomId) {
            // Broadcast to everyone in the room EXCEPT sender
            socket.to(roomId).emit('sync-action', actionPayload);
            console.log(`Sync action in ${roomId}:`, actionPayload.type);
        }
    });

    // URL Change (Auto-Next)
    socket.on('change-url', (data) => {
        // data: { roomId, newUrl }
        const { roomId, newUrl } = data;
        if (roomId && newUrl) {
            io.to(roomId).emit('change-url', newUrl); // Broadcast to ALL including sender (or sender navigates themselves)
            console.log(`URL change in ${roomId}:`, newUrl);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Remove from all rooms
        for (const roomId in roomsUsers) {
            const index = roomsUsers[roomId].indexOf(socket.id);
            if (index !== -1) {
                roomsUsers[roomId].splice(index, 1);
                io.to(roomId).emit('room-users', roomsUsers[roomId]);
                if (roomsUsers[roomId].length === 0) {
                    delete roomsUsers[roomId];
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
