'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Plus, Search, Users, CheckCircle, Clock, FolderOpen } from 'lucide-react'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCompletionRate = (project) => {
    const totalTasks = project._count?.tasks || 0
    const completedTasks = project.tasks?.filter(t => t.status === 'DONE').length || 0
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects and track progress across all your work.
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/projects/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term.' : "You haven't created any projects yet."}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push('/dashboard/projects/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-sm"
                      style={{ backgroundColor: project.color || '#6b7280' }}
                    />
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      {project.isPublic && (
                        <Badge variant="secondary" className="mt-1">
                          Public
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span>{project._count?.tasks || 0} tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{project._count?.members || 0} members</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{getCompletionRate(project)}% complete</span>
                  </div>
                </div>

                {/* Team Members */}
                {project.members && project.members.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Team:</span>
                    <div className="flex -space-x-2">
                      {project.members.slice(0, 3).map((member) => (
                        <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={member.user?.image} />
                          <AvatarFallback className="text-xs">
                            {member.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {project.members.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-xs">+{project.members.length - 3}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Updated */}
                <div className="text-xs text-muted-foreground">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
