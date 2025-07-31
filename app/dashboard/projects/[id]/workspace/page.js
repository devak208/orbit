'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { nanoid } from 'nanoid'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Save, 
  Download, 
  Upload, 
  Plus,
  FileImage,
  Trash2,
  Eye,
  Users,
  Check,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  MousePointer2,
  Sun,
  Moon
} from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useTheme } from '@/contexts/ThemeContext'

// Dynamically import ExcalidrawWrapper to avoid SSR issues
const ExcalidrawWrapper = dynamic(
  () => import('@/components/ExcalidrawWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }
)

export default function ProjectWorkspacePage() {
  const params = useParams()
  const { data: session } = useSession()
  const [project, setProject] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [currentWorkspace, setCurrentWorkspace] = useState(null)
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const [isExcalidrawReady, setIsExcalidrawReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [userId] = useState(() => nanoid())
  const [workspacesPanelCollapsed, setWorkspacesPanelCollapsed] = useState(false)
  const [followingUser, setFollowingUser] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const saveTimeoutRef = useRef(null)
  const lastPointerData = useRef({})
  const canvasRef = useRef(null)
  const { theme, currentTheme, toggleTheme } = useTheme()
  
  // WebSocket integration
  const {
    isConnected,
    lastUpdate,
    collaborators,
    sendWorkspaceUpdate,
    sendPointerUpdate,
    onWorkspaceUpdate
  } = useWebSocket(currentWorkspace?.id, params.id)

  useEffect(() => {
    if (params.id) {
      fetchProjectWorkspaces()
    }
  }, [params.id])

  const fetchProjectWorkspaces = async () => {
    try {
      const [projectResponse, workspacesResponse] = await Promise.all([
        fetch(`/api/projects/${params.id}`),
        fetch(`/api/projects/${params.id}/workspaces`)
      ])

      if (projectResponse.ok && workspacesResponse.ok) {
        const projectData = await projectResponse.json()
        const workspacesData = await workspacesResponse.json()
        
        setProject(projectData.project)
        setWorkspaces(workspacesData.workspaces || [])
        
        if (workspacesData.workspaces && workspacesData.workspaces.length > 0 && !currentWorkspace) {
          setCurrentWorkspace(workspacesData.workspaces[0])
        }
      }
    } catch (error) {
      console.error('Error fetching project workspaces:', error)
      toast.error('Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return

    try {
      const response = await fetch(`/api/projects/${params.id}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          data: { elements: [], appState: {} }
        })
      })

      if (response.ok) {
        const { workspace } = await response.json()
        setWorkspaces([workspace, ...workspaces])
        setCurrentWorkspace(workspace)
        setNewWorkspaceName('')
        setCreateDialogOpen(false)
        toast.success('Workspace created successfully')
      } else {
        toast.error('Failed to create workspace')
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
      toast.error('Failed to create workspace')
    }
  }

  const handleSaveWorkspace = async () => {
    if (!currentWorkspace || !excalidrawAPI || !excalidrawAPI.ready()) return

    setSaving(true)
    try {
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      
      // Filter out non-serializable properties from appState
      const serializableAppState = {
        ...appState,
        collaborators: undefined // Remove Map object which can't be serialized
      }

      const response = await fetch(`/api/projects/${params.id}/workspaces/${currentWorkspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { elements, appState: serializableAppState }
        })
      })

      if (response.ok) {
        const { workspace } = await response.json()
        setWorkspaces(workspaces.map(w => w.id === workspace.id ? workspace : w))
        setCurrentWorkspace(workspace)
        setLastSaved(new Date())
        toast.success('Workspace saved successfully')
      } else {
        toast.error('Failed to save workspace')
      }
    } catch (error) {
      console.error('Error saving workspace:', error)
      toast.error('Failed to save workspace')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteWorkspace = async (workspaceId) => {
    if (!confirm('Are you sure you want to delete this workspace?')) return

    try {
      const response = await fetch(`/api/projects/${params.id}/workspaces/${workspaceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const updatedWorkspaces = workspaces.filter(w => w.id !== workspaceId)
        setWorkspaces(updatedWorkspaces)
        
        if (currentWorkspace?.id === workspaceId) {
          setCurrentWorkspace(updatedWorkspaces[0] || null)
        }
        toast.success('Workspace deleted successfully')
      } else {
        toast.error('Failed to delete workspace')
      }
    } catch (error) {
      console.error('Error deleting workspace:', error)
      toast.error('Failed to delete workspace')
    }
  }

  // Function to clean appState for serialization
  const cleanAppStateForSaving = (appState) => {
    const cleaned = { ...appState }
    
    // Remove non-serializable properties
    delete cleaned.collaborators
    
    // Remove any undefined values
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key]
      }
    })
    
    return cleaned
  }

  // Debounced auto-save and update via WebSocket
  const autoSaveWorkspace = useCallback((elements, appState) => {
    if (!currentWorkspace) {
      console.log('⚠️ [WORKSPACE] No current workspace, skipping auto-save')
      return
    }
    
    if (!isConnected) {
      console.log('⚠️ [WORKSPACE] Not connected to WebSocket, skipping auto-save')
      return
    }

    console.log('💾 [WORKSPACE] Auto-saving workspace changes')
    setAutoSaving(true)
    
    try {
      const cleanedAppState = cleanAppStateForSaving(appState)
      sendWorkspaceUpdate(elements, cleanedAppState)
      setLastSaved(new Date())
      console.log('✅ [WORKSPACE] Auto-save completed')
    } catch (error) {
      console.error('❌ [WORKSPACE] Auto-save failed:', error)
    } finally {
      setAutoSaving(false)
    }
  }, [currentWorkspace, isConnected, sendWorkspaceUpdate])

// Queue to store updates when API is not ready
  const updateQueue = useRef([]);

  // Function to flush queued updates with retry mechanism
  const flushUpdateQueue = useCallback(() => {
    if (excalidrawAPI && excalidrawAPI.ready() && updateQueue.current.length > 0) {
      console.log(`🚀 [WORKSPACE] Flushing ${updateQueue.current.length} queued updates`);
      const updates = [...updateQueue.current];
      updateQueue.current = [];
      
      updates.forEach((data, index) => {
        try {
          console.log(`📝 [WORKSPACE] Applying queued update ${index + 1}/${updates.length}`);
          // CRITICAL: Set flag IMMEDIATELY to prevent infinite loop
          isApplyingRemoteUpdate.current = true;
          excalidrawAPI.updateScene({
            elements: data.elements,
            appState: data.appState,
          });
          console.log(`✅ [WORKSPACE] Successfully applied queued update ${index + 1}`);
        } catch (error) {
          console.error(`❌ [WORKSPACE] Error applying queued update ${index + 1}:`, error);
          // Re-queue failed update for retry
          updateQueue.current.push(data);
        } finally {
          // Always clear flag immediately after update with try/finally pattern
          setTimeout(() => {
            isApplyingRemoteUpdate.current = false;
          }, 0);
        }
      });
      
      // If there are still failed updates, retry after a delay
      if (updateQueue.current.length > 0) {
        console.log(`🔄 [WORKSPACE] Retrying ${updateQueue.current.length} failed updates in 1 second`);
        setTimeout(flushUpdateQueue, 1000);
      }
    } else if (updateQueue.current.length > 0) {
      console.log(`⏳ [WORKSPACE] API not ready yet, ${updateQueue.current.length} updates queued`);
    }
  }, [excalidrawAPI]);

  // Listen for real-time updates from WebSocket
  useEffect(() => {
    if (!currentWorkspace) return
    const unsubscribe = onWorkspaceUpdate((data, isRemoteUpdate) => {
      console.log(`📥 [WORKSPACE] Received update from user ${data.userId}`)
      console.log(`📁 [WORKSPACE] Elements in update: ${data.elements?.length || 0}`)
      console.log(`📎 [WORKSPACE] Current user ID (session): ${session?.user?.id}`)
      console.log(`📎 [WORKSPACE] Project ID (params.id): ${params.id}`)
      console.log(`🔄 [WORKSPACE] Is remote update: ${isRemoteUpdate}`)
      
      // Validate payload format consistency
      console.log('🔍 [WORKSPACE] Payload validation:')
      console.log('  - Elements format:', Array.isArray(data.elements) ? 'array' : typeof data.elements)
      console.log('  - AppState format:', typeof data.appState)
      console.log('  - Timestamp format:', typeof data.timestamp)
      
      // Schema version check (if available)
      if (data.schemaVersion) {
        console.log('  - Schema version:', data.schemaVersion)
      } else {
        console.log('  - Schema version: not provided')
      }

      if (isRemoteUpdate) {
console.log(`🟢 [WORKSPACE] Excalidraw API exists: ${!!excalidrawAPI}`);
        if (excalidrawAPI) {
          console.log(`🟢 [WORKSPACE] Excalidraw API readiness checked: ${excalidrawAPI.ready()}`);
        } else {
          console.log(`🔴 [WORKSPACE] Excalidraw API is null/undefined`);
        }
        if (excalidrawAPI && excalidrawAPI.ready()) {
          console.log(`✅ [WORKSPACE] Applying remote update to workspace state`);
          try {
            // CRITICAL: Set flag IMMEDIATELY to prevent infinite loop
            isApplyingRemoteUpdate.current = true;
            excalidrawAPI.updateScene({
              elements: data.elements,
              appState: data.appState,
            });
            console.log('✅ [WORKSPACE] Remote update applied, clearing flag');
          } catch (error) {
            console.error('❌ [WORKSPACE] Error applying update:', error);
          } finally {
            // Always clear flag immediately after update using setTimeout for next tick
            setTimeout(() => {
              isApplyingRemoteUpdate.current = false;
            }, 0);
          }
        } else {
          console.log('🕒 [WORKSPACE] Queuing update as API is not ready yet');
          console.log(`📊 [WORKSPACE] Queue size before adding: ${updateQueue.current.length}`);
          updateQueue.current.push(data);
          console.log(`📊 [WORKSPACE] Queue size after adding: ${updateQueue.current.length}`);
          
          // Try to flush queue after a short delay in case API becomes ready soon
          setTimeout(() => {
            if (excalidrawAPI && excalidrawAPI.ready()) {
              console.log('⚡ [WORKSPACE] API became ready, attempting to flush queue');
              flushUpdateQueue();
            }
          }, 100);
        }
      } else {
        console.log(`⏭️ [WORKSPACE] Skipping local echo update`)
      }
      
      // Attempt to flush queue just in case it just became ready
      flushUpdateQueue();
    })
    return unsubscribe
  }, [onWorkspaceUpdate, currentWorkspace, session?.user?.id, excalidrawAPI, flushUpdateQueue])

  // Handle changes from Excalidraw with debouncing
  // Handle pointer updates for collaborative cursors
  const handlePointerUpdate = useCallback((payload) => {
    if (!isConnected || !currentWorkspace) return;
    
    const now = Date.now();
    // Throttle pointer updates
    if (now - (lastPointerData.current.lastSent || 0) < 50) return;
    
    lastPointerData.current.lastSent = now;
    
    if (sendPointerUpdate && payload.pointer) {
      sendPointerUpdate({
        workspaceId: currentWorkspace.id,
        userId: session?.user?.id || userId,
        pointer: payload.pointer,
        button: payload.button,
        username: session?.user?.name || `User ${userId.slice(0, 6)}`,
        color: `hsl(${(userId.charCodeAt(0) * 137.508) % 360}, 70%, 50%)`, // Generate consistent color
        timestamp: now
      });
    }
  }, [isConnected, currentWorkspace, userId, sendPointerUpdate, session?.user]);

  // Track if we're currently applying a remote update to prevent loops
  const isApplyingRemoteUpdate = useRef(false)
  const lastUpdateTimestamp = useRef(null)
  
  const handleExcalidrawChange = useCallback((elements, appState, files) => {
    // CRITICAL: Skip processing if we're applying a remote update
    if (isApplyingRemoteUpdate.current) {
      console.log('🚫 [WORKSPACE] Skipping onChange during remote update application')
      return
    }
    
    console.log('🎨 [WORKSPACE] Excalidraw change detected (local)', {
      elementsCount: elements?.length || 0,
      hasAppState: !!appState,
      connected: isConnected
    })
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save (debounced to prevent spam)
    const debounceDelay = isConnected ? 300 : 1000 // Faster updates when connected
    saveTimeoutRef.current = setTimeout(() => {
      autoSaveWorkspace(elements, appState)
    }, debounceDelay)
  }, [autoSaveWorkspace, isConnected])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Flush queued updates when Excalidraw API becomes ready
  useEffect(() => {
    if (isExcalidrawReady && excalidrawAPI) {
      console.log('🚀 [WORKSPACE] Excalidraw API became ready, checking for queued updates');
      console.log(`📊 [WORKSPACE] Current queue size: ${updateQueue.current.length}`);
      
      // Add a small delay to ensure API is fully initialized
      setTimeout(() => {
        flushUpdateQueue();
      }, 100);
    }
  }, [isExcalidrawReady, excalidrawAPI, flushUpdateQueue])

  // Update collaborative cursors when collaborators change
  useEffect(() => {
    if (excalidrawAPI && excalidrawAPI.ready() && collaborators.size > 0) {
      const collaboratorsMap = new Map()
      
      collaborators.forEach((collaborator, userId) => {
        if (collaborator.pointer && userId !== session?.user?.id) {
          collaboratorsMap.set(userId, {
            pointer: collaborator.pointer,
            button: collaborator.button || 'up',
            username: collaborator.username,
            avatarUrl: null,
            color: {
              background: collaborator.color || `hsl(${(userId.charCodeAt(0) * 137.508) % 360}, 70%, 50%)`,
              stroke: collaborator.color || `hsl(${(userId.charCodeAt(0) * 137.508) % 360}, 70%, 40%)`
            }
          })
        }
      })
      
      console.log(`👥 [WORKSPACE] Updating ${collaboratorsMap.size} collaborative cursors`)
      excalidrawAPI.updateCollaborators(collaboratorsMap)
    }
  }, [collaborators, excalidrawAPI, session?.user?.id])

  // Mouse tracking and user following functionality
  const handleFollowUser = useCallback((collaboratorId, collaboratorData) => {
    if (followingUser === collaboratorId) {
      setFollowingUser(null)
      toast.info('Stopped following user')
      return
    }

    setFollowingUser(collaboratorId)
    toast.success(`Now following ${collaboratorData.username || 'User'}`)

    // Follow the user's viewport if they have pointer data
    if (collaboratorData.pointer && excalidrawAPI && excalidrawAPI.ready()) {
      try {
        const appState = excalidrawAPI.getAppState()
        excalidrawAPI.updateScene({
          appState: {
            ...appState,
            scrollX: collaboratorData.pointer.x - window.innerWidth / 2,
            scrollY: collaboratorData.pointer.y - window.innerHeight / 2,
          }
        })
      } catch (error) {
        console.error('Error following user:', error)
      }
    }
  }, [followingUser, excalidrawAPI])

  // Auto-follow user when they move (if following is enabled)
  useEffect(() => {
    if (!followingUser || !excalidrawAPI || !excalidrawAPI.ready()) return

    const collaborator = collaborators.get(followingUser)
    if (collaborator && collaborator.pointer) {
      try {
        const appState = excalidrawAPI.getAppState()
        excalidrawAPI.updateScene({
          appState: {
            ...appState,
            scrollX: collaborator.pointer.x - window.innerWidth / 2,
            scrollY: collaborator.pointer.y - window.innerHeight / 2,
          }
        })
      } catch (error) {
        console.error('Error auto-following user:', error)
      }
    }
  }, [collaborators, followingUser, excalidrawAPI])

  const handleExportImage = async () => {
    if (!excalidrawAPI || !excalidrawAPI.ready()) return

    try {
      const blob = await excalidrawAPI.exportToBlob({
        mimeType: 'image/png',
        quality: 1,
      })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${currentWorkspace?.name || 'workspace'}.png`
      link.click()
      URL.revokeObjectURL(url)
      
      toast.success('Workspace exported successfully')
    } catch (error) {
      console.error('Error exporting workspace:', error)
      toast.error('Failed to export workspace')
    }
  }

  if (loading) {
    return (
      <div 
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: currentTheme.colors.background }}
      >
        <div 
          className="animate-spin h-8 w-8 border-2 border-t-transparent rounded-full"
          style={{ borderColor: `${currentTheme.colors.accent} transparent transparent transparent` }}
        ></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div 
        className="text-center py-12"
        style={{ backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}
      >
        <h3 className="text-lg font-medium mb-2">Project not found</h3>
        <p style={{ color: currentTheme.colors.textMuted }}>
          The project you're looking for doesn't exist or you don't have access to it.
        </p>
      </div>
    )
  }

  return (
    <div 
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: currentTheme.colors.background }}
    >
      {/* Header */}
      <div 
        className="flex-shrink-0 flex items-center justify-between p-4 border-b"
        style={{ 
          backgroundColor: currentTheme.colors.surface,
          borderColor: currentTheme.colors.border,
          color: currentTheme.colors.text
        }}
      >
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.text }}>Workspace</h1>
            <p style={{ color: currentTheme.colors.textMuted }}>
              Collaborative drawing and diagramming for {project.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleTheme}
            style={{
              backgroundColor: currentTheme.components.button.secondary.bg,
              color: currentTheme.components.button.secondary.text,
              borderColor: currentTheme.colors.border
            }}
            className="hover:opacity-80"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          {currentWorkspace && (
            <>
              {/* Status indicators */}
              <div className="flex items-center gap-2 mr-4">
                {isConnected ? (
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: currentTheme.colors.success }}></div>
                    <span className="text-xs" style={{ color: currentTheme.colors.textMuted }}>Online</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: currentTheme.colors.danger }}></div>
                    <span className="text-xs" style={{ color: currentTheme.colors.textMuted }}>Offline</span>
                  </div>
                )}
                
                {autoSaving && (
                  <div 
                    className="animate-spin h-3 w-3 border border-t-transparent rounded-full"
                    style={{ borderColor: `${currentTheme.colors.accent} transparent transparent transparent` }}
                  ></div>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportImage}
                disabled={!excalidrawAPI || !excalidrawAPI.ready()}
                style={{
                  backgroundColor: currentTheme.components.button.secondary.bg,
                  color: currentTheme.components.button.secondary.text,
                  borderColor: currentTheme.colors.border
                }}
                className="hover:opacity-80"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSaveWorkspace}
                disabled={saving || !excalidrawAPI || !excalidrawAPI.ready()}
                style={{
                  backgroundColor: currentTheme.components.button.primary.bg,
                  color: currentTheme.components.button.primary.text,
                  borderColor: currentTheme.colors.border
                }}
                className="hover:opacity-80"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm"
                style={{
                  backgroundColor: currentTheme.components.button.primary.bg,
                  color: currentTheme.components.button.primary.text
                }}
                className="hover:opacity-80"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent 
              style={{
                backgroundColor: currentTheme.colors.surface,
                borderColor: currentTheme.colors.border,
                color: currentTheme.colors.text
              }}
            >
              <DialogHeader>
                <DialogTitle style={{ color: currentTheme.colors.text }}>Create New Workspace</DialogTitle>
                <DialogDescription style={{ color: currentTheme.colors.textMuted }}>
                  Create a new drawing workspace for your project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="workspace-name" style={{ color: currentTheme.colors.text }}>Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name..."
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                    style={{
                      backgroundColor: currentTheme.colors.inputBg,
                      borderColor: currentTheme.colors.border,
                      color: currentTheme.colors.text
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setCreateDialogOpen(false)}
                  style={{
                    backgroundColor: currentTheme.components.button.secondary.bg,
                    color: currentTheme.components.button.secondary.text,
                    borderColor: currentTheme.colors.border
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateWorkspace} 
                  disabled={!newWorkspaceName.trim()}
                  style={{
                    backgroundColor: currentTheme.components.button.primary.bg,
                    color: currentTheme.components.button.primary.text
                  }}
                >
                  Create Workspace
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 flex">
        
        {/* Collapsible Workspace Sidebar */}
        <div className={`${workspacesPanelCollapsed ? 'w-12' : 'w-64'} border-r bg-gray-50 transition-all duration-300 ease-in-out relative`}>
          {/* Collapse/Expand Button */}
          <div className="absolute -right-3 top-4 z-10">
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 bg-white shadow-sm border rounded-full"
              onClick={() => setWorkspacesPanelCollapsed(!workspacesPanelCollapsed)}
            >
              {workspacesPanelCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronLeft className="h-3 w-3" />
              )}
            </Button>
          </div>

          <div className="p-4">
            {!workspacesPanelCollapsed ? (
              <>
                <h3 className="font-medium mb-4">Workspaces</h3>
                
                {workspaces.length === 0 ? (
                  <div className="text-center py-8">
                    <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      No workspaces yet
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Workspace
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workspaces.map((workspace) => (
                      <Card 
                        key={workspace.id}
                        className={`cursor-pointer transition-colors ${
                          currentWorkspace?.id === workspace.id 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => setCurrentWorkspace(workspace)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{workspace.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                Updated {new Date(workspace.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteWorkspace(workspace.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600" title="Workspaces">
                  <FileImage className="h-4 w-4" />
                </div>
                {workspaces.slice(0, 3).map((workspace) => (
                  <div
                    key={workspace.id}
                    className={`w-8 h-8 rounded-md cursor-pointer flex items-center justify-center text-xs font-medium text-white transition-all ${
                      currentWorkspace?.id === workspace.id
                        ? 'ring-2 ring-blue-500 bg-blue-600'
                        : 'bg-gray-400 hover:bg-gray-500'
                    }`}
                    onClick={() => setCurrentWorkspace(workspace)}
                    title={workspace.name}
                  >
                    {workspace.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {workspaces.length > 3 && (
                  <div className="text-xs text-muted-foreground">+{workspaces.length - 3}</div>
                )}
              </div>
            )}
          </div>
        </div>

{/* Excalidraw Canvas */}
        <div className="flex-1" style={{ minHeight: 0 }}>
          {currentWorkspace ? (
            <div style={{ width: '100%', height: '100%' }}>
              <ExcalidrawWrapper
                key={currentWorkspace.id}
                onAPIReady={(api) => {
                  console.log('🔗 [WORKSPACE] Excalidraw API ready callback called:', !!api);
                  setExcalidrawAPI(api);
                  if (api && api.ready && api.ready()) {
                    console.log('✅ [WORKSPACE] Excalidraw API is ready!');
                    setIsExcalidrawReady(true);
                  } else {
                    console.log('⚠️ [WORKSPACE] Excalidraw API not ready yet');
                    setIsExcalidrawReady(false);
                    // Try to check readiness after a short delay
                    setTimeout(() => {
                      if (api && api.ready && api.ready()) {
                        console.log('✅ [WORKSPACE] Excalidraw API is now ready (delayed check)!');
                        setIsExcalidrawReady(true);
                      } else {
                        console.log('⚠️ [WORKSPACE] Still not ready after delay');
                      }
                    }, 500);
                  }
                }}
                initialData={{
                  elements: currentWorkspace.data?.elements || [],
                  appState: {
                    viewBackgroundColor: "#ffffff",
                    currentItemStrokeColor: "#000000",
                    currentItemBackgroundColor: "transparent",
                    currentItemFillStyle: "solid",
                    currentItemStrokeWidth: 1,
                    currentItemStrokeStyle: "solid",
                    currentItemRoughness: 1,
                    currentItemOpacity: 100,
                    currentItemFontFamily: 1,
                    currentItemFontSize: 20,
                    currentItemTextAlign: "left",
                    currentItemStartArrowhead: null,
                    currentItemEndArrowhead: "arrow",
                    scrollX: 0,
                    scrollY: 0,
                    zoom: {
                      value: 1
                    },
                    currentItemLinearStrokeSharpness: "round",
                    gridSize: null,
                    colorPalette: {},
                    ...currentWorkspace.data?.appState,
                    collaborators: new Map()
                  }
                }}
                onChange={handleExcalidrawChange}
                onPointerUpdate={handlePointerUpdate}
                theme="light"
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileImage className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No workspace selected</h3>
                <p className="text-muted-foreground mb-4">
                  Create or select a workspace to start drawing
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workspace
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Profile and Library Panel */}
        <div 
          className="w-64 border-l flex flex-col overflow-hidden"
          style={{
            backgroundColor: currentTheme.colors.surface,
            borderColor: currentTheme.colors.border
          }}
        >
          {/* Profile Panel */}
          <div className="p-4 border-b" style={{ borderColor: currentTheme.colors.border }}>
            <h3 className="font-medium mb-3" style={{ color: currentTheme.colors.text }}>Collaborators</h3>
            
            {/* Current User */}
            <div className="mb-3">
              <div 
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ backgroundColor: currentTheme.colors.background }}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                  style={{ backgroundColor: currentTheme.colors.accent }}
                >
                  {session?.user?.name?.charAt(0).toUpperCase() || 'You'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: currentTheme.colors.text }}>
                    {session?.user?.name || 'You'}
                  </p>
                  <p className="text-xs" style={{ color: currentTheme.colors.textMuted }}>Owner</p>
                </div>
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isConnected ? currentTheme.colors.success : currentTheme.colors.danger }}
                ></div>
              </div>
            </div>
            
            {/* Other Collaborators */}
            <div className="space-y-2">
              {Array.from(collaborators.entries()).map(([collaboratorId, collaborator]) => {
                if (collaboratorId === session?.user?.id) return null
                
                return (
                  <div 
                    key={collaboratorId}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:opacity-80 ${
                      followingUser === collaboratorId ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: followingUser === collaboratorId 
                        ? currentTheme.colors.accent + '20' 
                        : currentTheme.colors.background,
                      ringColor: followingUser === collaboratorId ? currentTheme.colors.accent : 'transparent'
                    }}
                    onClick={() => handleFollowUser(collaboratorId, collaborator)}
                    title={`Click to follow ${collaborator.username || 'User'}`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white relative"
                      style={{ backgroundColor: collaborator.color || currentTheme.colors.accent }}
                    >
                      {(collaborator.username || 'U').charAt(0).toUpperCase()}
                      {followingUser === collaboratorId && (
                        <MousePointer2 
                          className="absolute -top-1 -right-1 h-3 w-3" 
                          style={{ color: currentTheme.colors.accent }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: currentTheme.colors.text }}>
                        {collaborator.username || 'Anonymous User'}
                      </p>
                      <p className="text-xs" style={{ color: currentTheme.colors.textMuted }}>Collaborator</p>
                      {followingUser === collaboratorId && (
                        <p className="text-xs" style={{ color: currentTheme.colors.accent }}>Following</p>
                      )}
                    </div>
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: currentTheme.colors.success }}
                    ></div>
                  </div>
                )
              })}
              
              {collaborators.size === 0 && (
                <div className="text-center py-4">
                  <Users className="h-8 w-8 mx-auto mb-2" style={{ color: currentTheme.colors.textMuted }} />
                  <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>No collaborators online</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Library Panel */}
          <div className="flex-1 p-4">
            <h3 className="font-medium mb-3" style={{ color: currentTheme.colors.text }}>Library</h3>
            <div className="text-center py-12">
              <div 
                className="w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: currentTheme.colors.background }}
              >
                <FileImage className="h-8 w-8" style={{ color: currentTheme.colors.textMuted }} />
              </div>
              <p className="text-sm mb-2" style={{ color: currentTheme.colors.text }}>Shape Library</p>
              <p className="text-xs" style={{ color: currentTheme.colors.textMuted }}>
                Custom shapes and templates will appear here
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
