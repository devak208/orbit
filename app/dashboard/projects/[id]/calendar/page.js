'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import enUS from 'date-fns/locale/en-US'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon, Filter, Plus } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default function ProjectCalendarPage() {
  const params = useParams()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('month')
  const [date, setDate] = useState(new Date())
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedTask, setSelectedTask] = useState(null)
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    dueDate: null,
    priority: 'MEDIUM',
    status: 'TODO'
  })

  useEffect(() => {
    if (params.id) {
      fetchProjectCalendar()
    }
  }, [params.id])

  const fetchProjectCalendar = async () => {
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
      }
    } catch (error) {
      console.error('Error fetching project calendar:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTaskEvents = () => {
    const filteredTasks = tasks.filter(task => {
      if (filterStatus === 'all') return true
      return task.status === filterStatus
    })

    return filteredTasks
      .filter(task => task.dueDate)
      .map(task => ({
        id: task.id,
        title: task.title,
        start: new Date(task.dueDate),
        end: new Date(task.dueDate),
        resource: task,
        allDay: true
      }))
  }

  const eventStyleGetter = (event) => {
    const task = event.resource
    let backgroundColor = '#3b82f6'

    switch (task.priority) {
      case 'HIGH':
        backgroundColor = '#ef4444'
        break
      case 'MEDIUM':
        backgroundColor = '#f59e0b'
        break
      case 'LOW':
        backgroundColor = '#10b981'
        break
    }

    if (task.status === 'DONE') {
      backgroundColor = '#6b7280'
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: task.status === 'DONE' ? 0.6 : 1,
        color: 'white',
        border: 'none',
        fontSize: '12px'
      }
    }
  }

  const handleSelectEvent = (event) => {
    setSelectedTask(event.resource)
    setTaskDetailsOpen(true)
  }

  const handleSelectSlot = ({ start, end }) => {
    setNewTaskData({ ...newTaskData, dueDate: start })
    setCreateTaskOpen(true)
  }

  const handleCreateTask = async () => {
    if (!newTaskData.title.trim()) return
    
    try {
      const response = await fetch(`/api/projects/${params.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskData)
      })
      
      if (response.ok) {
        const { task } = await response.json()
        setTasks([...tasks, task])
        setCreateTaskOpen(false)
        setNewTaskData({
          title: '',
          description: '',
          dueDate: null,
          priority: 'MEDIUM',
          status: 'TODO'
        })
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        ))
        if (selectedTask?.id === taskId) {
          setSelectedTask({ ...selectedTask, status: newStatus })
        }
      }
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const CustomEvent = ({ event }) => (
    <div className="flex items-center gap-1 p-1">
      <div 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: event.resource.status === 'DONE' ? '#6b7280' : '#ffffff' }}
      />
      <span className="truncate text-xs">{event.title}</span>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
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
            <p className="text-sm text-muted-foreground">Calendar View</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => setCreateTaskOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Calendar Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.filter(t => {
                if (!t.dueDate) return false
                const taskDate = new Date(t.dueDate)
                const currentDate = new Date()
                return taskDate.getMonth() === currentDate.getMonth() && 
                       taskDate.getFullYear() === currentDate.getFullYear()
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">tasks due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <CalendarIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {tasks.filter(t => {
                if (!t.dueDate || t.status === 'DONE') return false
                return new Date(t.dueDate) < new Date()
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">tasks overdue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <CalendarIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.filter(t => {
                if (!t.dueDate) return false
                const taskDate = new Date(t.dueDate)
                const currentDate = new Date()
                const weekStart = startOfWeek(currentDate)
                const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
                return taskDate >= weekStart && taskDate < weekEnd
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">tasks due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CalendarIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'DONE').length}
            </div>
            <p className="text-xs text-muted-foreground">tasks done</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Low Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded opacity-60"></div>
              <span className="text-sm">Completed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={getTaskEvents()}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              components={{
                event: CustomEvent
              }}
              views={['month', 'week', 'day', 'agenda']}
              popup
              style={{
                fontSize: '14px'
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Create a new task {newTaskData.dueDate && `due on ${format(new Date(newTaskData.dueDate), 'PP')}`}
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
              <Label>Description</Label>
              <Textarea
                placeholder="Enter task description (optional)"
                value={newTaskData.description}
                onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newTaskData.priority} onValueChange={(value) => setNewTaskData({ ...newTaskData, priority: value })}>
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
                <Select value={newTaskData.status} onValueChange={(value) => setNewTaskData({ ...newTaskData, status: value })}>
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
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTaskOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={!newTaskData.title.trim()}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog */}
      <Dialog open={taskDetailsOpen} onOpenChange={setTaskDetailsOpen}>
        {selectedTask && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTask.title}</DialogTitle>
              <DialogDescription>
                {selectedTask.dueDate && `Due: ${format(new Date(selectedTask.dueDate), 'PP')}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedTask.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedTask.description}</p>
                </div>
              )}
              
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Badge className={`ml-2 ${
                    selectedTask.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                    selectedTask.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Select value={selectedTask.status} onValueChange={(value) => handleUpdateTaskStatus(selectedTask.id, value)}>
                    <SelectTrigger className="w-[140px] ml-2">
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
              
              <div className="text-xs text-muted-foreground">
                Created: {format(new Date(selectedTask.createdAt), 'PPp')}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
