import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      }
    })

    if (!user) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id
    const updateData = await request.json()
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    const { id, createdAt, password, ...allowedUpdates } = updateData

    // Validate email uniqueness if provided
    if (allowedUpdates.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: allowedUpdates.email,
          id: { not: userId }
        }
      })

      if (existingEmail) {
        return NextResponse.json({
          error: 'Email already exists'
        }, { status: 400 })
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...allowedUpdates,
        updatedAt: new Date()
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
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    // Soft delete by setting isActive to false
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ message: 'User deactivated successfully' })
  } catch (error) {
    console.error('Error deactivating user:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate user' },
      { status: 500 }
    )
  }
}