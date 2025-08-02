import NotificationTest from './notification-test'

export default function TestPage() {
  return <NotificationTest />
}
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  Bell, 
  Send, 
  Activity, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  MessageSquare,
  Calendar,
  Clock,
  Zap
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { toast } from 'sonner'

export default function NotificationTestPage() {
  const [testData, setTestData] = useState({
    type: 'test_notification',
    projectId: '',
    inviteeEmail: '',
    taskId: '',
    assigneeId: '',
    mentionedUserId: '',
    role: 'MEMBER',
    commentContent: ''
  })
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])

  const {
    isConnected,
    notifications,
    unreadCount,
    lastNotification,
    markAsRead,
    markAllAsRead,
    clearLastNotification
  } = useNotifications()

  useEffect(() => {
    fetchStats()
    fetchProjects()
    fetchUsers()
  }, [])

  useEffect(() => {
    if (lastNotification) {
      toast.success(`New notification: ${lastNotification.title}`)
      clearLastNotification()
    }
  }, [lastNotification, clearLastNotification])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/notifications/trigger')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/search?q=')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchTasks = async (projectId) => {
    if (!projectId) return
    
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const handleTriggerNotification = async () => {
    setLoading(true)
    try {
      const payload = {
        type: testData.type,
        data: {}
      }

      // Build data based on notification type
      switch (testData.type) {
        case 'project_invitation':
          payload.data = {
            projectId: testData.projectId,
            inviteeEmail: testData.inviteeEmail,
            role: testData.role
          }
          break
        case 'task_assigned':
          payload.data = {
            taskId: testData.taskId,
            assigneeId: testData.assigneeId
          }
          break
        case 'task_mention':
          payload.data = {
            taskId: testData.taskId,
            mentionedUserId: testData.mentionedUserId,
            commentContent: testData.commentContent || 'Test mention comment'
          }
          break
        case 'task_due_soon':
        case 'task_overdue':
          payload.data = {
            taskId: testData.taskId,
            assigneeId: testData.assigneeId
          }
          break
      }

      const response = await fetch('/api/notifications/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        await fetchStats() // Refresh stats
      } else {
        const error = await response.json()
        toast.error(error.error)
      }
    } catch (error) {
      console.error('Error triggering notification:', error)
      toast.error('Failed to trigger notification')
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'project_invitation':
        return <Users className="h-4 w-4" />
      case 'task_assigned':
        return <CheckCircle className="h-4 w-4" />
      case 'task_mention':
        return <MessageSquare className="h-4 w-4" />
      case 'task_due_soon':
        return <Clock className="h-4 w-4" />
      case 'task_overdue':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Testing</h1>
          <p className="text-muted-foreground">
            Test and monitor the notification system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} unread</Badge>
          )}
        </div>
      </div>

      {/* System Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.stats.total}</div>
                  <p className="text-xs text-muted-foreground">Total Notifications</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.stats.unread}</div>
                  <p className="text-xs text-muted-foreground">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.stats.inboxUnread}</div>
                  <p className="text-xs text-muted-foreground">Inbox Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${stats.systemHealth.webSocketConnected ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <div className="text-sm font-bold">
                    {stats.systemHealth.notificationService}
                  </div>
                  <p className="text-xs text-muted-foreground">Service Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Trigger */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger Test Notification</CardTitle>
            <CardDescription>
              Create test notifications to verify the system is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Notification Type</Label>
              <Select value={testData.type} onValueChange={(value) => setTestData({ ...testData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test_notification">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Test Notification
                    </div>
                  </SelectItem>
                  <SelectItem value="project_invitation">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Project Invitation
                    </div>
                  </SelectItem>
                  <SelectItem value="task_assigned">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Task Assigned
                    </div>
                  </SelectItem>
                  <SelectItem value="task_mention">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Task Mention
                    </div>
                  </SelectItem>
                  <SelectItem value="task_due_soon">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Task Due Soon
                    </div>
                  </SelectItem>
                  <SelectItem value="task_overdue">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Task Overdue
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Project Invitation Fields */}
            {testData.type === 'project_invitation' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select value={testData.projectId} onValueChange={(value) => setTestData({ ...testData, projectId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="inviteeEmail">Invitee Email</Label>
                  <Input
                    id="inviteeEmail"
                    type="email"
                    value={testData.inviteeEmail}
                    onChange={(e) => setTestData({ ...testData, inviteeEmail: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={testData.role} onValueChange={(value) => setTestData({ ...testData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Task-related Fields */}
            {(testData.type.includes('task_') && testData.type !== 'test_notification') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select 
                    value={testData.projectId} 
                    onValueChange={(value) => {
                      setTestData({ ...testData, projectId: value })
                      fetchTasks(value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="task">Task</Label>
                  <Select value={testData.taskId} onValueChange={(value) => setTestData({ ...testData, taskId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a task" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map(task => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(testData.type === 'task_assigned' || testData.type === 'task_due_soon' || testData.type === 'task_overdue') && (
                  <div className="space-y-2">
                    <Label htmlFor="assignee">Assignee</Label>
                    <Select value={testData.assigneeId} onValueChange={(value) => setTestData({ ...testData, assigneeId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {testData.type === 'task_mention' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="mentionedUser">Mentioned User</Label>
                      <Select value={testData.mentionedUserId} onValueChange={(value) => setTestData({ ...testData, mentionedUserId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="comment">Comment Content</Label>
                      <Textarea
                        id="comment"
                        value={testData.commentContent}
                        onChange={(e) => setTestData({ ...testData, commentContent: e.target.value })}
                        placeholder="Enter comment content..."
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <Button 
              onClick={handleTriggerNotification} 
              disabled={loading}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {loading ? 'Sending...' : 'Trigger Notification'}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Notifications</CardTitle>
                <CardDescription>Latest notifications from the system</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark All Read
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 10).map(notification => (
                  <div 
                    key={notification.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      notification.isRead ? 'bg-muted/20' : 'bg-primary/5 border-primary/20'
                    }`}
                    onClick={() => markAsRead([notification.id])}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {notification.type.replace('_', ' ').toLowerCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {notification.timeAgo || new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
