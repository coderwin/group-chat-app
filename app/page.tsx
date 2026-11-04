"use client";

import { FormEvent, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type Message = { id: number; author: string; text: string; time: string };
type PresenceEvent = { text: string };

const initialMessages: Message[] = [
  { id: 1, author: "민지", text: "안녕하세요! 채팅방에 오신 것을 환영해요.", time: "오전 10:20" },
  { id: 2, author: "준호", text: "곧 실시간 메시지를 연결할 예정입니다.", time: "오전 10:21" }
];

export default function Home() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const connection = io();
    connection.on("chat:message", (message: Message) => setMessages((current) => [...current, message]));
    connection.on("presence:count", (count: number) => setOnlineCount(count));
    connection.on("presence:event", (event: PresenceEvent) => setMessages((current) => [
      ...current, { id: Date.now(), author: "시스템", text: event.text, time: "방금 전" }
    ]));
    setSocket(connection);
    return () => { connection.disconnect(); };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    socket?.emit("chat:message", { author: "나", text });
    setDraft("");
  }

  return (
    <main className="chat-shell">
      <section className="chat-card" aria-label="그룹 채팅">
        <header className="chat-header">
          <div><p className="eyebrow">GROUP CHAT</p><h1>함께 이야기해요</h1></div>
          <span className="online-status">● {onlineCount}명 접속 중</span>
        </header>
        <div className="message-list" aria-live="polite">
          {messages.map((message) => <article className="message" key={message.id}>
            <div className="message-meta"><strong>{message.author}</strong><time>{message.time}</time></div>
            <p>{message.text}</p>
          </article>)}
        </div>
        <form className="message-form" onSubmit={handleSubmit}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="메시지를 입력하세요" aria-label="메시지 입력" />
          <button type="submit">전송</button>
        </form>
      </section>
    </main>
  );
}
