"use server"

import { revalidatePath } from "next/cache"
import stringSimilarity from "string-similarity-js"
import type { Intent, User, Connection, Activity } from "./types"
import { prisma } from "./db"
import { generateEmbedding, findSimilarContent, cosineSimilarity } from "./semantic-search"

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
      where: { isActive: true },
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
        category: intent.category || undefined,
        location: intent.location || undefined,
        tags: intent.tags,
        isActive: intent.isActive,
        createdAt: intent.createdAt,
      }));
    }

    // Try semantic search first
    try {
      const semanticResults = await findSimilarContent(
        sanitizedQuery,
        dbIntents.map(intent => ({
          id: intent.id,
          text: intent.text,
          embedding: intent.embedding || undefined
        })),
        0.3, // Lower threshold for semantic search
        10
      )

      if (semanticResults.length > 0) {
        console.log("Using semantic search results")
        return semanticResults.map(result => {
          const dbIntent = dbIntents.find(intent => intent.id === result.id)!
          return {
            id: dbIntent.id,
            text: dbIntent.text,
            user: dbIntent.user.username,
            category: dbIntent.category || undefined,
            location: dbIntent.location || undefined,
            tags: dbIntent.tags,
            isActive: dbIntent.isActive,
            createdAt: dbIntent.createdAt,
            similarity: result.similarity,
          }
        })
      }
    } catch (semanticError) {
      console.warn("Semantic search failed, falling back to keyword search:", semanticError)
    }

    // Fallback to keyword-based search
    const queryWords = sanitizedQuery.toLowerCase().split(/\s+/)

    const similarities = dbIntents.map((dbIntent) => {
      const intentWords = dbIntent.text.toLowerCase().split(/\s+/)
      const tagWords = dbIntent.tags.join(' ').toLowerCase().split(/\s+/)
      const locationWords = (dbIntent.location || '').toLowerCase().split(/\s+/)
      const allWords = [...intentWords, ...tagWords, ...locationWords]

      // Calculate exact word matches
      const exactMatches = queryWords.filter((word) => allWords.includes(word)).length

      // Calculate string similarity
      const similarity = stringSimilarity(sanitizedQuery.toLowerCase(), dbIntent.text.toLowerCase())

      // Combine exact matches and string similarity for a final score
      const combinedScore = (exactMatches / queryWords.length) * 0.7 + similarity * 0.3

      return {
        intent: {
          id: dbIntent.id,
          text: dbIntent.text,
          user: dbIntent.user.username,
          category: dbIntent.category || undefined,
          location: dbIntent.location || undefined,
          tags: dbIntent.tags,
          isActive: dbIntent.isActive,
          createdAt: dbIntent.createdAt,
        },
        similarity: combinedScore,
      }
    })

    const results = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)
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

export async function createIntent(
  text: string, 
  username: string, 
  category?: string, 
  location?: string, 
  tags?: string[]
): Promise<{ success: boolean; message: string }> {
  console.log("Creating new intent:", text)

  try {
    if (!text || text.trim().length === 0) {
      console.log("Intent text is empty")
      return { success: false, message: "Intent text cannot be empty" }
    }

    // Sanitize inputs to prevent XSS
    const sanitizedText = sanitizeInput(text.trim());
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedCategory = category ? sanitizeInput(category) : null;
    const sanitizedLocation = location ? sanitizeInput(location) : null;
    const sanitizedTags = tags ? tags.map(tag => sanitizeInput(tag)) : [];

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

    // Generate embedding for semantic search
    let embedding: string | null = null;
    try {
      const embeddingVector = await generateEmbedding(sanitizedText);
      if (embeddingVector.length > 0) {
        embedding = JSON.stringify(embeddingVector);
      }
    } catch (embeddingError) {
      console.warn("Failed to generate embedding:", embeddingError);
    }

    // Create the intent in the database
    const newIntent = await prisma.intent.create({
      data: {
        text: sanitizedText,
        category: sanitizedCategory,
        location: sanitizedLocation,
        tags: sanitizedTags,
        embedding,
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
      where: { isActive: true },
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
      category: intent.category || undefined,
      location: intent.location || undefined,
      tags: intent.tags,
      isActive: intent.isActive,
      createdAt: intent.createdAt,
    }));
    
    console.log("Retrieved intents from database:", intents)
    return intents;
  } catch (error) {
    console.error("Error fetching intents from database:", error);
    return []; // Return empty array in case of error
  }
}

// Connection management functions
export async function sendConnectionRequest(requesterId: string, receiverId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (requesterId === receiverId) {
      return { success: false, message: "Cannot send connection request to yourself" }
    }

    // Check if connection already exists
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId }
        ]
      }
    });

    if (existingConnection) {
      return { success: false, message: "Connection already exists" }
    }

    // Create connection request
    const connection = await prisma.connection.create({
      data: {
        requesterId,
        receiverId,
        status: 'PENDING'
      },
      include: {
        requester: true,
        receiver: true
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'CONNECTION_REQUEST',
        title: 'New Connection Request',
        message: `${connection.requester.firstName || connection.requester.username} sent you a connection request`,
        data: {
          connectionId: connection.id,
          requesterId: requesterId
        }
      }
    });

    revalidatePath("/connections")
    return { success: true, message: "Connection request sent successfully" }
  } catch (error) {
    console.error("Error sending connection request:", error)
    return { success: false, message: "Failed to send connection request" }
  }
}

export async function respondToConnectionRequest(
  connectionId: string, 
  userId: string, 
  status: 'ACCEPTED' | 'REJECTED' | 'BLOCKED'
): Promise<{ success: boolean; message: string }> {
  try {
    // Get the connection to verify user can update it
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: {
        requester: true,
        receiver: true
      }
    });

    if (!connection) {
      return { success: false, message: "Connection not found" }
    }

    // Only the receiver can accept/reject, both can block
    if (status !== 'BLOCKED' && connection.receiverId !== userId) {
      return { success: false, message: "Only the receiver can accept or reject connection requests" }
    }

    if (status === 'BLOCKED' && ![connection.requesterId, connection.receiverId].includes(userId)) {
      return { success: false, message: "You can only block your own connections" }
    }

    // Update connection status
    await prisma.connection.update({
      where: { id: connectionId },
      data: { status: status as any }
    });

    // Create notification if accepted
    if (status === 'ACCEPTED') {
      const notificationUserId = connection.requesterId === userId 
        ? connection.receiverId 
        : connection.requesterId
      
      const notificationUser = connection.requesterId === userId
        ? connection.receiver
        : connection.requester

      await prisma.notification.create({
        data: {
          userId: notificationUserId,
          type: 'CONNECTION_ACCEPTED',
          title: 'Connection Accepted',
          message: `${notificationUser.firstName || notificationUser.username} accepted your connection request`,
          data: {
            connectionId: connection.id,
            userId: userId
          }
        }
      });
    }

    revalidatePath("/connections")
    return { success: true, message: `Connection ${status.toLowerCase()} successfully` }
  } catch (error) {
    console.error("Error responding to connection request:", error)
    return { success: false, message: "Failed to update connection" }
  }
}

export async function getUserConnections(userId: string, status?: string): Promise<Connection[]> {
  try {
    const whereClause = {
      OR: [
        { requesterId: userId },
        { receiverId: userId }
      ],
      ...(status && { status: status as any })
    }

    const connections = await prisma.connection.findMany({
      where: whereClause,
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            location: true,
            isActive: true,
            lastSeen: true,
            createdAt: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            location: true,
            isActive: true,
            lastSeen: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return connections.map(conn => ({
      id: conn.id,
      status: conn.status as any,
      requester: conn.requester as User,
      receiver: conn.receiver as User,
      createdAt: conn.createdAt
    }))
  } catch (error) {
    console.error("Error fetching user connections:", error)
    return []
  }
}

export async function findSimilarUsers(userId: string, interests: string[], location?: string): Promise<User[]> {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        OR: [
          {
            interests: {
              hasSome: interests
            }
          },
          ...(location ? [{ location: { contains: location, mode: 'insensitive' as const } }] : [])
        ]
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        avatar: true,
        location: true,
        interests: true,
        isActive: true,
        lastSeen: true,
        createdAt: true
      },
      take: 20
    })

    return users as User[]
  } catch (error) {
    console.error("Error finding similar users:", error)
    return []
  }
}

