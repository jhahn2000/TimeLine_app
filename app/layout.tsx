import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "여행기록 | 사진과 동선을 한곳에",
  description: "여행 사진, 동선, 일지, 맛집과 숙소를 한곳에 기록하는 여행 웹앱",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
