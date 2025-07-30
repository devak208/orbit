import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../lib/db'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.notification.count({
        where: { 
          userId: user.id,
          isRead: false
        }
      })
    ])

    return NextResponse.json({ notifications, unreadCount })

  } catch (error) {
    console.error('Notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { notificationIds, markAsRead } = await request.json()

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 })
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: user.id
      },
      data: {
        isRead: markAsRead !== false
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Update notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
