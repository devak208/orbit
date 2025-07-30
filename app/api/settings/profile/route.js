import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../lib/db'

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

    const { name, username, bio, image } = await request.json()

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,
        username: username || user.username,
        bio: bio || user.bio,
        image: image || user.image
      }
    })

    return NextResponse.json({ user: updatedUser })

  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
