'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, MoreHorizontal, Filter, ChevronDown } from 'lucide-react'

export default function ProjectBoardPage() {
  const params = useParams()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [projectMembers, setProjectMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [editingCell, setEditingCell] = useState({ taskId: null, field: null })
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: '',
    assigneeId: 'unassigned'
  })

  useEffect(() => {
    if (params.id) {
      fetchProjectBoard()
    }
  }, [params.id])

  const fetchProjectBoard = async () => {
    try {
      const [projectResponse, tasksResponse] = await Promise.all([
        fetch(`/api/projects/${params.id}`),
        fetch(`/api/projects/${params.id}/tasks`)
      ])

      if (projectResponse.ok && tasksResponse.ok) {
        const projectData = await projectResponse.json()
        const tasksData = await tasksResponse.json()
        
        setProject(projectData.project)
        setTasks(tasksData.tasks)
        
        // Collect all project members (owner + members)
        const allMembers = []
        if (projectData.project.owner) {
          allMembers.push(projectData.project.owner)
        }
        if (projectData.project.members) {
          projectData.project.members.forEach(member => {
            if (member.user && !allMembers.find(m => m.id === member.user.id)) {
              allMembers.push(member.user)
            }
          })
        }
        setProjectMembers(allMembers)
        
        // Find current user's role and set current user ID
        setCurrentUserId(projectData.currentUserId)
        const currentMember = projectData.project.members?.find(m => m.user?.id === projectData.currentUserId)
        setCurrentUserRole(currentMember?.role || null)
      }
    } catch (error) {
      console.error('Error fetching project board:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-save inline edits
  const updateTaskField = async (taskId, field, value) => {
    try {
      const updateData = {}
      if (field === 'dueDate') {
        updateData[field] = value ? new Date(value).toISOString() : null
      } else if (field === 'assigneeId') {
        updateData[field] = value || null
      } else {
        updateData[field] = value
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const { task } = await response.json()
        setTasks(tasks.map(t => t.id === taskId ? task : t))
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleTaskTitleEdit = async (taskId, newTitle) => {
    if (newTitle.trim()) {
      await updateTaskField(taskId, 'title', newTitle.trim())
    }
    setEditingCell({ taskId: null, field: null })
  }

  const handleTaskDescriptionEdit = async (taskId, newDescription) => {
    await updateTaskField(taskId, 'description', newDescription)
    setEditingCell({ taskId: null, field: null })
  }

  // Check if user can edit a specific task field
  const canEditTaskField = (task, field) => {
    // OWNER and ADMIN can edit anything
    if (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') {
      return true
    }
    
    // MEMBER can only edit status of tasks assigned to them
    if (currentUserRole === 'MEMBER') {
      if (field === 'status' && task.assigneeId === currentUserId) {
        return true
      }
      return false
    }
    
    return false
  }

  const handleCreateTask = async () => {
    if (!newTaskData.title.trim()) return
    
    try {
      // Convert 'unassigned' to null for the API
      const taskData = {
        ...newTaskData,
        assigneeId: newTaskData.assigneeId === 'unassigned' ? null : newTaskData.assigneeId
      }
      
      const response = await fetch(`/api/projects/${params.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })
      
      if (response.ok) {
        const { task } = await response.json()
        setTasks([...tasks, task])
        setCreateTaskOpen(false)
        setNewTaskData({
          title: '',
          description: '',
          priority: 'MEDIUM',
          status: 'TODO',
          dueDate: '',
          assigneeId: 'unassigned'
        })
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }


  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
              <div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 bg-gray-200 rounded w-20"></div>
              <div className="h-9 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <div className="grid grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border-b last:border-b-0">
                <div className="grid grid-cols-6 gap-4">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">Project not found</h3>
        <p className="text-muted-foreground">
          The project you're looking for doesn't exist or you don't have access to it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-6 w-6 rounded-sm"
            style={{ backgroundColor: project.color || '#6b7280' }}
          />
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
            <Button onClick={() => setCreateTaskOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground">No tasks yet</p>
                    <Button variant="ghost" onClick={() => setCreateTaskOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first task
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map(task => (
                <TableRow key={task.id} className="hover:bg-muted/50">
                  {/* Task Title & Description */}
                  <TableCell>
                    <div className="space-y-1">
                      {editingCell.taskId === task.id && editingCell.field === 'title' ? (
                        <Input
                          defaultValue={task.title}
                          autoFocus
                          onBlur={(e) => handleTaskTitleEdit(task.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleTaskTitleEdit(task.id, e.target.value)
                            } else if (e.key === 'Escape') {
                              setEditingCell({ taskId: null, field: null })
                            }
                          }}
                          className="font-medium"
                        />
                      ) : (
                        <div 
                          className={`font-medium ${canEditTaskField(task, 'title') ? 'cursor-pointer hover:bg-muted/50' : ''} px-2 py-1 rounded`}
                          onClick={() => canEditTaskField(task, 'title') && setEditingCell({ taskId: task.id, field: 'title' })}
                        >
                          {task.title}
                        </div>
                      )}
                      
                      {editingCell.taskId === task.id && editingCell.field === 'description' ? (
                        <Textarea
                          defaultValue={task.description || ''}
                          autoFocus
                          onBlur={(e) => handleTaskDescriptionEdit(task.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              handleTaskDescriptionEdit(task.id, e.target.value)
                            } else if (e.key === 'Escape') {
                              setEditingCell({ taskId: null, field: null })
                            }
                          }}
                          className="text-sm min-h-[60px]"
                        />
                      ) : (
                        <div 
                          className={`text-sm text-muted-foreground line-clamp-1 ${canEditTaskField(task, 'description') ? 'cursor-pointer hover:bg-muted/50' : ''} px-2 py-1 rounded`}
                          onClick={() => canEditTaskField(task, 'description') && setEditingCell({ taskId: task.id, field: 'description' })}
                        >
                          {task.description || 'Click to add description...'}
                        </div>
                      )}
                      
                      {task.labels && task.labels.length > 0 && (
                        <div className="flex gap-1">
                          {task.labels.map(labelItem => (
                            <div
                              key={labelItem.id}
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: labelItem.label.color }}
                              title={labelItem.label.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild disabled={!canEditTaskField(task, 'status')}>
                        <Button variant="ghost" size="sm" className="h-auto p-1">
                          <Badge variant="outline" className={`capitalize ${canEditTaskField(task, 'status') ? 'cursor-pointer hover:bg-muted' : 'cursor-not-allowed'}`}>
                            {task.status.toLowerCase().replace('_', ' ')}
                            <ChevronDown className="ml-1 h-3 w-3" />
                          </Badge>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-0">
                        <div className="space-y-1 p-1">
                          {['TODO', 'IN_PROGRESS', 'DONE'].map(status => (
                            <button
                              key={status}
                              className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
                              onClick={() => updateTaskField(task.id, 'status', status)}
                            >
                              {status.toLowerCase().replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  
                  {/* Priority */}
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild disabled={!canEditTaskField(task, 'priority')}>
                        <Button variant="ghost" size="sm" className="h-auto p-1">
                          <Badge className={`${getPriorityColor(task.priority)} ${canEditTaskField(task, 'priority') ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}`}>
                            {task.priority}
                            <ChevronDown className="ml-1 h-3 w-3" />
                          </Badge>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-32 p-0">
                        <div className="space-y-1 p-1">
                          {['LOW', 'MEDIUM', 'HIGH'].map(priority => (
                            <button
                              key={priority}
                              className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
                              onClick={() => updateTaskField(task.id, 'priority', priority)}
                            >
                              <Badge className={getPriorityColor(priority)}>
                                {priority}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  
                  {/* Due Date */}
                  <TableCell>
                    <Input
                      type="date"
                      value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => updateTaskField(task.id, 'dueDate', e.target.value)}
                      className={`w-auto border-none shadow-none ${canEditTaskField(task, 'dueDate') ? 'hover:bg-muted cursor-pointer' : 'cursor-not-allowed bg-transparent'}`}
                      disabled={!canEditTaskField(task, 'dueDate')}
                    />
                  </TableCell>
                  
                  {/* Assignee */}
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild disabled={!canEditTaskField(task, 'assigneeId')}>
                        <Button variant="ghost" size="sm" className="h-auto p-1">
                          {task.assignee ? (
                            <div className={`flex items-center gap-2 ${canEditTaskField(task, 'assigneeId') ? 'cursor-pointer hover:bg-muted' : 'cursor-not-allowed'} px-2 py-1 rounded`}>
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={task.assignee.image} />
                                <AvatarFallback className="text-xs">
                                  {task.assignee.name?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{task.assignee.name}</span>
                              <ChevronDown className="h-3 w-3" />
                            </div>
                          ) : (
                            <div className={`flex items-center gap-1 text-muted-foreground ${canEditTaskField(task, 'assigneeId') ? 'cursor-pointer hover:bg-muted' : 'cursor-not-allowed'} px-2 py-1 rounded`}>
                              <span>Unassigned</span>
                              <ChevronDown className="h-3 w-3" />
                            </div>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-0">
                        <div className="space-y-1 p-1">
                          <button
                            className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
                            onClick={() => updateTaskField(task.id, 'assigneeId', null)}
                          >
                            Unassigned
                          </button>
                          {projectMembers.map(member => (
                            <button
                              key={member.id}
                              className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded flex items-center gap-2"
                              onClick={() => updateTaskField(task.id, 'assigneeId', member.id)}
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={member.image} />
                                <AvatarFallback className="text-xs">{member.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              {member.name}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  
                  {/* Actions - Remove this column since we have inline editing */}
                  <TableCell></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to the project board.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input
                placeholder="Enter task title"
                value={newTaskData.title}
                onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notes/Description</Label>
              <Textarea
                placeholder="Enter task notes or description (optional)"
                value={newTaskData.description}
                onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={newTaskData.priority}
                  onValueChange={(value) => setNewTaskData({ ...newTaskData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={newTaskData.status}
                  onValueChange={(value) => setNewTaskData({ ...newTaskData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={newTaskData.assigneeId}
                  onValueChange={(value) => setNewTaskData({ ...newTaskData, assigneeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {projectMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.image} />
                            <AvatarFallback>{member.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {member.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input 
                  type="date"
                  value={newTaskData.dueDate}
                  onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateTaskOpen(false)
                setNewTaskData({
                  title: '',
                  description: '',
                  priority: 'MEDIUM',
                  status: 'TODO',
                  dueDate: '',
                  assigneeId: 'unassigned'
                })
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={!newTaskData.title.trim()}
            >
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
