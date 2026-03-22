import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // WebSocket Server setup
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const wss = new WebSocketServer({ server });

  // Map of roomCode -> Set of WebSockets
  const rooms = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws) => {
    let currentRoom: string | null = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "join": {
            const { roomCode } = message;
            if (currentRoom) {
              rooms.get(currentRoom)?.delete(ws);
            }
            currentRoom = roomCode;
            if (!rooms.has(roomCode)) {
              rooms.set(roomCode, new Set());
            }
            rooms.get(roomCode)!.add(ws);
            
            // Notify others in the room
            const roomClients = rooms.get(roomCode)!;
            roomClients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "peer_joined", count: roomClients.size }));
              }
            });
            ws.send(JSON.stringify({ type: "joined", count: roomClients.size }));
            break;
          }

          case "signal": {
            if (currentRoom && rooms.has(currentRoom)) {
              rooms.get(currentRoom)!.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({ type: "signal", data: message.data, from: message.from }));
                }
              });
            }
            break;
          }

          case "chat": {
            if (currentRoom && rooms.has(currentRoom)) {
              rooms.get(currentRoom)!.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({ type: "chat", text: message.text, sender: message.sender }));
                }
              });
            }
            break;
          }
        }
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    });

    ws.on("close", () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const roomClients = rooms.get(currentRoom)!;
        roomClients.delete(ws);
        if (roomClients.size === 0) {
          rooms.delete(currentRoom);
        } else {
          roomClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "peer_left", count: roomClients.size }));
            }
          });
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

startServer();
