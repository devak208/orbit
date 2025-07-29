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

// Generate invitation token
function generateInviteToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
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
      return handleCORS(NextResponse.json({ message: "Project Hub API - Advanced Project Management" }))
    }

    // Authentication routes
    if (route === '/auth/register' && method === 'POST') {
      const { name, email, password, role = 'developer' } = await request.json()
      
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

      // Create user with enhanced profile
      const user = {
        id: uuidv4(),
        name,
        email,
        password: hashedPassword,
        role, // 'owner' or 'developer'
        avatar: null,
        settings: {
          theme: 'light',
          notifications: {
            email: true,
            push: true,
            mentions: true
          }
        },
        profile: {
          bio: '',
          location: '',
          timezone: 'UTC'
        },
        createdAt: new Date(),
        lastActiveAt: new Date()
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

      // Update last active time
      await db.collection('users').updateOne(
        { id: user.id },
        { $set: { lastActiveAt: new Date() } }
      )

      // Remove password from response
      const { password: _, ...userResponse } = user
      return handleCORS(NextResponse.json({ user: userResponse }))
    }

    // User profile routes
    if (route.startsWith('/users/') && method === 'GET') {
      const userId = route.split('/')[2]
      
      if (!userId) {
        return handleCORS(NextResponse.json(
          { error: 'User ID is required' }, 
          { status: 400 }
        ))
      }

      const user = await db.collection('users').findOne({ id: userId })
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: 'User not found' }, 
          { status: 404 }
        ))
      }

      // Remove password from response
      const { password: _, ...userResponse } = user
      return handleCORS(NextResponse.json(userResponse))
    }

    if (route.startsWith('/users/') && method === 'PUT') {
      const userId = route.split('/')[2]
      const updates = await request.json()
      
      if (!userId) {
        return handleCORS(NextResponse.json(
          { error: 'User ID is required' }, 
          { status: 400 }
        ))
      }

      // Remove sensitive fields from updates
      delete updates.password
      delete updates.id
      delete updates.email
      delete updates.createdAt

      const result = await db.collection('users').updateOne(
        { id: userId },
        { $set: { ...updates, updatedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: 'User not found' }, 
          { status: 404 }
        ))
      }

      const updatedUser = await db.collection('users').findOne({ id: userId })
      const { password: _, ...userResponse } = updatedUser
      return handleCORS(NextResponse.json(userResponse))
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

      // Get member details for each project
      const projectsWithMembers = await Promise.all(
        projects.map(async (project) => {
          const memberIds = project.members?.map(m => m.userId) || []
          const memberDetails = await db.collection('users')
            .find({ id: { $in: [...memberIds, project.ownerId] } })
            .project({ id: 1, name: 1, email: 1, avatar: 1, role: 1 })
            .toArray()

          const { _id, ...cleanProject } = project
          return {
            ...cleanProject,
            memberDetails: memberDetails.map(({ _id, ...user }) => user)
          }
        })
      )

      return handleCORS(NextResponse.json(projectsWithMembers))
    }

    if (route === '/projects' && method === 'POST') {
      const { name, description, ownerId, visibility = 'private' } = await request.json()
      
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
          visibility, // 'private', 'team', 'public'
          allowMemberInvites: true,
          requireApproval: false
        },
        stats: {
          totalTasks: 0,
          completedTasks: 0,
          activeSprint: null
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.collection('projects').insertOne(project)
      
      // Create activity log
      await db.collection('activityLogs').insertOne({
        id: uuidv4(),
        projectId: project.id,
        userId: ownerId,
        action: 'project_created',
        metadata: { projectName: name },
        createdAt: new Date()
      })

      return handleCORS(NextResponse.json(project))
    }

    // Project invitations
    if (route === '/invitations' && method === 'POST') {
      const { projectId, email, role = 'developer', invitedBy } = await request.json()
      
      if (!projectId || !email || !invitedBy) {
        return handleCORS(NextResponse.json(
          { error: 'Project ID, email, and inviter ID are required' }, 
          { status: 400 }
        ))
      }

      // Check if project exists and user has permission to invite
      const project = await db.collection('projects').findOne({ id: projectId })
      if (!project) {
        return handleCORS(NextResponse.json(
          { error: 'Project not found' }, 
          { status: 404 }
        ))
      }

      // Check if user is owner or has permission to invite
      if (project.ownerId !== invitedBy && !project.settings?.allowMemberInvites) {
        return handleCORS(NextResponse.json(
          { error: 'Insufficient permissions to send invitations' }, 
          { status: 403 }
        ))
      }

      // Check if user already exists or is already invited
      const existingUser = await db.collection('users').findOne({ email })
      const existingInvite = await db.collection('projectInvitations').findOne({ 
        projectId, 
        email, 
        status: 'pending' 
      })

      if (existingInvite) {
        return handleCORS(NextResponse.json(
          { error: 'Invitation already sent to this email' }, 
          { status: 400 }
        ))
      }

      // Create invitation
      const invitation = {
        id: uuidv4(),
        projectId,
        email,
        role,
        invitedBy,
        token: generateInviteToken(),
        status: 'pending', // 'pending', 'accepted', 'rejected'
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date()
      }

      await db.collection('projectInvitations').insertOne(invitation)

      // Log activity
      await db.collection('activityLogs').insertOne({
        id: uuidv4(),
        projectId,
        userId: invitedBy,
        action: 'member_invited',
        metadata: { email, role },
        createdAt: new Date()
      })

      return handleCORS(NextResponse.json({ 
        invitation: { ...invitation, inviteUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${invitation.token}` }
      }))
    }

    // Accept invitation
    if (route.startsWith('/invitations/') && route.endsWith('/accept') && method === 'POST') {
      const token = route.split('/')[2]
      const { userId } = await request.json()
      
      if (!token || !userId) {
        return handleCORS(NextResponse.json(
          { error: 'Token and user ID are required' }, 
          { status: 400 }
        ))
      }

      // Find invitation
      const invitation = await db.collection('projectInvitations').findOne({ 
        token, 
        status: 'pending',
        expiresAt: { $gt: new Date() }
      })

      if (!invitation) {
        return handleCORS(NextResponse.json(
          { error: 'Invalid or expired invitation' }, 
          { status: 400 }
        ))
      }

      // Add member to project
      await db.collection('projects').updateOne(
        { id: invitation.projectId },
        { 
          $push: { 
            members: { 
              userId, 
              role: invitation.role, 
              joinedAt: new Date() 
            } 
          } 
        }
      )

      // Update invitation status
      await db.collection('projectInvitations').updateOne(
        { id: invitation.id },
        { $set: { status: 'accepted', acceptedAt: new Date(), acceptedBy: userId } }
      )

      // Log activity
      await db.collection('activityLogs').insertOne({
        id: uuidv4(),
        projectId: invitation.projectId,
        userId,
        action: 'member_joined',
        metadata: { role: invitation.role },
        createdAt: new Date()
      })

      return handleCORS(NextResponse.json({ message: 'Invitation accepted successfully' }))
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
      
      // Get assignee details for each task
      const tasksWithAssignees = await Promise.all(
        tasks.map(async (task) => {
          const { _id, ...cleanTask } = task
          
          if (cleanTask.assigneeId) {
            const assignee = await db.collection('users').findOne(
              { id: cleanTask.assigneeId },
              { projection: { id: 1, name: 1, email: 1, avatar: 1 } }
            )
            if (assignee) {
              const { _id, ...assigneeClean } = assignee
              cleanTask.assignee = assigneeClean
            }
          }
          
          return cleanTask
        })
      )

      return handleCORS(NextResponse.json(tasksWithAssignees))
    }

    if (route === '/tasks' && method === 'POST') {
      const { 
        title, 
        description, 
        projectId, 
        status = 'todo', 
        priority = 'medium', 
        assigneeId,
        tags = [],
        dueDate,
        estimatedHours
      } = await request.json()
      
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
        status, // 'todo', 'inprogress', 'review', 'done'
        priority, // 'low', 'medium', 'high', 'urgent'
        assigneeId: assigneeId || null,
        tags,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: estimatedHours || null,
        actualHours: 0,
        attachments: [],
        comments: [],
        subTasks: [],
        dependencies: [], // Task IDs this task depends on
        position: Date.now(), // For ordering within columns
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.collection('tasks').insertOne(task)

      // Update project stats
      await db.collection('projects').updateOne(
        { id: projectId },
        { 
          $inc: { 'stats.totalTasks': 1 },
          $set: { updatedAt: new Date() }
        }
      )

      // Log activity
      await db.collection('activityLogs').insertOne({
        id: uuidv4(),
        projectId,
        userId: assigneeId || 'system',
        action: 'task_created',
        metadata: { taskId: task.id, taskTitle: title },
        createdAt: new Date()
      })

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

      // Get current task for comparison
      const currentTask = await db.collection('tasks').findOne({ id: taskId })
      if (!currentTask) {
        return handleCORS(NextResponse.json(
          { error: 'Task not found' }, 
          { status: 404 }
        ))
      }

      // Prepare updates
      const updatedTask = {
        ...updates,
        updatedAt: new Date()
      }

      // Handle status change for project stats
      if (updates.status && updates.status !== currentTask.status) {
        const isCompleting = updates.status === 'done' && currentTask.status !== 'done'
        const isUncompleting = currentTask.status === 'done' && updates.status !== 'done'
        
        if (isCompleting) {
          await db.collection('projects').updateOne(
            { id: currentTask.projectId },
            { $inc: { 'stats.completedTasks': 1 } }
          )
        } else if (isUncompleting) {
          await db.collection('projects').updateOne(
            { id: currentTask.projectId },
            { $inc: { 'stats.completedTasks': -1 } }
          )
        }

        // Log status change
        await db.collection('activityLogs').insertOne({
          id: uuidv4(),
          projectId: currentTask.projectId,
          userId: updates.updatedBy || 'system',
          action: 'task_status_changed',
          metadata: { 
            taskId, 
            taskTitle: currentTask.title,
            fromStatus: currentTask.status,
            toStatus: updates.status 
          },
          createdAt: new Date()
        })
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

      // Get task details before deletion
      const task = await db.collection('tasks').findOne({ id: taskId })
      if (!task) {
        return handleCORS(NextResponse.json(
          { error: 'Task not found' }, 
          { status: 404 }
        ))
      }

      const result = await db.collection('tasks').deleteOne({ id: taskId })

      if (result.deletedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: 'Task not found' }, 
          { status: 404 }
        ))
      }

      // Update project stats
      const decrements = { 'stats.totalTasks': -1 }
      if (task.status === 'done') {
        decrements['stats.completedTasks'] = -1
      }

      await db.collection('projects').updateOne(
        { id: task.projectId },
        { 
          $inc: decrements,
          $set: { updatedAt: new Date() }
        }
      )

      // Log activity
      await db.collection('activityLogs').insertOne({
        id: uuidv4(),
        projectId: task.projectId,
        userId: 'system',
        action: 'task_deleted',
        metadata: { taskId, taskTitle: task.title },
        createdAt: new Date()
      })

      return handleCORS(NextResponse.json({ message: 'Task deleted successfully' }))
    }

    // Task comments
    if (route.startsWith('/tasks/') && route.endsWith('/comments') && method === 'POST') {
      const taskId = route.split('/')[2]
      const { content, userId } = await request.json()
      
      if (!taskId || !content || !userId) {
        return handleCORS(NextResponse.json(
          { error: 'Task ID, content, and user ID are required' }, 
          { status: 400 }
        ))
      }

      const comment = {
        id: uuidv4(),
        content,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.collection('tasks').updateOne(
        { id: taskId },
        { 
          $push: { comments: comment },
          $set: { updatedAt: new Date() }
        }
      )

      // Get user details for the comment
      const user = await db.collection('users').findOne(
        { id: userId },
        { projection: { id: 1, name: 1, avatar: 1 } }
      )

      const commentWithUser = {
        ...comment,
        user: user ? { id: user.id, name: user.name, avatar: user.avatar } : null
      }

      return handleCORS(NextResponse.json(commentWithUser))
    }

    // Activity logs
    if (route === '/activities' && method === 'GET') {
      const { projectId, limit = 50 } = Object.fromEntries(new URL(request.url).searchParams)
      
      if (!projectId) {
        return handleCORS(NextResponse.json(
          { error: 'Project ID is required' }, 
          { status: 400 }
        ))
      }

      const activities = await db.collection('activityLogs')
        .find({ projectId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .toArray()

      // Get user details for activities
      const userIds = activities.map(activity => activity.userId).filter(id => id !== 'system')
      const users = await db.collection('users')
        .find({ id: { $in: userIds } })
        .project({ id: 1, name: 1, avatar: 1 })
        .toArray()

      const userMap = users.reduce((acc, user) => {
        const { _id, ...cleanUser } = user
        acc[cleanUser.id] = cleanUser
        return acc
      }, {})

      const activitiesWithUsers = activities.map(activity => {
        const { _id, ...cleanActivity } = activity
        return {
          ...cleanActivity,
          user: userMap[activity.userId] || null
        }
      })

      return handleCORS(NextResponse.json(activitiesWithUsers))
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