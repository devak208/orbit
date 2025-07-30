import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

export async function GET() {
  try {
    // Get all invitations from database
    const allInvitations = await prisma.invitation.findMany({
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    console.log('All invitations in database:', allInvitations)

    return NextResponse.json({ 
      count: allInvitations.length,
      invitations: allInvitations 
    })

  } catch (error) {
    console.error('Debug invitations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
