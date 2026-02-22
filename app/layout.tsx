import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Jeoprompty!",
  description: "Prompt Jeopardy party game powered by GPT-5 Nano."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
