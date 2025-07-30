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

    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: user.id
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        labels: {
          include: {
            label: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ tasks })

  } catch (error) {
    console.error('My tasks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
