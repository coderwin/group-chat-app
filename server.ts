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
    socket.on("chat:message", (message: { author: string; text: string }) => {
      io.to("general").emit("chat:message", {
        id: Date.now(), author: message.author, text: message.text, time: "방금 전"
      });
    });
  });

  httpServer.listen(3000, () => console.log("> Ready on http://localhost:3000"));
});
