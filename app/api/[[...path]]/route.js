import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "Project Management API" }))
    }

    // Authentication routes
    if (route === '/auth/register' && method === 'POST') {
      const { name, email, password } = await request.json()
      
      if (!name || !email || !password) {
        return handleCORS(NextResponse.json(
          { error: 'Name, email and password are required' }, 
          { status: 400 }
        ))
      }

      // Check if user already exists
      const existingUser = await db.collection('users').findOne({ email })
      if (existingUser) {
        return handleCORS(NextResponse.json(
          { error: 'User already exists' }, 
          { status: 400 }
        ))
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create user
      const user = {
        id: uuidv4(),
        name,
        email,
        password: hashedPassword,
        role: 'user',
        avatar: null,
        createdAt: new Date()
      }

      await db.collection('users').insertOne(user)
      
      // Remove password from response
      const { password: _, ...userResponse } = user
      return handleCORS(NextResponse.json({ user: userResponse }))
    }

    if (route === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json()
      
      if (!email || !password) {
        return handleCORS(NextResponse.json(
          { error: 'Email and password are required' }, 
          { status: 400 }
        ))
      }

      // Find user
      const user = await db.collection('users').findOne({ email })
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: 'Invalid credentials' }, 
          { status: 401 }
        ))
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        return handleCORS(NextResponse.json(
          { error: 'Invalid credentials' }, 
          { status: 401 }
        ))
      }

      // Remove password from response
      const { password: _, ...userResponse } = user
      return handleCORS(NextResponse.json({ user: userResponse }))
    }

    // Projects routes
    if (route === '/projects' && method === 'GET') {
      const { userId } = Object.fromEntries(new URL(request.url).searchParams)
      
      if (!userId) {
        return handleCORS(NextResponse.json(
          { error: 'User ID is required' }, 
          { status: 400 }
        ))
      }

      // Get projects where user is owner or member
      const projects = await db.collection('projects').find({
        $or: [
          { ownerId: userId },
          { 'members.userId': userId }
        ]
      }).toArray()

      const cleanedProjects = projects.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanedProjects))
    }

    if (route === '/projects' && method === 'POST') {
      const { name, description, ownerId } = await request.json()
      
      if (!name || !ownerId) {
        return handleCORS(NextResponse.json(
          { error: 'Name and owner ID are required' }, 
          { status: 400 }
        ))
      }

      const project = {
        id: uuidv4(),
        name,
        description: description || '',
        ownerId,
        members: [],
        settings: {
          visibility: 'private'
        },
        createdAt: new Date()
      }

      await db.collection('projects').insertOne(project)
      return handleCORS(NextResponse.json(project))
    }

    // Tasks routes
    if (route === '/tasks' && method === 'GET') {
      const { projectId } = Object.fromEntries(new URL(request.url).searchParams)
      
      if (!projectId) {
        return handleCORS(NextResponse.json(
          { error: 'Project ID is required' }, 
          { status: 400 }
        ))
      }

      const tasks = await db.collection('tasks').find({ projectId }).toArray()
      const cleanedTasks = tasks.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanedTasks))
    }

    if (route === '/tasks' && method === 'POST') {
      const { title, description, projectId, status, priority, assigneeId } = await request.json()
      
      if (!title || !projectId) {
        return handleCORS(NextResponse.json(
          { error: 'Title and project ID are required' }, 
          { status: 400 }
        ))
      }

      const task = {
        id: uuidv4(),
        title,
        description: description || '',
        projectId,
        status: status || 'todo',
        priority: priority || 'medium',
        assigneeId: assigneeId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.collection('tasks').insertOne(task)
      return handleCORS(NextResponse.json(task))
    }

    if (route.startsWith('/tasks/') && method === 'PUT') {
      const taskId = route.split('/')[2]
      const updates = await request.json()
      
      if (!taskId) {
        return handleCORS(NextResponse.json(
          { error: 'Task ID is required' }, 
          { status: 400 }
        ))
      }

      const updatedTask = {
        ...updates,
        updatedAt: new Date()
      }

      const result = await db.collection('tasks').updateOne(
        { id: taskId },
        { $set: updatedTask }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: 'Task not found' }, 
          { status: 404 }
        ))
      }

      const task = await db.collection('tasks').findOne({ id: taskId })
      const { _id, ...cleanedTask } = task
      return handleCORS(NextResponse.json(cleanedTask))
    }

    if (route.startsWith('/tasks/') && method === 'DELETE') {
      const taskId = route.split('/')[2]
      
      if (!taskId) {
        return handleCORS(NextResponse.json(
          { error: 'Task ID is required' }, 
          { status: 400 }
        ))
      }

      const result = await db.collection('tasks').deleteOne({ id: taskId })

      if (result.deletedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: 'Task not found' }, 
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ message: 'Task deleted successfully' }))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute