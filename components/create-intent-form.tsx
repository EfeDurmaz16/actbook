"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createIntent } from "@/lib/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/AuthContext"

// Helper function to get CSRF token
async function getCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/csrf');
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return null;
  }
}

export default function CreateIntentForm({
  initialQuery,
  onSuccess,
}: { initialQuery: string; onSuccess?: () => void }) {
  const [intent, setIntent] = useState(initialQuery || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const { username } = useAuth()

  useEffect(() => {
    if (initialQuery !== undefined) {
      setIntent(initialQuery)
    }
    
  }, [initialQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage("")

    if (!intent.trim()) {
      setMessage("Intent cannot be empty")
      setIsSubmitting(false)
      return
    }

    try {
      console.log("Submitting new intent:", intent)
      
      // For server actions, use the action directly
      const result = await createIntent(intent, username || "Anonymous")
      
      // For API routes, use fetch with CSRF token
      // const response = await fetch('/api/intents', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'X-CSRF-Token': csrfToken || '',
      //   },
      //   body: JSON.stringify({
      //     text: intent,
      //     username: username || "Anonymous"
      //   }),
      // });
      // const result = await response.json();
      
      if (result.success) {
        setIntent("")
        setMessage("Intent created successfully!")
        console.log("Intent created successfully")
        if (onSuccess) {
          onSuccess()
        }
      } else {
        setMessage(result.message || "Failed to create intent. Please try again.")
        console.error("Failed to create intent:", result.message)
      }
    } catch (error) {
      console.error("Error creating intent:", error)
      setMessage("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="text"
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        placeholder="Describe your intent..."
        className="w-full"
        disabled={isSubmitting}
      />
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Intent"}
      </Button>
      {message && (
        <p className={`text-sm ${message.includes("successfully") ? "text-green-600" : "text-red-600"}`}>{message}</p>
      )}
    </form>
  )
}

