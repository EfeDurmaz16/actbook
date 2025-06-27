"use client"

import { useState } from "react"
import { useAuth } from "@/lib/AuthContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { User, LogOut } from "lucide-react"

export default function AuthMenu() {
  const { isLoggedIn, username, login, logout, signup } = useAuth()
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [showSignupForm, setShowSignupForm] = useState(false)
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupUsername, setSignupUsername] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loginUsername.trim() && loginPassword.trim()) {
      const success = await login(loginUsername, loginPassword)
      if (success) {
        setShowLoginForm(false)
        setLoginUsername("")
        setLoginPassword("")
        setError("")
      } else {
        setError("Invalid username or password")
      }
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (signupUsername.trim() && signupPassword.trim()) {
      const success = await signup(signupUsername, signupPassword)
      if (success) {
        setShowSignupForm(false)
        setSignupUsername("")
        setSignupPassword("")
        setError("")
      } else {
        setError("Username already exists")
      }
    }
  }

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-10 h-10 rounded-full p-0">
            <Avatar>
              <AvatarFallback>{isLoggedIn ? username?.charAt(0).toUpperCase() : <User />}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isLoggedIn ? (
            <>
              <DropdownMenuItem disabled>{username}</DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => setShowLoginForm(true)}>Log in</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowSignupForm(true)}>Sign up</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {showLoginForm && !isLoggedIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <form onSubmit={handleLogin} className="bg-white p-6 rounded-lg space-y-4">
            <h2 className="text-xl font-bold">Log In</h2>
            <input
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="Username"
              className="w-full p-2 border rounded"
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-2 border rounded"
            />
            {error && <p className="text-red-500">{error}</p>}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowLoginForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Log In</Button>
            </div>
          </form>
        </div>
      )}
      {showSignupForm && !isLoggedIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <form onSubmit={handleSignup} className="bg-white p-6 rounded-lg space-y-4">
            <h2 className="text-xl font-bold">Sign Up</h2>
            <input
              type="text"
              value={signupUsername}
              onChange={(e) => setSignupUsername(e.target.value)}
              placeholder="Username"
              className="w-full p-2 border rounded"
            />
            <input
              type="password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-2 border rounded"
            />
            {error && <p className="text-red-500">{error}</p>}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowSignupForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Sign Up</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

