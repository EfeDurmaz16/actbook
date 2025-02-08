"use client"

import { useAuth } from "@/lib/AuthContext"
import { Button } from "@/components/ui/button"

export default function AuthStatus() {
  const { isLoggedIn, username, logout } = useAuth()

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="mb-4 text-center">
      <p>Logged in as: {username}</p>
      <Button onClick={logout} variant="outline" className="mt-2">
        Log Out
      </Button>
    </div>
  )
}

