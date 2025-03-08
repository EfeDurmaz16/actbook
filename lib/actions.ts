"use server"

import { revalidatePath } from "next/cache"
import stringSimilarity from "string-similarity-js"
import type { Intent } from "./types"
import { prisma } from "./db"

// Helper function to sanitize input and prevent XSS
function sanitizeInput(input: string): string {
  // Basic sanitization: Replace potentially dangerous characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function searchIntents(query: string): Promise<Intent[]> {
  console.log("Searching intents for query:", query)

  try {
    // Sanitize the search query
    const sanitizedQuery = sanitizeInput(query || "");
    
    // Get all intents from database for similarity search
    const dbIntents = await prisma.intent.findMany({
      include: {
        user: true,
      },
    });

    if (!sanitizedQuery) {
      console.log("Empty query, returning all intents")
      // Transform to the expected format
      return dbIntents.map((intent) => ({
        id: intent.id,
        text: intent.text,
        user: intent.user.username,
      }));
    }

    const queryWords = sanitizedQuery.toLowerCase().split(/\s+/)

    const similarities = dbIntents.map((dbIntent) => {
      const intentWords = dbIntent.text.toLowerCase().split(/\s+/)

      // Calculate exact word matches
      const exactMatches = queryWords.filter((word) => intentWords.includes(word)).length

      // Calculate string similarity
      const similarity = stringSimilarity(sanitizedQuery.toLowerCase(), dbIntent.text.toLowerCase())

      // Combine exact matches and string similarity for a final score
      const combinedScore = (exactMatches / queryWords.length) * 0.7 + similarity * 0.3

      return {
        intent: {
          id: dbIntent.id,
          text: dbIntent.text,
          user: dbIntent.user.username,
        },
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
    console.error("Error in database search:", error)
    return [] // Return empty array in case of error
  }
}

export async function createIntent(text: string, username: string): Promise<{ success: boolean; message: string }> {
  console.log("Creating new intent:", text)

  try {
    if (!text || text.trim().length === 0) {
      console.log("Intent text is empty")
      return { success: false, message: "Intent text cannot be empty" }
    }

    // Sanitize inputs to prevent XSS
    const sanitizedText = sanitizeInput(text.trim());
    const sanitizedUsername = sanitizeInput(username);

    // Find the user by username
    let user = await prisma.user.findUnique({
      where: { username: sanitizedUsername },
    });

    // If user doesn't exist, create one
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: sanitizedUsername,
          password: 'temporary', // This should be handled properly in a real application
        },
      });
    }

    // Create the intent in the database
    const newIntent = await prisma.intent.create({
      data: {
        text: sanitizedText,
        userId: user.id,
      },
      include: {
        user: true,
      },
    });

    console.log("New intent created successfully in database:", newIntent)

    revalidatePath("/search")
    return { success: true, message: "Intent created successfully" }
  } catch (error) {
    console.error("Error creating new intent:", error)
    return { success: false, message: "Failed to create intent. Please try again." }
  }
}

export async function getAllIntents(): Promise<Intent[]> {
  console.log("Getting all intents from database")
  
  try {
    const dbIntents = await prisma.intent.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    // Transform to the expected format
    const intents = dbIntents.map((intent) => ({
      id: intent.id,
      text: intent.text,
      user: intent.user.username,
    }));
    
    console.log("Retrieved intents from database:", intents)
    return intents;
  } catch (error) {
    console.error("Error fetching intents from database:", error);
    return []; // Return empty array in case of error
  }
}

