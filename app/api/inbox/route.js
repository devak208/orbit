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

    const items = await prisma.inboxItem.findMany({
      where: { 
        userId: user.id,
        status: { not: 'DELETED' }
      },
      include: {
        reads: {
          where: { userId: user.id }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform items to include isRead flag
    const itemsWithReadStatus = items.map(item => ({
      ...item,
      isRead: item.reads.length > 0,
      reads: undefined // Remove the reads array from response
    }))

    return NextResponse.json({ items: itemsWithReadStatus })

  } catch (error) {
    console.error('Inbox error:', error)
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

    const { action, ids } = await request.json()

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })
    }

    switch (action) {
      case 'mark_read':
        // Create InboxItemRead records for unread items
        for (const id of ids) {
          await prisma.inboxItemRead.upsert({
            where: {
              userId_inboxItemId: {
                userId: user.id,
                inboxItemId: id
              }
            },
            update: {},
            create: {
              userId: user.id,
              inboxItemId: id
            }
          })
        }
        break
      case 'mark_unread':
        // Delete InboxItemRead records
        await prisma.inboxItemRead.deleteMany({
          where: {
            userId: user.id,
            inboxItemId: { in: ids }
          }
        })
        break
      case 'archive':
        await prisma.inboxItem.updateMany({
          where: {
            id: { in: ids },
            userId: user.id
          },
          data: { status: 'ARCHIVED' }
        })
        break
      case 'delete':
        await prisma.inboxItem.updateMany({
          where: {
            id: { in: ids },
            userId: user.id
          },
          data: { status: 'DELETED' }
        })
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Inbox update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
