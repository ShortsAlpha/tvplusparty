# TV+ Party — sync server

The real-time server behind **TV+ Party**, a browser extension for watching [Turkcell TV+](https://tvplus.com.tr) together. Everyone in a room stays in sync: when one person plays, pauses or seeks, everyone else follows, and when an episode ends the whole room moves to the next one together.

This repo is the server only. The extension connects to it with Socket.IO. The server never touches the video itself; it only relays playback events.

## How it works

- Each watch party is a Socket.IO room, identified by a `roomId`.
- Playback actions from one viewer are relayed to everyone else in the room.
- The server tracks who is in each room and sends the updated list whenever someone joins or leaves. Empty rooms are removed.

## Events

**Client → server**

| Event | Payload | What happens |
|---|---|---|
| `join-room` | `roomId` (string) | Joins the party and broadcasts the updated user list |
| `sync-action` | `{ roomId, type: "PLAY" \| "PAUSE" \| "SEEK", time }` | Relayed to everyone in the room except the sender |
| `change-url` | `{ roomId, newUrl }` | Sent to everyone in the room, including the sender |

**Server → client**

| Event | Payload |
|---|---|
| `room-users` | Array of socket IDs in the room |
| `sync-action` | `{ type, time }` |
| `change-url` | `newUrl` (string) |

**HTTP**

| Route | Response |
|---|---|
| `GET /` | `TV+ Party Server is Running!` |
| `GET /ping` | `pong`, for uptime pingers that keep free hosting awake |

## Run locally

```bash
npm install
npm start
```

The server listens on port `3000`, or on `PORT` if set.

## Client example

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");
const roomId = "movie-night";
const video = document.querySelector("video");

socket.emit("join-room", roomId);

video.addEventListener("pause", () =>
  socket.emit("sync-action", { roomId, type: "PAUSE", time: video.currentTime })
);

socket.on("sync-action", ({ type, time }) => {
  video.currentTime = time;
  if (type === "PLAY") video.play();
  if (type === "PAUSE") video.pause();
});

socket.on("change-url", (url) => (location.href = url));
```

## Tech stack

Node.js, Express 4, Socket.IO 4.

## Limitations

- Room state lives in memory, so restarting the server clears all rooms.
- CORS is open (`*`) so the extension can connect from any page.
- There's no authentication: anyone who knows a room ID can join it.
