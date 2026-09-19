import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"Delevry DZ | منصة التوصيل",description:"منصة إدارة شركة التوصيل وتتبع الطرود"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>}