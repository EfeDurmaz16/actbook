import "./globals.css"
import type { Metadata } from "next"
import { Space_Mono } from "next/font/google"
import type { ReactNode } from "react"
import { AuthProvider } from "@/lib/AuthContext"
import AuthMenu from "@/components/AuthMenu"

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
})

export const metadata: Metadata = {
  title: "ActBook",
  description: "Find and share intents with others",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
  openGraph: {
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "ActBook",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`${spaceMono.variable} font-mono bg-gray-100 min-h-screen`}>
        <AuthProvider>
          <AuthMenu />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

