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

export async function searchIntents(query: string, page: number = 1, limit: number = 5, excludeUserId?: string): Promise<{ intents: Intent[]; totalCount: number; hasMore: boolean }> {
  console.log("Searching intents for query:", query, "excluding user:", excludeUserId)

  try {
    // Sanitize the search query
    const sanitizedQuery = sanitizeInput(query || "");
    
    // Get all intents from database for similarity search, excluding current user if provided
    const dbIntents = await prisma.intent.findMany({
      where: { 
        isActive: true,
        ...(excludeUserId && { userId: { not: excludeUserId } })
      },
      include: {
        user: true,
      },
    });

    if (!sanitizedQuery) {
      console.log("Empty query, returning all intents with pagination")
      const offset = (page - 1) * limit
      const paginatedIntents = dbIntents.slice(offset, offset + limit)
      
      const transformedIntents = paginatedIntents.map((intent) => ({
        id: intent.id,
        text: intent.text,
        user: intent.user.username,
        userId: intent.user.id,
        category: intent.category || undefined,
        location: intent.location || undefined,
        tags: intent.tags,
        isActive: intent.isActive,
        createdAt: intent.createdAt,
      }));
      
      return {
        intents: transformedIntents,
        totalCount: dbIntents.length,
        hasMore: offset + limit < dbIntents.length
      };
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
        const offset = (page - 1) * limit
        const paginatedResults = semanticResults.slice(offset, offset + limit)
        
        const transformedResults = paginatedResults.map(result => {
          const dbIntent = dbIntents.find(intent => intent.id === result.id)!
          return {
            id: dbIntent.id,
            text: dbIntent.text,
            user: dbIntent.user.username,
            userId: dbIntent.user.id,
            category: dbIntent.category || undefined,
            location: dbIntent.location || undefined,
            tags: dbIntent.tags,
            isActive: dbIntent.isActive,
            createdAt: dbIntent.createdAt,
            similarity: result.similarity,
          }
        })
        
        return {
          intents: transformedResults,
          totalCount: semanticResults.length,
          hasMore: offset + limit < semanticResults.length
        };
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
          userId: dbIntent.user.id,
          category: dbIntent.category || undefined,
          location: dbIntent.location || undefined,
          tags: dbIntent.tags,
          isActive: dbIntent.isActive,
          createdAt: dbIntent.createdAt,
        },
        similarity: combinedScore,
      }
    })

    const allResults = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .map((item) => ({
        ...item.intent,
        similarity: item.similarity,
      }))

    const offset = (page - 1) * limit
    const paginatedResults = allResults.slice(offset, offset + limit)

    console.log("Search results:", paginatedResults)
    return {
      intents: paginatedResults,
      totalCount: allResults.length,
      hasMore: offset + limit < allResults.length
    }
  } catch (error) {
    console.error("Error in database search:", error)
    return { intents: [], totalCount: 0, hasMore: false }
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

export async function getAllIntents(excludeUserId?: string): Promise<Intent[]> {
  console.log("Getting all intents from database", excludeUserId ? `excluding user: ${excludeUserId}` : "")
  
  try {
    const dbIntents = await prisma.intent.findMany({
      where: { 
        isActive: true,
        ...(excludeUserId && { userId: { not: excludeUserId } })
      },
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
      userId: intent.user.id,
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

// Friend management functions
export async function addFriend(userId: string, friendId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log("addFriend called with:", { userId, friendId })
    
    if (userId === friendId) {
      return { success: false, message: "Cannot add yourself as friend" }
    }

    // Check if both users exist in the database
    const [requester, receiver] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } }),
      prisma.user.findUnique({ where: { id: friendId }, select: { id: true, username: true } })
    ])
    
    console.log("Users found:", { requester, receiver })
    
    if (!requester) {
      console.error("Requester not found in database:", userId)
      return { success: false, message: "Your user account not found" }
    }
    
    if (!receiver) {
      console.error("Receiver not found in database:", friendId)
      return { success: false, message: "Target user not found" }
    }

    // Check if connection already exists
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId: friendId },
          { requesterId: friendId, receiverId: userId }
        ]
      }
    })

    if (existingConnection) {
      if (existingConnection.status === 'ACCEPTED') {
        return { success: false, message: "Already friends" }
      } else if (existingConnection.status === 'PENDING') {
        return { success: false, message: "Friend request already sent" }
      } else if (existingConnection.status === 'BLOCKED') {
        return { success: false, message: "Cannot add this user" }
      }
    }

    // Send friend request (create connection)
    const result = await sendConnectionRequest(userId, friendId)
    return result
  } catch (error) {
    console.error("Error adding friend:", error)
    return { success: false, message: "Failed to send friend request" }
  }
}

export async function removeFriend(userId: string, friendId: string): Promise<{ success: boolean; message: string }> {
  try {
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId: friendId },
          { requesterId: friendId, receiverId: userId }
        ],
        status: 'ACCEPTED'
      }
    })

    if (!connection) {
      return { success: false, message: "Not friends with this user" }
    }

    await prisma.connection.delete({
      where: { id: connection.id }
    })

    revalidatePath("/connections")
    revalidatePath("/profile")
    return { success: true, message: "Friend removed successfully" }
  } catch (error) {
    console.error("Error removing friend:", error)
    return { success: false, message: "Failed to remove friend" }
  }
}

export async function getFriends(userId: string): Promise<User[]> {
  try {
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { receiverId: userId }
        ],
        status: 'ACCEPTED'
      },
      include: {
        requester: {
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
          }
        },
        receiver: {
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
          }
        }
      }
    })

    // Extract the friend (the other user in each connection)
    const friends = connections.map(conn => {
      return conn.requesterId === userId ? conn.receiver : conn.requester
    })

    return friends as User[]
  } catch (error) {
    console.error("Error fetching friends:", error)
    return []
  }
}

export async function getUserActivities(userId: string): Promise<Intent[]> {
  try {
    const activities = await prisma.intent.findMany({
      where: {
        userId: userId,
        isActive: true
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return activities.map(activity => ({
      id: activity.id,
      text: activity.text,
      user: activity.user.username,
      userId: activity.user.id,
      category: activity.category || undefined,
      location: activity.location || undefined,
      tags: activity.tags,
      isActive: activity.isActive,
      createdAt: activity.createdAt
    }))
  } catch (error) {
    console.error("Error fetching user activities:", error)
    return []
  }
}

// Check connection status between two users
export async function getConnectionStatus(userId1: string, userId2: string): Promise<{
  status: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked'
  connectionId?: string
}> {
  try {
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userId1, receiverId: userId2 },
          { requesterId: userId2, receiverId: userId1 }
        ]
      }
    })

    if (!connection) {
      return { status: 'none' }
    }

    if (connection.status === 'ACCEPTED') {
      return { status: 'friends', connectionId: connection.id }
    }

    if (connection.status === 'BLOCKED') {
      return { status: 'blocked', connectionId: connection.id }
    }

    if (connection.status === 'PENDING') {
      if (connection.requesterId === userId1) {
        return { status: 'pending_sent', connectionId: connection.id }
      } else {
        return { status: 'pending_received', connectionId: connection.id }
      }
    }

    return { status: 'none' }
  } catch (error) {
    console.error("Error checking connection status:", error)
    return { status: 'none' }
  }
}

// Get pending friend requests for a user
export async function getPendingRequests(userId: string): Promise<Connection[]> {
  try {
    const connections = await prisma.connection.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING'
      },
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
            interests: true,
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
            interests: true,
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
    console.error("Error fetching pending requests:", error)
    return []
  }
}

// Get sent friend requests for a user
export async function getSentRequests(userId: string): Promise<Connection[]> {
  try {
    const connections = await prisma.connection.findMany({
      where: {
        requesterId: userId,
        status: 'PENDING'
      },
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
            interests: true,
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
            interests: true,
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
    console.error("Error fetching sent requests:", error)
    return []
  }
}

