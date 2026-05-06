import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Vehicle Classification Tol | YOLOv8",
  description:
    "Sistem klasifikasi golongan kendaraan tol secara real-time menggunakan YOLOv8 dan FastAPI.",
  keywords: ["klasifikasi kendaraan", "tol", "YOLOv8", "AI", "object detection"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
