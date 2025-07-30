'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity as ActivityIcon, 
  Plus, 
  Edit, 
  Trash2, 
  CheckSquare, 
  MessageCircle, 
  Users, 
  FolderPlus,
  Clock
} from 'lucide-react'

export default function ActivityPage() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activity')
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'TASK_CREATED':
        return <Plus className="h-4 w-4 text-green-600" />
      case 'TASK_UPDATED':
        return <Edit className="h-4 w-4 text-blue-600" />
      case 'TASK_DELETED':
        return <Trash2 className="h-4 w-4 text-red-600" />
      case 'TASK_COMPLETED':
        return <CheckSquare className="h-4 w-4 text-green-600" />
      case 'COMMENT_ADDED':
        return <MessageCircle className="h-4 w-4 text-purple-600" />
      case 'PROJECT_CREATED':
        return <FolderPlus className="h-4 w-4 text-blue-600" />
      case 'PROJECT_UPDATED':
        return <Edit className="h-4 w-4 text-blue-600" />
      case 'MEMBER_ADDED':
        return <Users className="h-4 w-4 text-green-600" />
      default:
        return <ActivityIcon className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityColor = (type) => {
    switch (type) {
      case 'TASK_CREATED':
      case 'TASK_COMPLETED':
      case 'MEMBER_ADDED':
        return 'bg-green-50 border-green-200'
      case 'TASK_UPDATED':
      case 'PROJECT_CREATED':
      case 'PROJECT_UPDATED':
        return 'bg-blue-50 border-blue-200'
      case 'TASK_DELETED':
        return 'bg-red-50 border-red-200'
      case 'COMMENT_ADDED':
        return 'bg-purple-50 border-purple-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true
    return activity.type.toLowerCase().includes(filter.toLowerCase())
  })

  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(activity)
    return groups
  }, {})

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground">
            Track all activities across your projects and tasks.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Activity</TabsTrigger>
          <TabsTrigger value="task">Tasks</TabsTrigger>
          <TabsTrigger value="project">Projects</TabsTrigger>
          <TabsTrigger value="comment">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {Object.keys(groupedActivities).length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <ActivityIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No activity found</h3>
                <p className="text-muted-foreground">
                  Start working on projects and tasks to see activity here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedActivities)
                .sort(([a], [b]) => new Date(b) - new Date(a))
                .map(([date, dayActivities]) => (
                  <div key={date}>
                    <div className="sticky top-0 bg-background z-10 pb-2">
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {date === new Date().toDateString() ? 'Today' : 
                         date === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' :
                         new Date(date).toLocaleDateString('en-US', { 
                           weekday: 'long', 
                           year: 'numeric', 
                           month: 'long', 
                           day: 'numeric' 
                         })}
                      </h3>
                    </div>
                    
                    <div className="space-y-2">
                      {dayActivities.map((activity) => (
                        <Card 
                          key={activity.id} 
                          className={`transition-all hover:shadow-sm ${getActivityColor(activity.type)}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {getActivityIcon(activity.type)}
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={activity.user?.image} />
                                    <AvatarFallback className="text-xs">
                                      {activity.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">
                                    {activity.user?.name || 'Unknown User'}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {activity.content}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {activity.project && (
                                    <Badge variant="outline" className="text-xs">
                                      {activity.project.name}
                                    </Badge>
                                  )}
                                  <span>
                                    {new Date(activity.createdAt).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
