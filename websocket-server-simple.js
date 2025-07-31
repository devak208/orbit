const { Server } = require('socket.io')
const { createServer } = require('http')
const Y = require('yjs')

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
    origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
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

  // Handle joining a workspace room
  socket.on('join-workspace', async (data) => {
    const { workspaceId, projectId, userId } = data
    
    try {
      socket.join(`workspace-${workspaceId}`)
      socket.workspaceId = workspaceId
      socket.userId = userId
      
      // Initialize or get CRDT document for this workspace
      getWorkspaceDocument(workspaceId)
      
      console.log(`✅ User ${userId} joined workspace ${workspaceId}`)
      console.log(`📊 Workspace ${workspaceId} now has ${io.sockets.adapter.rooms.get(`workspace-${workspaceId}`)?.size || 0} clients`)
      
      // Add to collaborators
      if (!workspaceCollaborators.has(workspaceId)) {
        workspaceCollaborators.set(workspaceId, new Set())
      }
      workspaceCollaborators.get(workspaceId).add({ userId, socketId: socket.id })
      
      // Notify others that a user joined
      socket.to(`workspace-${workspaceId}`).emit('user-joined', {
        userId,
        socketId: socket.id,
        collaborators: Array.from(workspaceCollaborators.get(workspaceId))
      })
      
      // Send current state to the new user
      const currentState = workspaceStates.get(workspaceId)
      if (currentState) {
        socket.emit('workspace-state', currentState)
      }
      
      console.log(`🔔 Notified other clients in workspace ${workspaceId} about new user ${userId}`)
    } catch (error) {
      console.error('Error joining workspace:', error)
      socket.emit('error', { message: 'Failed to join workspace' })
    }
  })

  // Handle workspace updates with CRDT-style conflict resolution (no locking needed!)
  socket.on('workspace-update', async (data) => {
    const { workspaceId, elements, appState, userId, timestamp } = data
    
    console.log('📝 [SERVER] Raw workspace-update message:', {
      workspaceId,
      elementsCount: elements?.length || 0,
      appStateKeys: Object.keys(appState || {}),
      userId,
      timestamp: timestamp || new Date().toISOString()
    })
    
    if (socket.workspaceId !== workspaceId) {
      socket.emit('error', { message: 'Not authorized for this workspace' })
      return
    }
    
    // ✅ NO EDIT LOCK REQUIRED - CRDT handles conflicts automatically!

    try {
      // Get CRDT document for this workspace
      const ydoc = getWorkspaceDocument(workspaceId)
      const elementsMap = ydoc.getMap('elements')
      const appStateMap = ydoc.getMap('appState')
      
      // Apply changes to CRDT document (this handles conflict resolution automatically)
      ydoc.transact(() => {
        // Update elements
        if (elements && Array.isArray(elements)) {
          elementsMap.clear()
          elements.forEach((element, index) => {
            if (element && element.id) {
              elementsMap.set(element.id, element)
            }
          })
        }
        
        // Update app state
        if (appState && typeof appState === 'object') {
          Object.entries(appState).forEach(([key, value]) => {
            appStateMap.set(key, value)
          })
        }
      })
      
      // Store the current state for new users
      workspaceStates.set(workspaceId, { elements, appState })
      
      console.log(`📢 Broadcasting update for workspace ${workspaceId} from user ${userId}`)
      console.log(`📁 Elements count: ${elements?.length || 0}`)
      console.log(`📊 Clients in workspace: ${io.sockets.adapter.rooms.get(`workspace-${workspaceId}`)?.size || 0}`)
      
      const updateTimestamp = timestamp || new Date()
      const SCHEMA_VERSION = '2.0.0-crdt'
      
      // Broadcast update to all clients in the workspace except sender
      const broadcastData = {
        elements,
        appState,
        userId,
        timestamp: updateTimestamp,
        schemaVersion: SCHEMA_VERSION,
        isCRDT: true
      }
      
      socket.to(`workspace-${workspaceId}`).emit('workspace-updated', broadcastData)
      console.log(`✨ Broadcast sent to other clients in workspace ${workspaceId}`)

      // Send confirmation to sender
      socket.emit('update-confirmed', {
        timestamp: updateTimestamp,
        schemaVersion: SCHEMA_VERSION
      })
      console.log(`✅ Confirmation sent to sender ${userId}`)

    } catch (error) {
      console.error('❌ [SERVER] Error updating workspace:', error)
      socket.emit('error', { message: 'Failed to update workspace', details: error.message })
    }
  })

  // Handle CRDT updates directly
  socket.on('crdt-update', (data) => {
    const { workspaceId, update, userId } = data
    
    if (socket.workspaceId !== workspaceId) return
    
    try {
      const ydoc = getWorkspaceDocument(workspaceId)
      Y.applyUpdate(ydoc, new Uint8Array(update))
      
      // Broadcast to other clients
      socket.to(`workspace-${workspaceId}`).emit('crdt-update', {
        workspaceId,
        update,
        origin: userId
      })
    } catch (error) {
      console.error('Error applying CRDT update:', error)
    }
  })

  // Handle edit lock requests (for backward compatibility)
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
    
    if (socket.workspaceId) {
      // Remove from collaborators
      const collaborators = workspaceCollaborators.get(socket.workspaceId)
      if (collaborators) {
        collaborators.forEach(collab => {
          if (collab.socketId === socket.id) {
            collaborators.delete(collab)
          }
        })
      }
      
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
        socketId: socket.id,
        collaborators: collaborators ? Array.from(collaborators) : []
      })
    }
  })
})

const PORT = process.env.WS_PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`)
  console.log('📝 Features enabled:')
  console.log('  - Real-time collaboration with CRDTs')
  console.log('  - Conflict-free document merging')
  console.log('  - Live cursors and presence')
  console.log('  - Multi-user editing')
  console.log('  - No database dependency (in-memory)')
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down WebSocket server...')
  httpServer.close()
  process.exit(0)
})
