import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((request, response) => handle(request, response));
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.join("general");
    io.to("general").emit("presence:count", io.sockets.adapter.rooms.get("general")?.size ?? 0);
    socket.broadcast.to("general").emit("presence:event", { text: "새로운 사용자가 입장했습니다." });
    socket.on("disconnect", () => {
      io.to("general").emit("presence:count", io.sockets.adapter.rooms.get("general")?.size ?? 0);
      io.to("general").emit("presence:event", { text: "사용자가 퇴장했습니다." });
    });
    socket.on("chat:message", (message: { author: string; text: string }) => {
      io.to("general").emit("chat:message", {
        id: Date.now(), author: message.author, text: message.text, time: "방금 전"
      });
    });
  });

  httpServer.listen(3000, () => console.log("> Ready on http://localhost:3000"));
});
