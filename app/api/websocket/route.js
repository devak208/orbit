import { Server } from 'socket.io'
import { createServer } from 'http'
import { prisma } from '../../../lib/db'

let io
let httpServer

export async function GET(request) {
  if (!io) {
    // Initialize HTTP server and Socket.IO
    httpServer = createServer()
    io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    })

    io.on('connection', async (socket) => {
      console.log('Client connected:', socket.id)

      // Handle joining a workspace room
      socket.on('join-workspace', async (data) => {
        const { workspaceId, projectId, userId } = data
        
        // Verify user has access to this workspace
        try {
          const workspace = await prisma.workspace.findFirst({
            where: {
              id: workspaceId,
              projectId: projectId
            },
            include: {
              project: {
                include: {
                  members: true
                }
              }
            }
          })

          if (workspace && (
            workspace.project.ownerId === userId ||
            workspace.project.members.some(member => member.userId === userId)
          )) {
            socket.join(`workspace-${workspaceId}`)
            socket.workspaceId = workspaceId
            socket.userId = userId
            console.log(`User ${userId} joined workspace ${workspaceId}`)
            
            // Notify others that a user joined
            socket.to(`workspace-${workspaceId}`).emit('user-joined', {
              userId,
              socketId: socket.id
            })
          } else {
            socket.emit('error', { message: 'Access denied to workspace' })
          }
        } catch (error) {
          console.error('Error joining workspace:', error)
          socket.emit('error', { message: 'Failed to join workspace' })
        }
      })

      // Handle workspace updates
      socket.on('workspace-update', async (data) => {
        const { workspaceId, elements, appState, userId } = data
        
        // Log raw incoming message
        console.log('📝 [API-SERVER] Raw workspace-update message:', {
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

        try {
          // Clean appState for saving
          const cleanedAppState = { ...appState }
          delete cleanedAppState.collaborators
          
          // Remove undefined values
          Object.keys(cleanedAppState).forEach(key => {
            if (cleanedAppState[key] === undefined) {
              delete cleanedAppState[key]
            }
          })

          // Update workspace in database
          const updatedWorkspace = await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
              data: { elements, appState: cleanedAppState },
              updatedAt: new Date()
            }
          })

          // Define schema version
          const SCHEMA_VERSION = '1.0.0'

          // Broadcast update to all clients in the workspace except sender
          const broadcastData = {
            elements,
            appState,
            userId,
            timestamp: updatedWorkspace.updatedAt,
            schemaVersion: SCHEMA_VERSION
          }
          
          console.log('📤 [API-SERVER] Outgoing broadcast payload:', {
            elementsType: Array.isArray(broadcastData.elements) ? 'array' : typeof broadcastData.elements,
            appStateType: typeof broadcastData.appState,
            userIdType: typeof broadcastData.userId,
            timestampType: typeof broadcastData.timestamp,
            schemaVersion: broadcastData.schemaVersion
          })
          
          socket.to(`workspace-${workspaceId}`).emit('workspace-updated', broadcastData)

          // Send confirmation to sender
          const confirmationData = {
            timestamp: updatedWorkspace.updatedAt,
            schemaVersion: SCHEMA_VERSION
          }
          socket.emit('update-confirmed', confirmationData)

        } catch (error) {
          console.error('Error updating workspace:', error)
          socket.emit('error', { message: 'Failed to update workspace' })
        }
      })

      // Handle cursor/pointer updates for real-time collaboration
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
          socket.to(`workspace-${socket.workspaceId}`).emit('user-left', {
            userId: socket.userId,
            socketId: socket.id
          })
        }
      })
    })

    httpServer.listen(3001)
    console.log('WebSocket server started on port 3001')
  }

  return new Response('WebSocket server running', { status: 200 })
}
