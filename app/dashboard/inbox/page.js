'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Check, 
  Mail, 
  Archive, 
  Trash2, 
  Inbox as InboxIcon, 
  Circle, 
  CheckCircle, 
  XCircle,
  Bell,
  BellOff,
  Filter,
  Settings,
  MoreVertical,
  RefreshCw,
  ChevronDown,
  Clock,
  AlertTriangle,
  Info
} from 'lucide-react'
import { Skeleton } from '@/components/ui/loading'
import { useNotifications } from '@/hooks/useNotifications'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export default function InboxPage() {
  const [inboxItems, setInboxItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [filter, setFilter] = useState('active') // active, archived, all
  const [typeFilter, setTypeFilter] = useState('all')
  const [stats, setStats] = useState({})
  const [refreshing, setRefreshing] = useState(false)

  // Use the new notification hook
  const {
    isConnected,
    unreadCount,
    lastNotification,
    markAsRead: markNotificationsAsRead,
    markAllAsRead,
    clearLastNotification
  } = useNotifications()

  useEffect(() => {
    fetchInboxItems()
  }, [filter, typeFilter])

  // Listen for real-time updates
  useEffect(() => {
    if (lastNotification) {
      // Refresh inbox when new notifications arrive
      fetchInboxItems()
      clearLastNotification()
    }
  }, [lastNotification, clearLastNotification])

  const fetchInboxItems = async () => {
    setRefreshing(true)
    try {
      const params = new URLSearchParams({
        filter,
        ...(typeFilter !== 'all' && { type: typeFilter }),
        limit: '100'
      })
      
      const response = await fetch(`/api/inbox?${params}`)
      if (response.ok) {
        const data = await response.json()
        setInboxItems(data.items)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching inbox items:', error)
      toast.error('Failed to fetch inbox items')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSelectItem = (id) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedItems(newSelection)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === inboxItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(inboxItems.map(item => item.id)))
    }
  }

  const handleAction = async (action, options = {}) => {
    if (selectedItems.size === 0 && !options.bulk) return
    
    try {
      const payload = {
        action,
        ids: options.bulk ? [] : Array.from(selectedItems),
        options
      }

      const response = await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        await fetchInboxItems() // Refresh inbox
        setSelectedItems(new Set()) // Clear selection
        
        // Show success message
        if (result.markedAsRead) {
          toast.success(`Marked ${result.markedAsRead} items as read`)
        } else if (result.archived) {
          toast.success(`Archived ${result.archived} items`)
        } else if (result.deleted) {
          toast.success(`Deleted ${result.deleted} items`)
        } else if (result.bulkMarkedAsRead) {
          toast.success(`Marked all ${result.bulkMarkedAsRead} items as read`)
        }
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error)
      toast.error(`Failed to ${action.replace('_', ' ')}`)
    }
  }

  const handleInvitationAction = async (invitationId, action, event) => {
    event.stopPropagation() // Prevent item selection
    
    try {
      const response = await fetch('/api/inbox/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, action })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        await fetchInboxItems() // Refresh inbox to remove processed invitation
      } else {
        const error = await response.json()
        toast.error(error.error)
      }
    } catch (error) {
      console.error('Error handling invitation:', error)
      toast.error('Failed to handle invitation')
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'MEDIUM':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'PROJECT_INVITATION':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'TASK_ASSIGNMENT':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'MENTION':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'TASK_UPDATE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'COMMENT':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const renderItemContent = (item) => {
    switch (item.type) {
      case 'PROJECT_INVITATION':
        return `You have been invited to join the project "${item.metadata?.projectName}"`
      case 'TASK_ASSIGNMENT':
        return `You have been assigned to the task "${item.metadata?.taskTitle}"`
      case 'MENTION':
        return `You were mentioned in a comment on "${item.metadata?.taskTitle}"`
      default:
        return item.content
    }
  }

  const unreadItems = inboxItems.filter(item => !item.isRead)
  const hasSelection = selectedItems.size > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Bell className="h-4 w-4 text-green-500" />
                ) : (
                  <BellOff className="h-4 w-4 text-gray-400" />
                )}
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-muted-foreground">
              Manage your notifications and communications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchInboxItems()}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={markAllAsRead}>
                <Check className="mr-2 h-4 w-4" />
                Mark all as read
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('bulk_action', { archiveAction: true })}>
                <Archive className="mr-2 h-4 w-4" />
                Archive all read
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Notification settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.unread || 0}</div>
              <p className="text-xs text-muted-foreground">Unread</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.active || 0}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.archived || 0}</div>
              <p className="text-xs text-muted-foreground">Archived</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total || 0}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="PROJECT_INVITATION">Invitations</SelectItem>
              <SelectItem value="TASK_ASSIGNMENT">Assignments</SelectItem>
              <SelectItem value="MENTION">Mentions</SelectItem>
              <SelectItem value="TASK_UPDATE">Task Updates</SelectItem>
              <SelectItem value="COMMENT">Comments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {hasSelection && (
            <>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedItems.size === inboxItems.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAction('mark_read')} disabled={selectedItems.size === 0}>
                <Check className="mr-2 h-4 w-4" />
                Mark as Read ({selectedItems.size})
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAction('archive')} disabled={selectedItems.size === 0}>
                <Archive className="mr-2 h-4 w-4" />
                Archive ({selectedItems.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Inbox Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <Skeleton className="h-5 w-5 mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : inboxItems.length === 0 ? (
            <div className="text-center py-12">
              <InboxIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {filter === 'archived' ? 'No archived items' : 'All caught up!'}
              </h3>
              <p className="text-muted-foreground">
                {filter === 'archived' 
                  ? 'You have no archived notifications.' 
                  : 'Your inbox is empty.'
                }
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {inboxItems.map(item => (
                <li
                  key={item.id}
                  className={`flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    selectedItems.has(item.id) ? 'bg-muted' : ''
                  } ${!item.isRead ? 'border-l-4 border-l-blue-500' : ''}`}
                  onClick={() => handleSelectItem(item.id)}
                >
                  <div className="mt-1">
                    {selectedItems.has(item.id) ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className={`h-5 w-5 ${item.isRead ? 'text-muted-foreground' : 'text-blue-500'}`} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getPriorityIcon(item.metadata?.priority)}
                        <p className={`font-medium truncate ${!item.isRead ? 'font-semibold' : ''}`}>
                          {item.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={`text-xs ${getTypeColor(item.type)}`}>
                          {item.type.replace('_', ' ').toLowerCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.metadata?.timeAgo || new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      {renderItemContent(item)}
                    </p>
                    
                    {/* Show Accept/Reject buttons for project invitations */}
                    {item.type === 'PROJECT_INVITATION' && item.metadata?.invitationId && (
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={(e) => handleInvitationAction(item.metadata.invitationId, 'accept', e)}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => handleInvitationAction(item.metadata.invitationId, 'reject', e)}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
