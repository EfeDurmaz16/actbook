import "./globals.css"
import type { Metadata } from "next"
import { Space_Mono } from "next/font/google"
import type { ReactNode } from "react"
import { AuthProvider } from "@/lib/AuthContext"
import AuthMenu from "@/components/AuthMenu"
import { Navigation } from "@/components/Navigation"

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
})

export const metadata: Metadata = {
  title: "ActBook - Connect Through Activities",
  description: "Connect with people based on shared activities and interests",
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
          <div className="min-h-screen bg-background">
            <header className="border-b bg-white">
              <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold">ActBook</h1>
                <div className="flex items-center space-x-4">
                  <Navigation />
                  <AuthMenu />
                </div>
              </div>
            </header>
            <main>
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}

