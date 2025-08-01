'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ProjectSwitcher } from './ProjectSwitcher'
import { 
  Home, 
  FolderOpen, 
  CheckSquare, 
  Calendar, 
  Users, 
  Brush, 
  Inbox, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Hash,
  Activity,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SidebarLink = ({ href, icon: Icon, children, isActive, collapsed, badge }) => {
  return (
    <Link href={href}>
      <Button 
        variant={isActive ? "secondary" : "ghost"} 
        className={cn(
          "w-full justify-start text-left font-normal",
          collapsed && "px-2"
        )}
        size="sm"
      >
        <Icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
        {!collapsed && (
          <>
            <span className="flex-1">{children}</span>
            {badge && (
              <Badge variant="secondary" className="ml-auto h-5 px-1 text-xs">
                {badge}
              </Badge>
            )}
          </>
        )}
      </Button>
    </Link>
  )
}

export function Sidebar({ collapsed, onToggle, currentPath }) {
  const { data: session } = useSession()
  const [projects, setProjects] = useState([])
  const [currentProject, setCurrentProject] = useState(null)
  const [unreadInboxCount, setUnreadInboxCount] = useState(0)

  useEffect(() => {
    fetchProjects()
    fetchInboxCount()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
        if (data.projects.length > 0 && !currentProject) {
          setCurrentProject(data.projects[0])
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchInboxCount = async () => {
    try {
      const response = await fetch('/api/inbox/unread-count')
      if (response.ok) {
        const data = await response.json()
        setUnreadInboxCount(data.count)
      }
    } catch (error) {
      console.error('Error fetching inbox count:', error)
    }
  }

  const mainNavItems = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Dashboard',
    },
    {
      href: '/dashboard/inbox',
      icon: Inbox,
      label: 'Inbox',
      badge: unreadInboxCount > 0 ? unreadInboxCount : null,
    },
    {
      href: '/dashboard/my-tasks',
      icon: CheckSquare,
      label: 'My Tasks',
    },
    {
      href: '/dashboard/activity',
      icon: Activity,
      label: 'Activity',
    },
  ]

  const projectNavItems = currentProject ? [
    {
      href: `/dashboard/projects/${currentProject.id}`,
      icon: Hash,
      label: 'Overview',
    },
    {
      href: `/dashboard/projects/${currentProject.id}/board`,
      icon: CheckSquare,
      label: 'Board',
    },
    {
      href: `/dashboard/projects/${currentProject.id}/calendar`,
      icon: Calendar,
      label: 'Calendar',
    },
    {
      href: `/dashboard/projects/${currentProject.id}/team`,
      icon: Users,
      label: 'Team',
    },
    {
      href: `/dashboard/projects/${currentProject.id}/workspace`,
      icon: Brush,
      label: 'Workspace',
    },
  ] : []

  const workspaceNavItems = [
    {
      href: '/dashboard/projects',
      icon: FolderOpen,
      label: 'All Projects',
    },
    {
      href: '/dashboard/team',
      icon: Users,
      label: 'Team',
    },
    {
      href: '/dashboard/settings',
      icon: Settings,
      label: 'Settings',
    },
  ]

  return (
    <div className={cn(
      "fixed left-0 top-0 z-50 h-full bg-sidebar border-sidebar-border border-r transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg">Orbit</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          {/* Project Switcher */}
          {!collapsed && (
            <div className="mb-4">
              <ProjectSwitcher
                projects={projects}
                currentProject={currentProject}
                onProjectChange={setCurrentProject}
              />
            </div>
          )}

          {/* Main Navigation */}
          <div className="space-y-1 mb-6">
            {!collapsed && (
              <h4 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Main
              </h4>
            )}
            {mainNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                isActive={currentPath === item.href}
                collapsed={collapsed}
                badge={item.badge}
              >
                {item.label}
              </SidebarLink>
            ))}
          </div>

          {/* Project Navigation */}
          {currentProject && (
            <div className="space-y-1 mb-6">
              {!collapsed && (
                <div className="flex items-center justify-between px-2 mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Project
                  </h4>
                  <div 
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: currentProject.color || '#6b7280' }}
                  />
                </div>
              )}
              {projectNavItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  isActive={currentPath === item.href || currentPath.startsWith(item.href)}
                  collapsed={collapsed}
                >
                  {item.label}
                </SidebarLink>
              ))}
            </div>
          )}

          <Separator className="my-4" />

          {/* Workspace Navigation */}
          <div className="space-y-1">
            {!collapsed && (
              <h4 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Workspace
              </h4>
            )}
            {workspaceNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                isActive={currentPath === item.href || currentPath.startsWith(item.href)}
                collapsed={collapsed}
              >
                {item.label}
              </SidebarLink>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session?.user?.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
