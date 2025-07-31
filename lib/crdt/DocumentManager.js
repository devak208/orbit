import * as Y from 'yjs'
import { nanoid } from 'nanoid'

/**
 * Document Manager for CRDT-based collaborative editing
 * Handles conflict-free operations similar to Figma's architecture
 */
export class DocumentManager {
  constructor(workspaceId) {
    this.workspaceId = workspaceId
    this.ydoc = new Y.Doc()
    this.elements = this.ydoc.getMap('elements')
    this.appState = this.ydoc.getMap('appState')
    this.operations = this.ydoc.getArray('operations')
    this.presence = this.ydoc.getMap('presence')
    
    // Version vector for operation ordering
    this.versionVector = new Map()
    this.localClock = 0
    
    // Event listeners
    this._listeners = new Map()
    
    this.setupListeners()
  }

  setupListeners() {
    // Listen to document changes
    this.ydoc.on('updateV2', (update, origin, doc) => {
      this.emit('document-update', { update, origin, doc })
    })

    // Listen to element changes
    this.elements.observe((event, transaction) => {
      this.emit('elements-change', { event, transaction })
    })

    // Listen to app state changes
    this.appState.observe((event, transaction) => {
      this.emit('appstate-change', { event, transaction })
    })

    // Listen to operations
    this.operations.observe((event, transaction) => {
      this.emit('operations-change', { event, transaction })
    })
  }

  // Event system
  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event).add(listener)
  }

  off(event, listener) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(listener)
    }
  }

  emit(event, data) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in listener for event ${event}:`, error)
        }
      })
    }
  }

  // Element operations (conflict-free)
  createElement(elementData, userId) {
    const elementId = nanoid()
    const timestamp = Date.now()
    
    const element = {
      id: elementId,
      ...elementData,
      createdBy: userId,
      createdAt: timestamp,
      updatedBy: userId,
      updatedAt: timestamp,
      version: this.incrementClock(userId)
    }

    // Use Yjs transaction for atomic operation
    this.ydoc.transact(() => {
      this.elements.set(elementId, element)
      this.addOperation({
        type: 'CREATE_ELEMENT',
        elementId,
        element,
        userId,
        timestamp,
        version: element.version
      })
    }, 'local')

    return elementId
  }

  updateElement(elementId, changes, userId) {
    const timestamp = Date.now()
    const version = this.incrementClock(userId)
    
    this.ydoc.transact(() => {
      const currentElement = this.elements.get(elementId)
      if (!currentElement) {
        console.warn(`Element ${elementId} not found`)
        return
      }

      // Merge changes with conflict resolution
      const updatedElement = {
        ...currentElement,
        ...changes,
        updatedBy: userId,
        updatedAt: timestamp,
        version
      }

      this.elements.set(elementId, updatedElement)
      this.addOperation({
        type: 'UPDATE_ELEMENT',
        elementId,
        changes,
        userId,
        timestamp,
        version
      })
    }, 'local')
  }

  deleteElement(elementId, userId) {
    const timestamp = Date.now()
    const version = this.incrementClock(userId)

    this.ydoc.transact(() => {
      if (this.elements.has(elementId)) {
        this.elements.delete(elementId)
        this.addOperation({
          type: 'DELETE_ELEMENT',
          elementId,
          userId,
          timestamp,
          version
        })
      }
    }, 'local')
  }

  // Batch operations for performance
  batchUpdate(operations, userId) {
    const timestamp = Date.now()
    const version = this.incrementClock(userId)

    this.ydoc.transact(() => {
      operations.forEach((op, index) => {
        switch (op.type) {
          case 'CREATE':
            this.createElement(op.data, userId)
            break
          case 'UPDATE':
            this.updateElement(op.elementId, op.changes, userId)
            break
          case 'DELETE':
            this.deleteElement(op.elementId, userId)
            break
        }
      })

      this.addOperation({
        type: 'BATCH_UPDATE',
        operations,
        userId,
        timestamp,
        version
      })
    }, 'local')
  }

  // App state management
  updateAppState(changes, userId) {
    const timestamp = Date.now()
    const version = this.incrementClock(userId)

    this.ydoc.transact(() => {
      Object.entries(changes).forEach(([key, value]) => {
        this.appState.set(key, value)
      })

      this.addOperation({
        type: 'UPDATE_APPSTATE',
        changes,
        userId,
        timestamp,
        version
      })
    }, 'local')
  }

  // Presence management (cursors, selections, etc.)
  updatePresence(userId, presenceData) {
    const timestamp = Date.now()
    
    this.presence.set(userId, {
      ...presenceData,
      userId,
      timestamp
    })
  }

  removePresence(userId) {
    this.presence.delete(userId)
  }

  getPresence() {
    const presence = new Map()
    this.presence.forEach((data, userId) => {
      presence.set(userId, data)
    })
    return presence
  }

  // Version control and conflict resolution
  incrementClock(userId) {
    this.localClock++
    const currentUserClock = this.versionVector.get(userId) || 0
    this.versionVector.set(userId, Math.max(currentUserClock, this.localClock))
    return this.localClock
  }

  addOperation(operation) {
    this.operations.push([operation])
  }

  // Undo/Redo functionality
  getOperationHistory(userId) {
    const userOps = []
    this.operations.forEach(opArray => {
      const op = opArray[0]
      if (op.userId === userId) {
        userOps.push(op)
      }
    })
    return userOps.sort((a, b) => a.version - b.version)
  }

  undoLastOperation(userId) {
    const userOps = this.getOperationHistory(userId)
    if (userOps.length === 0) return false

    const lastOp = userOps[userOps.length - 1]
    
    // Create inverse operation
    this.ydoc.transact(() => {
      switch (lastOp.type) {
        case 'CREATE_ELEMENT':
          this.elements.delete(lastOp.elementId)
          break
        case 'UPDATE_ELEMENT':
          // Restore previous state (would need to store previous state)
          console.warn('Undo for UPDATE_ELEMENT not fully implemented')
          break
        case 'DELETE_ELEMENT':
          // Restore element (would need to store deleted element)
          console.warn('Undo for DELETE_ELEMENT not fully implemented')
          break
      }

      this.addOperation({
        type: 'UNDO',
        originalOperation: lastOp,
        userId,
        timestamp: Date.now(),
        version: this.incrementClock(userId)
      })
    }, 'local')

    return true
  }

  // Export/Import for persistence
  exportDocument() {
    return {
      elements: this.getElements(),
      appState: this.getAppState(),
      operations: Array.from(this.operations),
      versionVector: Object.fromEntries(this.versionVector)
    }
  }

  importDocument(documentData) {
    this.ydoc.transact(() => {
      // Clear existing data
      this.elements.clear()
      this.appState.clear()
      this.operations.delete(0, this.operations.length)

      // Import elements
      if (documentData.elements) {
        Object.entries(documentData.elements).forEach(([id, element]) => {
          this.elements.set(id, element)
        })
      }

      // Import app state
      if (documentData.appState) {
        Object.entries(documentData.appState).forEach(([key, value]) => {
          this.appState.set(key, value)
        })
      }

      // Import operations
      if (documentData.operations) {
        documentData.operations.forEach(op => {
          this.operations.push([op])
        })
      }

      // Import version vector
      if (documentData.versionVector) {
        this.versionVector = new Map(Object.entries(documentData.versionVector))
      }
    }, 'import')
  }

  // Getters
  getElements() {
    const elements = {}
    this.elements.forEach((element, id) => {
      elements[id] = element
    })
    return elements
  }

  getElement(elementId) {
    return this.elements.get(elementId)
  }

  getAppState() {
    const appState = {}
    this.appState.forEach((value, key) => {
      appState[key] = value
    })
    return appState
  }

  // Conflict resolution helpers
  resolveConflict(localOp, remoteOp) {
    // Last-writer-wins based on timestamp, but with user priority
    if (localOp.timestamp === remoteOp.timestamp) {
      // If same timestamp, use user ID as tiebreaker
      return localOp.userId > remoteOp.userId ? localOp : remoteOp
    }
    return localOp.timestamp > remoteOp.timestamp ? localOp : remoteOp
  }

  // Clean up
  destroy() {
    this._listeners.clear()
    this.ydoc.destroy()
  }
}
