import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

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
            lastSeen: true
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
            lastSeen: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ connections })
  } catch (error) {
    console.error('Error fetching connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { requesterId, receiverId } = await request.json()

    if (!requesterId || !receiverId) {
      return NextResponse.json({
        error: 'Requester ID and Receiver ID are required'
      }, { status: 400 })
    }

    if (requesterId === receiverId) {
      return NextResponse.json({
        error: 'Cannot send connection request to yourself'
      }, { status: 400 })
    }

    // Check if connection already exists
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId }
        ]
      }
    })

    if (existingConnection) {
      return NextResponse.json({
        error: 'Connection already exists'
      }, { status: 400 })
    }

    // Create connection request
    const connection = await prisma.connection.create({
      data: {
        requesterId,
        receiverId,
        status: 'PENDING'
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    })

    // Create notification for receiver
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
    })

    return NextResponse.json({ connection }, { status: 201 })
  } catch (error) {
    console.error('Error creating connection:', error)
    return NextResponse.json(
      { error: 'Failed to create connection request' },
      { status: 500 }
    )
  }
}