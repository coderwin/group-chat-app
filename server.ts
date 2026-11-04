import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((request, response) => handle(request, response));
  const io = new Server(httpServer, { cors: { origin: "*" } });
  const rooms = new Set(["general"]);

  const emitRoomList = () => io.emit("room:list", [...rooms]);
  const emitPresence = (room: string) => io.to(room).emit("presence:count", io.sockets.adapter.rooms.get(room)?.size ?? 0);

  io.on("connection", (socket) => {
    let currentRoom = "general";
    socket.join(currentRoom);
    emitRoomList();
    emitPresence(currentRoom);
    socket.broadcast.to(currentRoom).emit("presence:event", { text: "새로운 사용자가 입장했습니다." });
    socket.on("disconnect", () => {
      emitPresence(currentRoom);
      io.to(currentRoom).emit("presence:event", { text: "사용자가 퇴장했습니다." });
    });
    socket.on("room:list", emitRoomList);
    socket.on("room:create", (roomName: string) => {
      const name = roomName.trim().slice(0, 30);
      if (name) { rooms.add(name); emitRoomList(); }
    });
    socket.on("room:join", (roomName: string) => {
      if (!rooms.has(roomName) || roomName === currentRoom) return;
      const previousRoom = currentRoom;
      socket.leave(previousRoom);
      emitPresence(previousRoom);
      currentRoom = roomName;
      socket.join(currentRoom);
      emitPresence(currentRoom);
      socket.emit("room:joined", currentRoom);
    });
    socket.on("chat:message", (message: { author: string; text: string }) => {
      io.to(currentRoom).emit("chat:message", {
        id: Date.now(), author: message.author, text: message.text, time: "방금 전"
      });
    });
  });

  httpServer.listen(3000, () => console.log("> Ready on http://localhost:3000"));
});
