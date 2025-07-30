import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../lib/db'

export async function GET(request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Search for users by email or name
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            email: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      },
      take: 10 // Limit to 10 results
    })

    return NextResponse.json({ users })

  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
