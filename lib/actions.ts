"use server"

import { revalidatePath } from "next/cache"
import stringSimilarity from "string-similarity-js"
import type { Intent } from "./types"

const intents: Intent[] = [
  { id: "1", text: "Looking for a new game to play", user: "Alice" },
  { id: "2", text: "Need an easy meal to cook", user: "Bob" },
  { id: "3", text: "Searching for a good book to read", user: "Charlie" },
  { id: "4", text: "Want to learn a new programming language", user: "David" },
  { id: "5", text: "Seeking recommendations for a weekend getaway", user: "Eve" },
  { id: "6", text: "Looking for a new hobby to try", user: "Frank" },
  { id: "7", text: "Need tips for improving productivity", user: "Grace" },
  { id: "8", text: "Searching for a good workout routine", user: "Henry" },
  { id: "9", text: "Want to start a vegetable garden", user: "Ivy" },
  { id: "10", text: "Looking for volunteer opportunities in my area", user: "Jack" },
  { id: "11", text: "Need advice on adopting a pet", user: "Kate" },
  { id: "12", text: "Searching for a new podcast to listen to", user: "Liam" },
  { id: "13", text: "Want to learn how to meditate", user: "Mia" },
  { id: "14", text: "Looking for tips on reducing plastic waste", user: "Noah" },
  { id: "15", text: "Need ideas for a creative project", user: "Olivia" },
]

export async function searchIntents(query: string): Promise<Intent[]> {
  console.log("Searching intents for query:", query)
  console.log("Current intents:", intents)

  try {
    if (!query) {
      console.log("Empty query, returning all intents")
      return intents
    }

    const queryWords = query.toLowerCase().split(/\s+/)

    const similarities = intents.map((intent) => {
      const intentWords = intent.text.toLowerCase().split(/\s+/)

      // Calculate exact word matches
      const exactMatches = queryWords.filter((word) => intentWords.includes(word)).length

      // Calculate string similarity
      const similarity = stringSimilarity(query.toLowerCase(), intent.text.toLowerCase())

      // Combine exact matches and string similarity for a final score
      const combinedScore = (exactMatches / queryWords.length) * 0.7 + similarity * 0.3

      return {
        intent,
        similarity: combinedScore,
      }
    })

    const results = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map((item) => ({
        ...item.intent,
        similarity: item.similarity,
      }))

    console.log("Search results:", results)
    return results
  } catch (error) {
    console.error("Error in semantic search:", error)
    return intents // Return all intents as fallback
  }
}

export async function createIntent(text: string, username: string): Promise<{ success: boolean; message: string }> {
  console.log("Creating new intent:", text)
  console.log("Current intents before creation:", intents)

  try {
    if (!text || text.trim().length === 0) {
      console.log("Intent text is empty")
      return { success: false, message: "Intent text cannot be empty" }
    }

    const newIntent: Intent = {
      id: (intents.length + 1).toString(),
      text: text.trim(),
      user: username,
    }
    intents.push(newIntent)

    console.log("New intent created successfully:", newIntent)
    console.log("Updated intents array:", intents)

    revalidatePath("/search")
    return { success: true, message: "Intent created successfully" }
  } catch (error) {
    console.error("Error creating new intent:", error)
    return { success: false, message: "Failed to create intent. Please try again." }
  }
}

export async function getAllIntents(): Promise<Intent[]> {
  console.log("Getting all intents")
  console.log("Current intents:", intents)
  return intents
}

