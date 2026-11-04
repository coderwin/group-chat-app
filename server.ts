import { createServer } from "node:http";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((request, response) => handle(request, response));
  const io = new Server(httpServer, { cors: { origin: "*" } });
  type Message = { id: number; author: string; text: string; time: string };
  type Store = { rooms: string[]; messages: Record<string, Message[]> };
  const dataPath = join(process.cwd(), "data", "chat-data.json");
  const initialStore: Store = { rooms: ["general"], messages: { general: [] } };
  const store: Store = existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, "utf8")) : initialStore;
  const rooms = new Set(store.rooms);
  const saveStore = () => { mkdirSync(dirname(dataPath), { recursive: true }); writeFileSync(dataPath, JSON.stringify({ rooms: [...rooms], messages: store.messages }, null, 2)); };

  const emitRoomList = () => io.emit("room:list", [...rooms]);
  const emitPresence = (room: string) => io.to(room).emit("presence:count", io.sockets.adapter.rooms.get(room)?.size ?? 0);

  io.on("connection", (socket) => {
    let currentRoom = "general";
    socket.join(currentRoom);
    emitRoomList();
    emitPresence(currentRoom);
    socket.emit("room:history", store.messages[currentRoom] ?? []);
    socket.broadcast.to(currentRoom).emit("presence:event", { text: "새로운 사용자가 입장했습니다." });
    socket.on("disconnect", () => {
      emitPresence(currentRoom);
      io.to(currentRoom).emit("presence:event", { text: "사용자가 퇴장했습니다." });
    });
    socket.on("room:list", emitRoomList);
    socket.on("room:create", (roomName: string) => {
      const name = roomName.trim().slice(0, 30);
      if (name) { rooms.add(name); store.messages[name] ??= []; saveStore(); emitRoomList(); }
    });
    socket.on("room:join", (roomName: string) => {
      if (!rooms.has(roomName) || roomName === currentRoom) return;
      const previousRoom = currentRoom;
      socket.leave(previousRoom);
      emitPresence(previousRoom);
      currentRoom = roomName;
      socket.join(currentRoom);
      emitPresence(currentRoom);
      socket.emit("room:history", store.messages[currentRoom] ?? []);
      socket.emit("room:joined", currentRoom);
    });
    socket.on("chat:message", (message: { author: string; text: string }) => {
      const savedMessage = {
        id: Date.now(), author: message.author, text: message.text, time: "방금 전"
      };
      store.messages[currentRoom] ??= [];
      store.messages[currentRoom].push(savedMessage);
      saveStore();
      io.to(currentRoom).emit("chat:message", savedMessage);
    });
  });

  httpServer.listen(3000, () => console.log("> Ready on http://localhost:3000"));
});
