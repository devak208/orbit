const { Server } = require('socket.io')
const { createServer } = require('http')
const Y = require('yjs')

// Import Prisma client from the custom output path
let prisma
try {
  const { PrismaClient } = require('./lib/generated/prisma')
  prisma = new PrismaClient()
} catch (error) {
  console.warn('⚠️ Prisma client not available, running without database persistence')
  prisma = null
}

// Notification management
const userSockets = new Map() // userId -> Set of socketIds for notification delivery

// Environment configuration
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'
const CORS_ORIGIN = NODE_ENV === 'production' 
  ? [process.env.NEXT_PUBLIC_BASE_URL, process.env.NEXTAUTH_URL].filter(Boolean)
  : ["http://localhost:3000", "http://127.0.0.1:3000"]

console.log(`🚀 WebSocket server starting in ${NODE_ENV} mode`)
console.log(`📡 CORS origins:`, CORS_ORIGIN)

// Add connection test
if (prisma) {
  prisma.$connect()
    .then(() => console.log('✅ Database connected successfully'))
    .catch(err => console.error('❌ Database connection failed:', err))
}

// CRDT document management
const workspaceDocuments = new Map() // workspaceId -> Y.Doc
const workspaceStates = new Map() // workspaceId -> { elements, appState }

// Enhanced collaboration system (no more locking - true CRDT)
const workspaceCollaborators = new Map() // workspaceId -> Set of { userId, socketId }

// Legacy locking system for backward compatibility
const workspaceLocks = new Map() // workspaceId -> { userId, socketId, timestamp, timeout }
const LOCK_TIMEOUT = 30000 // 30 seconds timeout for abandoned locks

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Helper function to get or create CRDT document for workspace
function getWorkspaceDocument(workspaceId) {
  if (!workspaceDocuments.has(workspaceId)) {
    const ydoc = new Y.Doc()
    workspaceDocuments.set(workspaceId, ydoc)
    
    // Initialize document structure
    const elements = ydoc.getMap('elements')
    const appState = ydoc.getMap('appState')
    const operations = ydoc.getArray('operations')
    
    // Listen to document changes
    ydoc.on('updateV2', (update, origin, doc) => {
      console.log(`📄 [SERVER] CRDT document updated for workspace ${workspaceId}`)
      
      // Broadcast CRDT updates to all clients in workspace
      io.to(`workspace-${workspaceId}`).emit('crdt-update', {
        workspaceId,
        update: Array.from(update),
        origin
      })
    })
  }
  return workspaceDocuments.get(workspaceId)
}

io.on('connection', (socket) => {
  console.log('🔗 Client connected:', socket.id)
  console.log('📊 Total clients:', io.engine.clientsCount)

  // User connection handling for notifications
  socket.on('user-connect', (data) => {
    const { userId } = data
    if (userId) {
      socket.userId = userId
      
      // Track user sockets for notifications
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set())
      }
      userSockets.get(userId).add(socket.id)
      
      console.log(`👤 User ${userId} connected on socket ${socket.id}`)
    }
  })

  // Handle notification events
  socket.on('user-notification', (data) => {
    const { userId, notification, inboxItem, type } = data
    
    // Send to all user's connected sockets
    if (userSockets.has(userId)) {
      const userSocketIds = userSockets.get(userId)
      userSocketIds.forEach(socketId => {
        io.to(socketId).emit('notification-received', {
          notification,
          inboxItem,
          type,
          timestamp: new Date().toISOString()
        })
      })
      console.log(`🔔 Notification sent to user ${userId} on ${userSocketIds.size} sockets`)
    }
  })

  // Handle notification read status updates
  socket.on('notifications-read', (data) => {
    const { userId, notificationIds } = data
    
    if (userSockets.has(userId)) {
      const userSocketIds = userSockets.get(userId)
      userSocketIds.forEach(socketId => {
        io.to(socketId).emit('notifications-read-update', {
          notificationIds,
          timestamp: new Date().toISOString()
        })
      })
    }
  })

  // Handle joining a workspace room
  socket.on('join-workspace', async (data) => {
    const { workspaceId, projectId, userId } = data
    
    // For testing - allow all joins (in production, verify user access)
    try {
      socket.join(`workspace-${workspaceId}`)
      socket.workspaceId = workspaceId
      socket.userId = userId
      console.log(`✅ User ${userId} joined workspace ${workspaceId}`)
      console.log(`📊 Workspace ${workspaceId} now has ${io.sockets.adapter.rooms.get(`workspace-${workspaceId}`)?.size || 0} clients`)
      
      // Notify others that a user joined
      const joinedClients = socket.to(`workspace-${workspaceId}`).emit('user-joined', {
        userId,
        socketId: socket.id
      })
      console.log(`🔔 Notified other clients in workspace ${workspaceId} about new user ${userId}`)
    } catch (error) {
      console.error('Error joining workspace:', error)
      socket.emit('error', { message: 'Failed to join workspace' })
    }
  })

  // Handle workspace updates (only allowed if user has edit lock)
  socket.on('workspace-update', async (data) => {
    const { workspaceId, elements, appState, userId } = data
    
    // Log raw incoming message
    console.log('📝 [SERVER] Raw workspace-update message:', {
      workspaceId,
      elementsCount: elements?.length || 0,
      appStateKeys: Object.keys(appState || {}),
      userId,
      timestamp: new Date().toISOString()
    })
    
    if (socket.workspaceId !== workspaceId) {
      socket.emit('error', { message: 'Not authorized for this workspace' })
      return
    }
    
    // Check if user has edit lock
    const currentLock = workspaceLocks.get(workspaceId)
    if (!currentLock || (currentLock.userId !== userId && currentLock.socketId !== socket.id)) {
      console.log(`🚫 Workspace update denied - user ${userId} doesn't have edit lock`)
      socket.emit('error', { message: 'Edit lock required to make changes' })
      return
    }

    try {
      console.log(`📢 Broadcasting update for workspace ${workspaceId} from user ${userId}`)
      console.log(`📁 Elements count: ${elements?.length || 0}`)
      console.log(`📊 Clients in workspace: ${io.sockets.adapter.rooms.get(`workspace-${workspaceId}`)?.size || 0}`)
      
      // Define schema version
      const SCHEMA_VERSION = '1.0.0'
      const timestamp = new Date()
      
      // Save to database first (if available)
      if (prisma) {
        try {
          console.log('💾 [SERVER] Saving workspace update to database')
          const updatedWorkspace = await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
              data: {
                elements,
                appState
              },
              updatedAt: timestamp
            }
          })
          console.log('✅ [SERVER] Workspace saved to database successfully')
        } catch (dbError) {
          console.error('❌ [SERVER] Database save failed:', dbError)
          // Continue with broadcast even if DB save fails
        }
      } else {
        console.log('💾 [SERVER] Database not available, continuing with in-memory only')
      }
      
      // Broadcast update to all clients in the workspace except sender
      const broadcastData = {
        elements,
        appState,
        userId,
        timestamp,
        schemaVersion: SCHEMA_VERSION
      }
      
      console.log('📤 [SERVER] Outgoing broadcast payload:', {
        elementsType: Array.isArray(broadcastData.elements) ? 'array' : typeof broadcastData.elements,
        appStateType: typeof broadcastData.appState,
        userIdType: typeof broadcastData.userId,
        timestampType: typeof broadcastData.timestamp,
        schemaVersion: broadcastData.schemaVersion
      })
      
      const broadcastResult = socket.to(`workspace-${workspaceId}`).emit('workspace-updated', broadcastData)
      console.log(`✨ Broadcast sent to other clients in workspace ${workspaceId}`)

      // Send confirmation to sender
      const confirmationData = {
        timestamp,
        schemaVersion: SCHEMA_VERSION
      }
      socket.emit('update-confirmed', confirmationData)
      console.log(`✅ Confirmation sent to sender ${userId}`)

    } catch (error) {
      console.error('❌ [SERVER] Error updating workspace:', error)
      socket.emit('error', { message: 'Failed to update workspace', details: error.message })
    }
  })

  // Handle edit lock requests
  socket.on('request-edit-lock', (data) => {
    const { workspaceId, userId } = data
    
    if (socket.workspaceId !== workspaceId) {
      socket.emit('edit-lock-denied', { error: 'Not authorized for this workspace' })
      return
    }
    
    const currentLock = workspaceLocks.get(workspaceId)
    
    if (!currentLock) {
      // Grant lock
      const lockData = {
        userId,
        socketId: socket.id,
        timestamp: Date.now(),
        timeout: setTimeout(() => {
          console.log(`🔓 Auto-releasing abandoned lock for workspace ${workspaceId}`)
          workspaceLocks.delete(workspaceId)
          io.to(`workspace-${workspaceId}`).emit('edit-lock-released', { reason: 'timeout' })
        }, LOCK_TIMEOUT)
      }
      
      workspaceLocks.set(workspaceId, lockData)
      
      console.log(`🔒 Edit lock granted to user ${userId} in workspace ${workspaceId}`)
      
      // Notify all users in workspace
      io.to(`workspace-${workspaceId}`).emit('edit-lock-granted', {
        userId,
        socketId: socket.id
      })
    } else {
      // Lock is already held
      console.log(`🚫 Edit lock denied for user ${userId} in workspace ${workspaceId} (held by ${currentLock.userId})`)
      socket.emit('edit-lock-denied', {
        currentEditor: currentLock.userId,
        currentEditorSocketId: currentLock.socketId
      })
    }
  })
  
  // Handle edit lock release
  socket.on('release-edit-lock', (data) => {
    const { workspaceId, userId } = data
    
    const currentLock = workspaceLocks.get(workspaceId)
    
    if (currentLock && (currentLock.userId === userId || currentLock.socketId === socket.id)) {
      // Clear timeout
      if (currentLock.timeout) {
        clearTimeout(currentLock.timeout)
      }
      
      workspaceLocks.delete(workspaceId)
      
      console.log(`🔓 Edit lock released by user ${userId} in workspace ${workspaceId}`)
      
      // Notify all users in workspace
      io.to(`workspace-${workspaceId}`).emit('edit-lock-released', {
        previousEditor: userId,
        reason: 'manual'
      })
    } else {
      socket.emit('error', { message: 'Cannot release lock - not the current editor' })
    }
  })
  
  // Handle cursor/pointer updates for real-time collaboration
  socket.on('pointer-update', (data) => {
    const { workspaceId, pointer, button, userId, username, color, timestamp } = data
    
    if (socket.workspaceId === workspaceId) {
      socket.to(`workspace-${workspaceId}`).emit('pointer-updated', {
        userId,
        pointer,
        button,
        username,
        color,
        timestamp,
        socketId: socket.id
      })
    }
  })

  socket.on('cursor-update', (data) => {
    const { workspaceId, cursor, userId } = data
    
    if (socket.workspaceId === workspaceId) {
      socket.to(`workspace-${workspaceId}`).emit('cursor-updated', {
        userId,
        cursor,
        socketId: socket.id
      })
    }
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    
    // Clean up user notification tracking
    if (socket.userId) {
      const userSocketSet = userSockets.get(socket.userId)
      if (userSocketSet) {
        userSocketSet.delete(socket.id)
        if (userSocketSet.size === 0) {
          userSockets.delete(socket.userId)
        }
      }
      console.log(`👤 User ${socket.userId} disconnected from socket ${socket.id}`)
    }
    
    if (socket.workspaceId) {
      // Check if disconnecting user had edit lock
      const currentLock = workspaceLocks.get(socket.workspaceId)
      if (currentLock && currentLock.socketId === socket.id) {
        // Clear timeout
        if (currentLock.timeout) {
          clearTimeout(currentLock.timeout)
        }
        
        workspaceLocks.delete(socket.workspaceId)
        
        console.log(`🔓 Edit lock auto-released due to disconnect in workspace ${socket.workspaceId}`)
        
        // Notify remaining users that lock is released
        socket.to(`workspace-${socket.workspaceId}`).emit('edit-lock-released', {
          previousEditor: socket.userId,
          reason: 'disconnect'
        })
      }
      
      socket.to(`workspace-${socket.workspaceId}`).emit('user-left', {
        userId: socket.userId,
        socketId: socket.id
      })
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`🌐 WebSocket server running on port ${PORT}`)
  console.log(`🔗 Environment: ${NODE_ENV}`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down WebSocket server...')
  httpServer.close()
  process.exit(0)
})
