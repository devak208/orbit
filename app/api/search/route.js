import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../lib/db'

export async function GET(request) {
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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json([])
    }

    const searchTerm = query.trim().toLowerCase()

    // Get user's projects
    const userProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { 
            members: {
              some: { userId: user.id }
            }
          }
        ]
      },
      select: { id: true }
    })

    const projectIds = userProjects.map(p => p.id)

    // Search in parallel
    const [projects, tasks, users] = await Promise.all([
      // Search projects
      prisma.project.findMany({
        where: {
          AND: [
            { id: { in: projectIds } },
            {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          description: true,
          color: true
        },
        take: 5
      }),

      // Search tasks
      prisma.task.findMany({
        where: {
          AND: [
            { projectId: { in: projectIds } },
            {
              OR: [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          ]
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          projectId: true
        },
        take: 5
      }),

      // Search users (team members)
      prisma.user.findMany({
        where: {
          AND: [
            {
              projectMembers: {
                some: {
                  projectId: { in: projectIds }
                }
              }
            },
            {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
                { username: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true
        },
        take: 5
      })
    ])

    // Format results
    const results = [
      ...projects.map(project => ({
        id: project.id,
        type: 'project',
        title: project.name,
        description: project.description,
        color: project.color
      })),
      ...tasks.map(task => ({
        id: task.id,
        type: 'task',
        title: task.title,
        description: task.description,
        projectId: task.projectId,
        status: task.status,
        priority: task.priority
      })),
      ...users.map(user => ({
        id: user.id,
        type: 'user',
        name: user.name,
        title: user.name,
        description: user.email,
        image: user.image,
        username: user.username
      }))
    ]

    return NextResponse.json(results)

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
