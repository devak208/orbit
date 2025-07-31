import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import { DocumentManager } from '../lib/crdt/DocumentManager'

export const useWebSocket = (workspaceId, projectId) => {
  const { data: session } = useSession()
  const socketRef = useRef(null)
  const documentManagerRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [collaborators, setCollaborators] = useState(new Map())
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const updateCallbackRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  // Log raw messages - moved to component scope
  const logRawMessage = (event, data) => {
    console.log(`📝 [CLIENT] Raw message - Event: ${event}`, data)
    
    // Validate message structure
    if (event === 'workspace-updated') {
      console.log('🔍 [CLIENT] Message validation:')
      console.log('  - Has elements:', Array.isArray(data.elements))
      console.log('  - Has appState:', typeof data.appState === 'object')
      console.log('  - Has userId:', typeof data.userId === 'string')
      console.log('  - Has timestamp:', data.timestamp !== undefined)
      
      // Compare with outgoing payload format
      console.log('📤 [CLIENT] Outgoing format comparison:')
      console.log('  - Elements type:', typeof data.elements, '(expected: object/array)')
      console.log('  - AppState type:', typeof data.appState, '(expected: object)')
      console.log('  - UserId type:', typeof data.userId, '(expected: string)')
    }
  }

  useEffect(() => {
    if (!workspaceId || !projectId || !session?.user?.id) return

    // Initialize CRDT document manager
    documentManagerRef.current = new DocumentManager(workspaceId)
    
    // Initialize socket connection
    socketRef.current = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    })

    const socket = socketRef.current
    const docManager = documentManagerRef.current

    // Listen to CRDT document changes
    docManager.on('elements-change', (data) => {
      logRawMessage('crdt-elements-change', data)
      console.log('📥 [CLIENT] CRDT elements changed:', data)
    })

    docManager.on('appstate-change', (data) => {
      logRawMessage('crdt-appstate-change', data)
      console.log('📥 [CLIENT] CRDT appstate changed:', data)
    })

    // Define event handlers
    const handleConnect = () => {
      console.log('🔗 [CLIENT] Connected to WebSocket server')
      console.log('📎 [CLIENT] Socket ID:', socket.id)
      setIsConnected(true)
      setReconnectAttempts(0) // Reset reconnect attempts on successful connection
      
      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
      // Join the workspace room
      console.log(`🏭 [CLIENT] Joining workspace ${workspaceId} as user ${session.user.id}`)
      socket.emit('join-workspace', {
        workspaceId,
        projectId,
        userId: session.user.id
      })
    }

    const handleDisconnect = () => {
      console.log('🔌 [CLIENT] Disconnected from WebSocket server')
      setIsConnected(false)
      
      // Attempt to reconnect after a delay
      if (reconnectAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000) // Exponential backoff, max 10s
        console.log(`🔄 [CLIENT] Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/5)`)
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1)
          // The effect will handle reconnection when reconnectAttempts changes
        }, delay)
      } else {
        console.error('❌ [CLIENT] Max reconnection attempts reached')
      }
    }

    const handleError = (error) => {
      console.error('WebSocket error:', error)
    }

const handleUpdateConfirmed = (data) => {
      logRawMessage('update-confirmed', data)
      console.log('✅ [CLIENT] Update confirmed by server:', data.timestamp)
      setLastUpdate(data.timestamp)
    }

    const handleWorkspaceUpdated = (data) => {
      logRawMessage('workspace-updated', data)
      console.log('📥 [CLIENT] Received workspace-updated event:', data)
      console.log('📁 [CLIENT] Elements in received update:', data.elements?.length || 0)
      console.log('📝 [CLIENT] Update from user:', data.userId)

      // Check if the update is from a different user
      const isRemoteUpdate = data.userId !== session?.user?.id
      console.log('🔄 [CLIENT] Is remote update:', isRemoteUpdate)

      if (isRemoteUpdate && updateCallbackRef.current) {
        updateCallbackRef.current(data, isRemoteUpdate)
      }
    }

    const handleUserJoined = (data) => {
      logRawMessage('user-joined', data);
      setCollaborators(prev => new Map(prev.set(data.userId, {
        userId: data.userId,
        socketId: data.socketId,
        cursor: null
      })));
    };

    const handleUserLeft = (data) => {
      logRawMessage('user-left', data)
      setCollaborators(prev => {
        const updated = new Map(prev)
        updated.delete(data.userId)
        return updated
      })
    }

    const handlePointerUpdated = (data) => {
      logRawMessage('pointer-updated', data)
      setCollaborators(prev => {
        const updated = new Map(prev)
        const existingUser = updated.get(data.userId) || { userId: data.userId }
        updated.set(data.userId, {
          ...existingUser,
          pointer: data.pointer,
          button: data.button,
          username: data.username || `User ${data.userId.slice(0, 6)}`,
          color: data.color || `hsl(${(data.userId.charCodeAt(0) * 137.508) % 360}, 70%, 50%)`,
          timestamp: data.timestamp
        })
        return updated
      })
    }

    const handleCursorUpdated = (data) => {
      logRawMessage('cursor-updated', data)
      setCollaborators(prev => {
        const updated = new Map(prev)
        if (updated.has(data.userId)) {
          updated.set(data.userId, {
            ...updated.get(data.userId),
            cursor: data.cursor
          })
        }
        return updated
      })
    }

    // Attach event handlers exactly once
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('error', handleError)
    socket.on('update-confirmed', handleUpdateConfirmed)
    socket.on('workspace-updated', handleWorkspaceUpdated)
    socket.on('user-joined', handleUserJoined)
    socket.on('user-left', handleUserLeft)
    socket.on('pointer-updated', handlePointerUpdated)
    socket.on('cursor-updated', handleCursorUpdated)

    return () => {
      if (socket) {
        // Remove all event handlers before disconnecting
        socket.off('connect', handleConnect)
        socket.off('disconnect', handleDisconnect)
        socket.off('error', handleError)
        socket.off('update-confirmed', handleUpdateConfirmed)
        socket.off('workspace-updated', handleWorkspaceUpdated)
        socket.off('user-joined', handleUserJoined)
        socket.off('user-left', handleUserLeft)
        socket.off('pointer-updated', handlePointerUpdated)
        socket.off('cursor-updated', handleCursorUpdated)
        
        // Then disconnect
        socket.disconnect()
      }
      
      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [workspaceId, projectId, session?.user?.id, reconnectAttempts])

  const sendWorkspaceUpdate = (elements, appState) => {
    if (socketRef.current && isConnected) {
      console.log(`📤 [CLIENT] Sending workspace update for ${workspaceId}`)
      console.log(`📁 [CLIENT] Elements count: ${elements?.length || 0}`)
      console.log(`📝 [CLIENT] User ID: ${session?.user?.id}`)
      
      try {
        socketRef.current.emit('workspace-update', {
          workspaceId,
          elements,
          appState,
          userId: session?.user?.id
        })
        console.log('✅ [CLIENT] Update sent successfully')
      } catch (error) {
        console.error('❌ [CLIENT] Error sending update:', error)
      }
    } else {
      console.warn(`⚠️ [CLIENT] Cannot send update - Connection: ${isConnected}, Socket: ${!!socketRef.current}`)
    }
  }

  const sendPointerUpdate = (pointerData) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('pointer-update', {
        workspaceId,
        ...pointerData,
        userId: session?.user?.id
      })
    }
  }

  const sendCursorUpdate = (cursor) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('cursor-update', {
        workspaceId,
        cursor,
        userId: session?.user?.id
      })
    }
  }

  const onWorkspaceUpdate = useCallback((callback) => {
    updateCallbackRef.current = callback
    return () => {
      updateCallbackRef.current = null
    }
  }, [])

  return {
    isConnected,
    lastUpdate,
    collaborators,
    sendWorkspaceUpdate,
    sendPointerUpdate,
    sendCursorUpdate,
    onWorkspaceUpdate
  }
}
