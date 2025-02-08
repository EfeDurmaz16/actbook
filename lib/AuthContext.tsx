"use client"

import type React from "react"
import { createContext, useState, useContext, useEffect } from "react"

type User = {
  username: string
  password: string
}

type AuthContextType = {
  isLoggedIn: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
  signup: (username: string, password: string) => boolean
  username: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const storedUsername = localStorage.getItem("username")
    const storedUsers = localStorage.getItem("users")
    if (storedUsername) {
      setIsLoggedIn(true)
      setUsername(storedUsername)
    }
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers))
    }
  }, [])

  const login = (username: string, password: string) => {
    const user = users.find((u) => u.username === username && u.password === password)
    if (user) {
      setIsLoggedIn(true)
      setUsername(username)
      localStorage.setItem("username", username)
      return true
    }
    return false
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUsername(null)
    localStorage.removeItem("username")
  }

  const signup = (username: string, password: string) => {
    if (users.some((u) => u.username === username)) {
      return false
    }
    const newUser = { username, password }
    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    localStorage.setItem("users", JSON.stringify(updatedUsers))
    setIsLoggedIn(true)
    setUsername(username)
    localStorage.setItem("username", username)
    return true
  }

  return <AuthContext.Provider value={{ isLoggedIn, login, logout, signup, username }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

