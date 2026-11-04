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
  const [username, setUsername] = useState("");
  const [loginName, setLoginName] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [rooms, setRooms] = useState<string[]>(["general"]);
  const [currentRoom, setCurrentRoom] = useState("general");
  const [newRoom, setNewRoom] = useState("");

  useEffect(() => {
    setUsername(window.localStorage.getItem("group-chat-username") ?? "");
  }, []);

  useEffect(() => {
    if (!username) return;
    const connection = io();
    connection.on("chat:message", (message: Message) => setMessages((current) => [...current, message]));
    connection.on("presence:count", (count: number) => setOnlineCount(count));
    connection.on("presence:event", (event: PresenceEvent) => setMessages((current) => [
      ...current, { id: Date.now(), author: "시스템", text: event.text, time: "방금 전" }
    ]));
    connection.on("room:list", (roomList: string[]) => setRooms(roomList));
    connection.on("room:joined", (room: string) => { setCurrentRoom(room); setMessages([]); });
    connection.emit("room:list");
    setSocket(connection);
    return () => { connection.disconnect(); };
  }, [username]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = loginName.trim();
    if (!name) return;
    window.localStorage.setItem("group-chat-username", name);
    setUsername(name);
    setLoginName("");
  }

  function joinRoom(room: string) { socket?.emit("room:join", room); }
  function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newRoom.trim();
    if (!name) return;
    socket?.emit("room:create", name);
    setNewRoom("");
  }

  function handleLogout() {
    window.localStorage.removeItem("group-chat-username");
    setUsername("");
    socket?.disconnect();
    setSocket(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    socket?.emit("chat:message", { author: username, text });
    setDraft("");
  }

  if (!username) return (
    <main className="chat-shell">
      <section className="chat-card" aria-label="로그인">
        <header className="chat-header"><div><p className="eyebrow">GROUP CHAT</p><h1>채팅 시작하기</h1></div></header>
        <form className="message-form" onSubmit={handleLogin}>
          <input value={loginName} onChange={(event) => setLoginName(event.target.value)} placeholder="사용자 이름을 입력하세요" aria-label="사용자 이름" autoFocus />
          <button type="submit">입장</button>
        </form>
      </section>
    </main>
  );

  return (
    <main className="chat-shell">
      <section className="chat-card" aria-label="그룹 채팅">
        <header className="chat-header">
          <div><p className="eyebrow">GROUP CHAT</p><h1>함께 이야기해요</h1></div>
          <div><span className="online-status">● {onlineCount}명 접속 중</span><button className="logout-button" onClick={handleLogout} type="button">로그아웃</button></div>
        </header>
        <div className="room-toolbar">
          <strong>채팅방</strong>
          <div className="room-list">{rooms.map((room) => <button className={room === currentRoom ? "room-button active" : "room-button"} key={room} onClick={() => joinRoom(room)} type="button">#{room}</button>)}</div>
          <form onSubmit={createRoom} className="room-create"><input value={newRoom} onChange={(event) => setNewRoom(event.target.value)} placeholder="새 방 이름" aria-label="새 채팅방 이름" /><button type="submit">만들기</button></form>
        </div>
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
