import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmbedding } from '@/lib/semantic-search'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const excludeUserId = searchParams.get('excludeUserId')
    const limit = parseInt(searchParams.get('limit') || '20')

    let whereClause: any = {
      isActive: true
    }

    if (excludeUserId) {
      whereClause.id = {
        not: excludeUserId
      }
    }

    if (search) {
      whereClause.OR = [
        {
          username: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          firstName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          bio: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          location: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]
    }

    const users = await prisma.user.findMany({
      where: whereClause,
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
        createdAt: true,
        _count: {
          select: {
            intents: true,
            sentConnections: {
              where: { status: 'ACCEPTED' }
            },
            receivedConnections: {
              where: { status: 'ACCEPTED' }
            }
          }
        }
      },
      take: limit,
      orderBy: {
        lastSeen: 'desc'
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()
    const { username, email, password, firstName, lastName, bio, location, interests } = userData

    if (!username || !password) {
      return NextResponse.json({
        error: 'Username and password are required'
      }, { status: 400 })
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json({
        error: 'Username already exists'
      }, { status: 400 })
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      })

      if (existingEmail) {
        return NextResponse.json({
          error: 'Email already exists'
        }, { status: 400 })
      }
    }

    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        password, // In a real app, this should be hashed
        firstName: firstName || null,
        lastName: lastName || null,
        bio: bio || null,
        location: location || null,
        interests: interests || []
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
      }
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}