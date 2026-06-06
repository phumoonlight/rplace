import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "r/place clone",
  description: "A collaborative pixel canvas",
};

type RootLayoutProps = Readonly<{ children: React.ReactNode }>;

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;
