import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import stringSimilarity from "string-similarity-js";
import { csrfProtection } from "@/lib/csrf";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  try {
    if (!query) {
      // Get all intents ordered by creation date (newest first)
      const allIntents = await prisma.intent.findMany({
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      });

      // Transform to the expected format
      const intents = allIntents.map((intent) => ({
        id: intent.id,
        text: intent.text,
        user: intent.user.username,
      }));

      return NextResponse.json({ intents });
    }

    // Get all intents for similarity search
    const allIntents = await prisma.intent.findMany({
      include: {
        user: true,
      },
    });

    const queryWords = query.toLowerCase().split(/\s+/);

    const similarities = allIntents.map((dbIntent) => {
      const intentWords = dbIntent.text.toLowerCase().split(/\s+/);

      // Calculate exact word matches
      const exactMatches = queryWords.filter((word) =>
        intentWords.includes(word)
      ).length;

      // Calculate string similarity
      const similarity = stringSimilarity(
        query.toLowerCase(),
        dbIntent.text.toLowerCase()
      );

      // Combine exact matches and string similarity for a final score
      const combinedScore =
        (exactMatches / queryWords.length) * 0.7 + similarity * 0.3;

      return {
        intent: {
          id: dbIntent.id,
          text: dbIntent.text,
          user: dbIntent.user.username,
        },
        similarity: combinedScore,
      };
    });

    const results = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map((item) => ({
        ...item.intent,
        similarity: item.similarity,
      }));

    return NextResponse.json({ intents: results });
  } catch (error) {
    console.error("Error fetching intents:", error);
    return NextResponse.json(
      { error: "Failed to fetch intents" },
      { status: 500 }
    );
  }
}

// Original POST handler
async function handlePost(request: NextRequest) {
  try {
    const { text, username } = await request.json();

    if (!text || !username) {
      return NextResponse.json(
        { error: "Text and username are required" },
        { status: 400 }
      );
    }

    // Basic sanitization
    const sanitizedText = text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const sanitizedUsername = username
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

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

    // Create the intent
    const newIntent = await prisma.intent.create({
      data: {
        text: sanitizedText,
        userId: user.id,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({
      success: true,
      intent: {
        id: newIntent.id,
        text: newIntent.text,
        user: newIntent.user.username,
      },
    });
  } catch (error) {
    console.error("Error creating intent:", error);
    return NextResponse.json(
      { error: "Failed to create intent" },
      { status: 500 }
    );
  }
}

// Apply CSRF protection to the POST handler
export const POST = csrfProtection(handlePost); 