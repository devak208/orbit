'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { 
  Plus, LogOut, FolderPlus, User, Settings, Kanban, Calendar, List, Clock,
  Search, Bell, Users, MessageCircle, Activity, Filter, MoreHorizontal,
  CheckCircle, Circle, AlertCircle, ArrowRight, UserPlus, Mail, Crown, Zap
} from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Enhanced Sortable Task Component
function SortableTask({ task, onEdit, onDelete, currentUser, onAddComment }) {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white border-red-500'
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, userId: currentUser.id }),
      })
      
      if (response.ok) {
        setNewComment('')
        onAddComment && onAddComment(task.id)
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
            {task.title}
          </h4>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </Badge>
          </div>
        </div>
        
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
        )}
        
        <div className="flex items-center justify-between mb-2">
          {task.assignee && (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {task.assignee.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
            </div>
          )}
          
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.comments?.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowComments(!showComments)}
                className="h-6 px-2 text-xs"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                {task.comments.length}
              </Button>
            )}
            {task.tags?.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                {tag}
              </Badge>
            ))}
          </div>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" onClick={() => onEdit(task)} className="h-6 px-2">
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(task.id)} className="h-6 px-2">
              Delete
            </Button>
          </div>
        </div>
        
        {showComments && (
          <div className="mt-3 space-y-2">
            {task.comments?.map(comment => (
              <div key={comment.id} className="bg-muted rounded-md p-2">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-xs">
                      {comment.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{comment.user?.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs">{comment.content}</p>
              </div>
            ))}
            
            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="text-xs h-8"
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button size="sm" onClick={handleAddComment} className="h-8">
                Add
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Enhanced Kanban Column Component
function KanbanColumn({ title, tasks, status, onEditTask, onDeleteTask, currentUser, onAddComment, count }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'border-t-blue-500 bg-blue-50'
      case 'inprogress': return 'border-t-yellow-500 bg-yellow-50'
      case 'review': return 'border-t-purple-500 bg-purple-50'
      case 'done': return 'border-t-green-500 bg-green-50'
      default: return 'border-t-gray-500 bg-gray-50'
    }
  }

  return (
    <Card className={`flex-1 h-fit min-h-[600px] ${getStatusColor(status)} border-t-4`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {status === 'todo' && <Circle className="h-4 w-4 text-blue-500" />}
            {status === 'inprogress' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
            {status === 'review' && <ArrowRight className="h-4 w-4 text-purple-500" />}
            {status === 'done' && <CheckCircle className="h-4 w-4 text-green-500" />}
            {title}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {count || tasks.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTask 
              key={task.id} 
              task={task} 
              onEdit={onEditTask} 
              onDelete={onDeleteTask}
              currentUser={currentUser}
              onAddComment={onAddComment}
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-8 h-8 mx-auto mb-2 opacity-50">
              {status === 'todo' && <Circle className="h-8 w-8" />}
              {status === 'inprogress' && <AlertCircle className="h-8 w-8" />}
              {status === 'review' && <ArrowRight className="h-8 w-8" />}
              {status === 'done' && <CheckCircle className="h-8 w-8" />}
            </div>
            <p className="text-sm">No {title.toLowerCase()} tasks</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Command Palette Component
function CommandPalette({ isOpen, setIsOpen, onCreateTask, onCreateProject, projects, currentProject, user }) {
  const [search, setSearch] = useState('')
  
  const filteredCommands = [
    {
      category: 'Actions',
      items: [
        { id: 'new-task', label: 'Create New Task', icon: Plus, action: () => { onCreateTask(); setIsOpen(false) } },
        { id: 'new-project', label: 'Create New Project', icon: FolderPlus, action: () => { onCreateProject(); setIsOpen(false) } },
      ]
    },
    {
      category: 'Navigation',
      items: projects.map(project => ({
        id: `project-${project.id}`,
        label: `Go to ${project.name}`,
        icon: Kanban,
        action: () => { /* Handle project navigation */ setIsOpen(false) }
      }))
    }
  ]

  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {filteredCommands.map(group => (
          <CommandGroup key={group.category} heading={group.category}>
            {group.items.map(item => (
              <CommandItem key={item.id} onSelect={item.action}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  )
}

// Team Management Component
function TeamManagement({ project, onInviteMember, user }) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('developer')
  const [isInviting, setIsInviting] = useState(false)

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    
    setIsInviting(true)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          email: inviteEmail,
          role: inviteRole,
          invitedBy: user.id
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setInviteEmail('')
        alert(`Invitation sent to ${inviteEmail}`)
        onInviteMember(data.invitation)
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
    } finally {
      setIsInviting(false)
    }
  }

  const isOwner = user.id === project.ownerId

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Management
        </CardTitle>
        <CardDescription>
          Manage project members and send invitations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Members */}
        <div>
          <h4 className="font-medium mb-3">Team Members</h4>
          <div className="space-y-2">
            {/* Owner */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {project.memberDetails?.find(m => m.id === project.ownerId)?.name?.charAt(0) || 'O'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {project.memberDetails?.find(m => m.id === project.ownerId)?.name || 'Project Owner'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {project.memberDetails?.find(m => m.id === project.ownerId)?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <Badge variant="default">Owner</Badge>
              </div>
            </div>
            
            {/* Members */}
            {project.members?.map(member => {
              const memberDetail = project.memberDetails?.find(m => m.id === member.userId)
              return (
                <div key={member.userId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {memberDetail?.name?.charAt(0) || 'M'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{memberDetail?.name}</p>
                      <p className="text-xs text-muted-foreground">{memberDetail?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <Badge variant="secondary">
                      {member.role === 'developer' ? 'Developer' : member.role}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Invite New Member - Only for owners */}
        {isOwner && (
          <div>
            <h4 className="font-medium mb-3">Invite New Member</h4>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="developer">Developer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" disabled={isInviting} className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                {isInviting ? 'Sending Invitation...' : 'Send Invitation'}
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Main Application Component
const ProjectManagementApp = () => {
  // Authentication state
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'developer' })

  // Application state
  const [projects, setProjects] = useState([])
  const [currentProject, setCurrentProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [currentView, setCurrentView] = useState('kanban')
  
  // Dialog states
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  
  // Form states
  const [projectForm, setProjectForm] = useState({ name: '', description: '', visibility: 'private' })
  const [taskForm, setTaskForm] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    status: 'todo',
    assigneeId: '',
    tags: '',
    dueDate: '',
    estimatedHours: ''
  })

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      loadProjects(userData.id)
    }
    
    // Add keyboard shortcut for command palette
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Authentication functions
  const handleAuth = async (e) => {
    e.preventDefault()
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        loadProjects(data.user.id)
        setAuthForm({ name: '', email: '', password: '', role: 'developer' })
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('Auth error:', error)
      alert('An error occurred during authentication')
    }
  }

  const handleLogout = () => {
    setUser(null)
    setProjects([])
    setCurrentProject(null)
    setTasks([])
    setActivities([])
    localStorage.removeItem('user')
  }

  // Project functions
  const loadProjects = async (userId) => {
    try {
      const response = await fetch(`/api/projects?userId=${userId}`)
      const data = await response.json()
      setProjects(data)
      
      if (data.length > 0 && !currentProject) {
        setCurrentProject(data[0])
        loadTasks(data[0].id)
        loadActivities(data[0].id)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const createProject = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectForm,
          ownerId: user.id
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setProjects([...projects, data])
        setCurrentProject(data)
        loadTasks(data.id)
        loadActivities(data.id)
        setIsProjectDialogOpen(false)
        setProjectForm({ name: '', description: '', visibility: 'private' })
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  // Task functions
  const loadTasks = async (projectId) => {
    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}`)
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const loadActivities = async (projectId) => {
    try {
      const response = await fetch(`/api/activities?projectId=${projectId}`)
      const data = await response.json()
      setActivities(data)
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }

  const createOrUpdateTask = async (e) => {
    e.preventDefault()
    try {
      const isEditing = !!editingTask
      const url = isEditing ? `/api/tasks/${editingTask.id}` : '/api/tasks'
      const method = isEditing ? 'PUT' : 'POST'
      
      const taskData = {
        ...taskForm,
        projectId: currentProject.id,
        assigneeId: taskForm.assigneeId || null,
        tags: taskForm.tags ? taskForm.tags.split(',').map(tag => tag.trim()) : [],
        dueDate: taskForm.dueDate || null,
        estimatedHours: taskForm.estimatedHours ? parseInt(taskForm.estimatedHours) : null,
        updatedBy: user.id
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        if (isEditing) {
          setTasks(tasks.map(task => task.id === editingTask.id ? data : task))
        } else {
          setTasks([...tasks, data])
        }
        
        setIsTaskDialogOpen(false)
        setEditingTask(null)
        setTaskForm({ 
          title: '', description: '', priority: 'medium', status: 'todo',
          assigneeId: '', tags: '', dueDate: '', estimatedHours: ''
        })
        
        // Reload activities
        loadActivities(currentProject.id)
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('Error creating/updating task:', error)
    }
  }

  const deleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setTasks(tasks.filter(task => task.id !== taskId))
        loadActivities(currentProject.id)
      } else {
        const data = await response.json()
        alert(data.error)
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const editTask = (task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assigneeId: task.assigneeId || '',
      tags: task.tags?.join(', ') || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      estimatedHours: task.estimatedHours?.toString() || ''
    })
    setIsTaskDialogOpen(true)
  }

  // Drag and drop handler
  const handleDragEnd = async (event) => {
    const { active, over } = event

    if (!over) return

    const activeTask = tasks.find(task => task.id === active.id)
    if (!activeTask) return

    let newStatus = activeTask.status
    
    // Determine new status from drop target
    const overTask = tasks.find(task => task.id === over.id)
    if (overTask && overTask.status !== activeTask.status) {
      newStatus = overTask.status
    }

    // Check if dropping on a column header or empty area
    const dropZone = over.data?.current?.type
    if (dropZone && ['todo', 'inprogress', 'review', 'done'].includes(dropZone)) {
      newStatus = dropZone
    }

    // Update task status if changed
    if (newStatus !== activeTask.status) {
      try {
        const response = await fetch(`/api/tasks/${activeTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...activeTask, 
            status: newStatus,
            updatedBy: user.id
          }),
        })
        
        if (response.ok) {
          const updatedTask = await response.json()
          setTasks(tasks.map(task => task.id === activeTask.id ? updatedTask : task))
          loadActivities(currentProject.id)
        }
      } catch (error) {
        console.error('Error updating task status:', error)
      }
    }

    // Handle reordering within the same column
    if (active.id !== over.id && overTask && overTask.status === activeTask.status) {
      const oldIndex = tasks.findIndex(task => task.id === active.id)
      const newIndex = tasks.findIndex(task => task.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setTasks(arrayMove(tasks, oldIndex, newIndex))
      }
    }
  }

  // Filter and search tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  // Group tasks by status
  const todoTasks = filteredTasks.filter(task => task.status === 'todo')
  const inProgressTasks = filteredTasks.filter(task => task.status === 'inprogress')
  const reviewTasks = filteredTasks.filter(task => task.status === 'review')
  const doneTasks = filteredTasks.filter(task => task.status === 'done')

  // Get project members for task assignment
  const projectMembers = currentProject ? [
    ...(currentProject.memberDetails || []).filter(m => m.id === currentProject.ownerId),
    ...(currentProject.members?.map(m => 
      currentProject.memberDetails?.find(md => md.id === m.userId)
    ).filter(Boolean) || [])
  ] : []

  // Authentication UI
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4">
              <Kanban className="h-12 w-12 text-blue-600 mx-auto" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {authMode === 'login' ? 'Welcome Back' : 'Join Project Hub'}
            </CardTitle>
            <CardDescription>
              {authMode === 'login' 
                ? 'Sign in to continue to your projects' 
                : 'Create your account to get started'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAuth}>
            <CardContent className="space-y-4">
              {authMode === 'register' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={authForm.role} onValueChange={(value) => setAuthForm({...authForm, role: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="owner">Project Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="w-full"
              >
                {authMode === 'login' 
                  ? 'Need an account? Sign up' 
                  : 'Already have an account? Sign in'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  const isOwner = user.role === 'owner' || currentProject?.ownerId === user.id

  // Main Application UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Command Palette */}
      <Dialog open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen}>
        <DialogContent className="p-0">
          <CommandPalette 
            isOpen={isCommandPaletteOpen}
            setIsOpen={setIsCommandPaletteOpen}
            onCreateTask={() => setIsTaskDialogOpen(true)}
            onCreateProject={() => setIsProjectDialogOpen(true)}
            projects={projects}
            currentProject={currentProject}
            user={user}
          />
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <Kanban className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Project Hub</h1>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tasks... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-80"
                onFocus={() => setIsCommandPaletteOpen(true)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Project Selector */}
            <Select 
              value={currentProject?.id || ''} 
              onValueChange={(projectId) => {
                const project = projects.find(p => p.id === projectId)
                setCurrentProject(project)
                loadTasks(projectId)
                loadActivities(projectId)
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <Kanban className="h-4 w-4" />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Action Buttons */}
            <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={createProject}>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Start a new project and invite your team to collaborate.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-name">Project Name</Label>
                      <Input
                        id="project-name"
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                        placeholder="Enter project name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-description">Description</Label>
                      <Textarea
                        id="project-description"
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                        placeholder="Project description (optional)"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-visibility">Visibility</Label>
                      <Select value={projectForm.visibility} onValueChange={(value) => setProjectForm({...projectForm, visibility: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private - Only invited members</SelectItem>
                          <SelectItem value="team">Team - All team members can access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create Project</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* Team Management Button */}
            {currentProject && (
              <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Team ({(currentProject.members?.length || 0) + 1})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Team Management</DialogTitle>
                    <DialogDescription>
                      Manage team members for {currentProject.name}
                    </DialogDescription>
                  </DialogHeader>
                  <TeamManagement 
                    project={currentProject} 
                    user={user}
                    onInviteMember={() => loadProjects(user.id)}
                  />
                </DialogContent>
              </Dialog>
            )}
            
            {/* User Menu */}
            <div className="flex items-center space-x-3 border-l pl-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{user.name}</p>
                  <div className="flex items-center gap-1">
                    {user.role === 'owner' || isOwner ? (
                      <><Crown className="h-3 w-3 text-yellow-500" /><span className="text-xs text-muted-foreground">Owner</span></>
                    ) : (
                      <><Zap className="h-3 w-3 text-blue-500" /><span className="text-xs text-muted-foreground">Developer</span></>
                    )}
                  </div>
                </div>
              </div>
              
              <Button size="sm" variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {currentProject ? (
          <div className="space-y-6">
            {/* Project Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{currentProject.name}</h2>
                  <Badge variant="outline" className="text-xs">
                    {currentProject.settings?.visibility || 'private'}
                  </Badge>
                </div>
                {currentProject.description && (
                  <p className="text-gray-600">{currentProject.description}</p>
                )}
                
                {/* Project Stats */}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span>{tasks.length} total tasks</span>
                  <span>{doneTasks.length} completed</span>
                  <span>{(currentProject.members?.length || 0) + 1} team members</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <Tabs value={currentView} onValueChange={setCurrentView} className="w-fit">
                  <TabsList>
                    <TabsTrigger value="kanban" className="flex items-center gap-2">
                      <Kanban className="h-4 w-4" />
                      Board
                    </TabsTrigger>
                    <TabsTrigger value="list" className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      List
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Calendar
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <form onSubmit={createOrUpdateTask}>
                      <DialogHeader>
                        <DialogTitle>
                          {editingTask ? 'Edit Task' : 'Create New Task'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingTask ? 'Update task details and properties.' : 'Add a new task to your project backlog.'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="task-title">Title</Label>
                          <Input
                            id="task-title"
                            value={taskForm.title}
                            onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                            placeholder="Enter task title"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="task-description">Description</Label>
                          <Textarea
                            id="task-description"
                            value={taskForm.description}
                            onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                            placeholder="Describe the task in detail"
                            rows={3}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="task-status">Status</Label>
                            <Select
                              value={taskForm.status}
                              onValueChange={(value) => setTaskForm({...taskForm, status: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="inprogress">In Progress</SelectItem>
                                <SelectItem value="review">In Review</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="task-priority">Priority</Label>
                            <Select
                              value={taskForm.priority}
                              onValueChange={(value) => setTaskForm({...taskForm, priority: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="task-assignee">Assignee</Label>
                            <Select
                              value={taskForm.assigneeId}
                              onValueChange={(value) => setTaskForm({...taskForm, assigneeId: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select assignee" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Unassigned</SelectItem>
                                {projectMembers.map(member => (
                                  <SelectItem key={member.id} value={member.id}>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-4 w-4">
                                        <AvatarFallback className="text-xs">
                                          {member.name?.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      {member.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="task-due-date">Due Date</Label>
                            <Input
                              id="task-due-date"
                              type="date"
                              value={taskForm.dueDate}
                              onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="task-tags">Tags (comma separated)</Label>
                            <Input
                              id="task-tags"
                              value={taskForm.tags}
                              onChange={(e) => setTaskForm({...taskForm, tags: e.target.value})}
                              placeholder="frontend, bug, feature"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="task-hours">Estimated Hours</Label>
                            <Input
                              id="task-hours"
                              type="number"
                              value={taskForm.estimatedHours}
                              onChange={(e) => setTaskForm({...taskForm, estimatedHours: e.target.value})}
                              placeholder="8"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">
                          {editingTask ? 'Update Task' : 'Create Task'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="inprogress">In Progress</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              {(searchQuery || filterStatus !== 'all' || filterPriority !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSearchQuery('')
                    setFilterStatus('all')
                    setFilterPriority('all')
                  }}
                >
                  Clear Filters
                </Button>
              )}
              
              <div className="ml-auto text-sm text-muted-foreground">
                {filteredTasks.length} of {tasks.length} tasks
              </div>
            </div>

            {/* Views */}
            <Tabs value={currentView} className="w-full">
              <TabsContent value="kanban">
                {/* Kanban Board */}
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <KanbanColumn
                      title="To Do"
                      tasks={todoTasks}
                      status="todo"
                      count={tasks.filter(t => t.status === 'todo').length}
                      onEditTask={editTask}
                      onDeleteTask={deleteTask}
                      currentUser={user}
                      onAddComment={() => loadTasks(currentProject.id)}
                    />
                    <KanbanColumn
                      title="In Progress"
                      tasks={inProgressTasks}
                      status="inprogress"
                      count={tasks.filter(t => t.status === 'inprogress').length}
                      onEditTask={editTask}
                      onDeleteTask={deleteTask}
                      currentUser={user}
                      onAddComment={() => loadTasks(currentProject.id)}
                    />
                    <KanbanColumn
                      title="In Review"
                      tasks={reviewTasks}
                      status="review"
                      count={tasks.filter(t => t.status === 'review').length}
                      onEditTask={editTask}
                      onDeleteTask={deleteTask}
                      currentUser={user}
                      onAddComment={() => loadTasks(currentProject.id)}
                    />
                    <KanbanColumn
                      title="Done"
                      tasks={doneTasks}
                      status="done"
                      count={tasks.filter(t => t.status === 'done').length}
                      onEditTask={editTask}
                      onDeleteTask={deleteTask}
                      currentUser={user}
                      onAddComment={() => loadTasks(currentProject.id)}
                    />
                  </div>
                </DndContext>
              </TabsContent>
              
              <TabsContent value="list">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <List className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">List View</h3>
                      <p className="text-gray-600">Coming soon - List view with sorting and filtering</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="calendar">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar View</h3>
                      <p className="text-gray-600">Coming soon - Calendar view with due dates and milestones</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Activity Feed Sidebar */}
            {activities.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-80 overflow-y-auto">
                  <div className="space-y-3">
                    {activities.slice(0, 10).map(activity => (
                      <div key={activity.id} className="flex items-start gap-3 text-sm">
                        <Avatar className="h-6 w-6 mt-0.5">
                          <AvatarFallback className="text-xs">
                            {activity.user?.name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p>
                            <span className="font-medium">{activity.user?.name || 'System'}</span>
                            {' '}
                            {activity.action === 'task_created' && 'created task'}
                            {activity.action === 'task_status_changed' && 'moved task'}
                            {activity.action === 'project_created' && 'created project'}
                            {activity.action === 'member_invited' && 'invited member'}
                            {activity.action === 'member_joined' && 'joined project'}
                            {' '}
                            {activity.metadata?.taskTitle && (
                              <span className="font-medium text-blue-600">
                                "{activity.metadata.taskTitle}"
                              </span>
                            )}
                            {activity.metadata?.projectName && (
                              <span className="font-medium text-blue-600">
                                "{activity.metadata.projectName}"
                              </span>
                            )}
                            {activity.metadata?.fromStatus && activity.metadata?.toStatus && (
                              <span> from {activity.metadata.fromStatus} to {activity.metadata.toStatus}</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <FolderPlus className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Create Your First Project</h3>
              <p className="text-gray-600 mb-8">
                Get started by creating a project to organize your tasks and collaborate with your team.
              </p>
              <Button onClick={() => setIsProjectDialogOpen(true)} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Project
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ProjectManagementApp