import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Group Chat App",
  description: "실시간 그룹 채팅 앱"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
