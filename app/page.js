'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, LogOut, FolderPlus, User, Settings, Kanban, Calendar } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Sortable Task Component
function SortableTask({ task, onEdit, onDelete }) {
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
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
          <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </Badge>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
        )}
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {new Date(task.createdAt).toLocaleDateString()}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => onEdit(task)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(task.id)}>
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Kanban Column Component
function KanbanColumn({ title, tasks, status, onEditTask, onDeleteTask }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'border-t-blue-500'
      case 'inprogress': return 'border-t-yellow-500'
      case 'done': return 'border-t-green-500'
      default: return 'border-t-gray-500'
    }
  }

  return (
    <Card className={`flex-1 h-fit min-h-[500px] ${getStatusColor(status)}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
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
            />
          ))}
        </SortableContext>
      </CardContent>
    </Card>
  )
}

const ProjectManagementApp = () => {
  // Authentication state
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })

  // Application state
  const [projects, setProjects] = useState([])
  const [currentProject, setCurrentProject] = useState(null)
  const [tasks, setTasks] = useState([])
  
  // Dialog states
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  
  // Form states
  const [projectForm, setProjectForm] = useState({ name: '', description: '' })
  const [taskForm, setTaskForm] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    status: 'todo' 
  })

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
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
        setAuthForm({ name: '', email: '', password: '' })
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
        setIsProjectDialogOpen(false)
        setProjectForm({ name: '', description: '' })
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

  const createOrUpdateTask = async (e) => {
    e.preventDefault()
    try {
      const isEditing = !!editingTask
      const url = isEditing ? `/api/tasks/${editingTask.id}` : '/api/tasks'
      const method = isEditing ? 'PUT' : 'POST'
      
      const taskData = isEditing 
        ? taskForm 
        : { ...taskForm, projectId: currentProject.id }

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
        setTaskForm({ title: '', description: '', priority: 'medium', status: 'todo' })
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
      status: task.status
    })
    setIsTaskDialogOpen(true)
  }

  // Drag and drop handler
  const handleDragEnd = async (event) => {
    const { active, over } = event

    if (!over) return

    const activeTask = tasks.find(task => task.id === active.id)
    if (!activeTask) return

    // Determine the new status based on drop target
    let newStatus = activeTask.status
    
    // If dropped on a column, update status
    const dropColumn = event.over?.data?.current?.sortable?.containerId
    if (dropColumn) {
      newStatus = dropColumn
    }

    // Update task status if changed
    if (newStatus !== activeTask.status) {
      try {
        const response = await fetch(`/api/tasks/${activeTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...activeTask, status: newStatus }),
        })
        
        if (response.ok) {
          const updatedTask = await response.json()
          setTasks(tasks.map(task => task.id === activeTask.id ? updatedTask : task))
        }
      } catch (error) {
        console.error('Error updating task status:', error)
      }
    }

    // Handle reordering within the same column
    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex(task => task.id === active.id)
      const newIndex = tasks.findIndex(task => task.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setTasks(arrayMove(tasks, oldIndex, newIndex))
      }
    }
  }

  // Group tasks by status
  const todoTasks = tasks.filter(task => task.status === 'todo')
  const inProgressTasks = tasks.filter(task => task.status === 'inprogress')
  const doneTasks = tasks.filter(task => task.status === 'done')

  // Authentication UI
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-center">
              {authMode === 'login' ? 'Sign in to your account' : 'Sign up to get started'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAuth}>
            <CardContent className="space-y-4">
              {authMode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
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
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button type="submit" className="w-full">
                {authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="w-full"
              >
                {authMode === 'login' ? 'Need an account?' : 'Already have an account?'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  // Main Application UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Kanban className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Project Hub</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select 
              value={currentProject?.id || ''} 
              onValueChange={(projectId) => {
                const project = projects.find(p => p.id === projectId)
                setCurrentProject(project)
                loadTasks(projectId)
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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
                      Add a new project to organize your tasks.
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
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create Project</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
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
                <h2 className="text-2xl font-bold text-gray-900">{currentProject.name}</h2>
                {currentProject.description && (
                  <p className="text-gray-600 mt-1">{currentProject.description}</p>
                )}
              </div>
              
              <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={createOrUpdateTask}>
                    <DialogHeader>
                      <DialogTitle>
                        {editingTask ? 'Edit Task' : 'Create New Task'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingTask ? 'Update task details.' : 'Add a new task to your project.'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="task-title">Title</Label>
                        <Input
                          id="task-title"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                          placeholder="Task title"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task-description">Description</Label>
                        <Textarea
                          id="task-description"
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                          placeholder="Task description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
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
                            </SelectContent>
                          </Select>
                        </div>
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
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
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

            {/* Kanban Board */}
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KanbanColumn
                  title="To Do"
                  tasks={todoTasks}
                  status="todo"
                  onEditTask={editTask}
                  onDeleteTask={deleteTask}
                />
                <KanbanColumn
                  title="In Progress"
                  tasks={inProgressTasks}
                  status="inprogress"
                  onEditTask={editTask}
                  onDeleteTask={deleteTask}
                />
                <KanbanColumn
                  title="Done"
                  tasks={doneTasks}
                  status="done"
                  onEditTask={editTask}
                  onDeleteTask={deleteTask}
                />
              </div>
            </DndContext>
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first project.</p>
            <Button onClick={() => setIsProjectDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

export default ProjectManagementApp