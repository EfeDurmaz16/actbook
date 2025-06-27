"use client"

import type React from "react"
import { createContext, useState, useContext, useEffect } from "react"

type User = {
  username: string
  password: string
}

type AuthContextType = {
  isLoggedIn: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  signup: (username: string, password: string) => Promise<boolean>
  username: string | null
  userId: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const storedUsername = localStorage.getItem("username")
    const storedUserId = localStorage.getItem("userId")
    const storedUsers = localStorage.getItem("users")
    if (storedUsername && storedUserId) {
      setIsLoggedIn(true)
      setUsername(storedUsername)
      setUserId(storedUserId)
    }
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers))
    }
  }, [])

  const login = async (username: string, password: string) => {
    try {
      // Try to authenticate with the API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsLoggedIn(true)
        setUsername(username)
        setUserId(data.userId)
        localStorage.setItem("username", username)
        localStorage.setItem("userId", data.userId)
        return true
      }
    } catch (error) {
      console.error('Login API error:', error)
    }

    // Fallback to local user checking for development
    const user = users.find((u) => u.username === username && u.password === password)
    if (user) {
      // Find the real user ID from the database users we know about
      const realUserId = await getRealUserIdByUsername(username)
      setIsLoggedIn(true)
      setUsername(username)
      setUserId(realUserId)
      localStorage.setItem("username", username)
      localStorage.setItem("userId", realUserId)
      return true
    }
    return false
  }

  // Helper function to get real user ID from database
  const getRealUserIdByUsername = async (username: string): Promise<string> => {
    try {
      // Try to fetch the user from the database
      const response = await fetch(`/api/users/by-username/${username}`)
      if (response.ok) {
        const data = await response.json()
        return data.user?.id || `user-${Date.now()}`
      }
    } catch (error) {
      console.error('Error fetching user by username:', error)
    }

    // Fallback map for known users (in case API fails)
    const userMap: { [key: string]: string } = {
      'Alice': 'cm80r91io0000fmyc3dd4b09f',
      'Bob': 'cm80r91m60001fmyct49oiuyw', 
      'Charlie': 'cm80r91ny0002fmych61sg1a3',
      'David': 'cm80r91qj0003fmyccwscm3d4',
      'Eve': 'cm80r91ti0004fmycvfuo4c14'
    }
    return userMap[username] || `user-${Date.now()}` // fallback to mock ID if not found
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUsername(null)
    setUserId(null)
    localStorage.removeItem("username")
    localStorage.removeItem("userId")
  }

  const signup = async (username: string, password: string) => {
    try {
      // Try to signup with the API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        // After successful signup, login automatically
        return await login(username, password)
      }
    } catch (error) {
      console.error('Signup API error:', error)
    }

    // Fallback to local user creation for development
    if (users.some((u) => u.username === username)) {
      return false
    }
    const newUser = { username, password }
    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    localStorage.setItem("users", JSON.stringify(updatedUsers))
    
    // Generate a new real user ID (this would be handled by the API in production)
    const mockUserId = `user-${Date.now()}`
    setIsLoggedIn(true)
    setUsername(username)
    setUserId(mockUserId)
    localStorage.setItem("username", username)
    localStorage.setItem("userId", mockUserId)
    return true
  }

  return <AuthContext.Provider value={{ 
    isLoggedIn, 
    isAuthenticated: isLoggedIn, 
    login, 
    logout, 
    signup, 
    username,
    userId 
  }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

