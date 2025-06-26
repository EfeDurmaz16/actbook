import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, userId } = await request.json()
    const connectionId = params.id

    if (!status || !userId) {
      return NextResponse.json({
        error: 'Status and User ID are required'
      }, { status: 400 })
    }

    if (!['ACCEPTED', 'REJECTED', 'BLOCKED'].includes(status)) {
      return NextResponse.json({
        error: 'Invalid status'
      }, { status: 400 })
    }

    // Get the connection to verify user can update it
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: {
        requester: true,
        receiver: true
      }
    })

    if (!connection) {
      return NextResponse.json({
        error: 'Connection not found'
      }, { status: 404 })
    }

    // Only the receiver can accept/reject, both can block
    if (status !== 'BLOCKED' && connection.receiverId !== userId) {
      return NextResponse.json({
        error: 'Only the receiver can accept or reject connection requests'
      }, { status: 403 })
    }

    if (status === 'BLOCKED' && ![connection.requesterId, connection.receiverId].includes(userId)) {
      return NextResponse.json({
        error: 'You can only block your own connections'
      }, { status: 403 })
    }

    // Update connection status
    const updatedConnection = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: status as any },
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

    // Create notification for the other user if accepted
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
      })
    }

    return NextResponse.json({ connection: updatedConnection })
  } catch (error) {
    console.error('Error updating connection:', error)
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const connectionId = params.id

    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 })
    }

    // Get the connection to verify user can delete it
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId }
    })

    if (!connection) {
      return NextResponse.json({
        error: 'Connection not found'
      }, { status: 404 })
    }

    // Only participants can delete the connection
    if (![connection.requesterId, connection.receiverId].includes(userId)) {
      return NextResponse.json({
        error: 'You can only delete your own connections'
      }, { status: 403 })
    }

    await prisma.connection.delete({
      where: { id: connectionId }
    })

    return NextResponse.json({ message: 'Connection deleted successfully' })
  } catch (error) {
    console.error('Error deleting connection:', error)
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    )
  }
}