import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/db'

export async function POST(request) {
  try {
    const { name, email, password } = await request.json()
    
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email and password are required' }, 
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      )
    }

    // Generate username from email
    let username = email.split('@')[0].toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
    
    // Check if username exists, if so append random number
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    })
    
    if (existingUsername) {
      username = `${username}${Math.floor(Math.random() * 10000)}`
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      user,
      message: 'User created successfully. You can now sign in.'
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
