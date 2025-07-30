import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../../lib/db'

export async function GET(request, { params }) {
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

    // Check if user has access to the project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { ownerId: user.id },
          { 
            members: {
              some: { userId: user.id }
            }
          },
          { isPublic: true }
        ]
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const notes = await prisma.note.findMany({
      where: {
        projectId: params.id
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({ notes })

  } catch (error) {
    console.error('Project notes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request, { params }) {
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

    // Check if user has permission to create notes in this project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { ownerId: user.id },
          { 
            members: {
              some: { userId: user.id }
            }
          }
        ]
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or insufficient permissions' }, { status: 404 })
    }

    const { title, content } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Note title is required' }, { status: 400 })
    }

    const note = await prisma.note.create({
      data: {
        title: title.trim(),
        content: content || '',
        projectId: params.id,
        authorId: user.id
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'NOTE_CREATED',
        content: `created note "${note.title}"`,
        userId: user.id,
        projectId: params.id
      }
    })

    return NextResponse.json({ note }, { status: 201 })

  } catch (error) {
    console.error('Create note error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
