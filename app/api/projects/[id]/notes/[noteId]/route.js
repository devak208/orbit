import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../../../../lib/db'

export async function PATCH(request, { params }) {
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

    // Check if user has permission to edit notes in this project
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

    const updatedNote = await prisma.note.update({
      where: {
        id: params.noteId,
        projectId: params.id
      },
      data: {
        ...(title && { title: title.trim() }),
        ...(content !== undefined && { content })
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
        type: 'NOTE_UPDATED',
        content: `updated note "${updatedNote.title}"`,
        userId: user.id,
        projectId: params.id
      }
    })

    return NextResponse.json({ note: updatedNote })

  } catch (error) {
    console.error('Update note error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
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

    // Check if user has permission to delete notes in this project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { ownerId: user.id },
          { 
            members: {
              some: {
                userId: user.id,
                role: { in: ['OWNER', 'ADMIN'] }
              }
            }
          }
        ]
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or insufficient permissions' }, { status: 404 })
    }

    const note = await prisma.note.findUnique({
      where: {
        id: params.noteId,
        projectId: params.id
      }
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Create activity log before deletion
    await prisma.activity.create({
      data: {
        type: 'NOTE_DELETED',
        content: `deleted note "${note.title}"`,
        userId: user.id,
        projectId: params.id
      }
    })

    await prisma.note.delete({
      where: {
        id: params.noteId
      }
    })

    return NextResponse.json({ message: 'Note deleted successfully' })

  } catch (error) {
    console.error('Delete note error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
