'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { EmailInput } from '@/components/ui/email-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { UserPlus, MoreHorizontal, Mail, Crown, Shield, User, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/loading'

export default function ProjectTeamPage() {
  const params = useParams()
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('MEMBER')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState(null)

  useEffect(() => {
    if (params.id) {
      fetchProjectTeam()
    }
  }, [params.id])

  const fetchProjectTeam = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        setMembers(data.project.members || [])
        setInvitations(data.project.invitations || [])
        
        // Find current user's role
        const currentMember = data.project.members?.find(m => m.user?.id === data.currentUserId)
        setCurrentUserRole(currentMember?.role || null)
      }
    } catch (error) {
      console.error('Error fetching project team:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return

    setInviteLoading(true)
    try {
      const response = await fetch(`/api/projects/${params.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole
        })
      })

      if (response.ok) {
        setInviteDialogOpen(false)
        setInviteEmail('')
        setInviteRole('MEMBER')
        await fetchProjectTeam() // Refresh team data
      } else {
        const error = await response.json()
        console.error('Invite error:', error.error)
      }
    } catch (error) {
      console.error('Error inviting member:', error)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      const response = await fetch(`/api/projects/${params.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        await fetchProjectTeam() // Refresh team data
      }
    } catch (error) {
      console.error('Error updating member role:', error)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${params.id}/members/${memberId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchProjectTeam() // Refresh team data
      }
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  const handleCancelInvitation = async (invitationId) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${params.id}/invite`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId })
      })

      if (response.ok) {
        await fetchProjectTeam() // Refresh team data
      } else {
        const error = await response.json()
        console.error('Cancel invitation error:', error.error)
        alert('Failed to cancel invitation: ' + error.error)
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      alert('Failed to cancel invitation')
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'OWNER':
        return 'bg-yellow-50/50 dark:bg-yellow-950/20 text-yellow-900 dark:text-yellow-100 border-yellow-200/50 dark:border-yellow-800/30'
      case 'ADMIN':
        return 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100 border-blue-200/50 dark:border-blue-800/30'
      default:
        return 'bg-muted/30 text-foreground border-border'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-sm" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Team Members Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-28" />
          </div>
          
          {/* Member Cards */}
          <div className="grid gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Pending Invitations Section */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20" />
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
            <p className="text-sm text-muted-foreground">Team Management</p>
          </div>
        </div>
        
        {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join this project. They will receive an email with the invitation.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <EmailInput
                  id="email"
                  placeholder="Search for users by email or name..."
                  value={inviteEmail}
                  onChange={setInviteEmail}
                  disabled={inviteLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Start typing to search for existing users. Only users with accounts will receive notifications.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admins can manage project settings and members. Members can view and edit tasks.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
                disabled={inviteLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleInviteMember} disabled={inviteLoading || !inviteEmail.trim()}>
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => m.role === 'ADMIN' || m.role === 'OWNER').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <User className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => m.user).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations - Only visible to OWNER and ADMIN */}
      {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Invitations
              <Badge variant="outline">{invitations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50/30 dark:bg-yellow-950/20">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        <Mail className="h-6 w-6 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{invitation.email}</h4>
                        {getRoleIcon(invitation.role)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Invited by {invitation.inviter?.name || 'Someone'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${getRoleBadgeColor(invitation.role)}`}>
                          {invitation.role.toLowerCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600">
                          pending
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Sent {new Date(invitation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No team members</h3>
              <p className="text-muted-foreground mb-4">
                Invite your first team member to get started.
              </p>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.user?.image} />
                      <AvatarFallback>
                        {member.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {member.user?.name || 'Pending Invitation'}
                        </h4>
                        {getRoleIcon(member.role)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.user?.email || 'Invitation sent'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${getRoleBadgeColor(member.role)}`}>
                          {member.role.toLowerCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Joined {new Date(member.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {currentUserRole === 'OWNER' || currentUserRole === 'ADMIN' ? (
                    member.role !== 'OWNER' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role !== 'ADMIN' && (
                            <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, 'ADMIN')}>
                              <Shield className="mr-2 h-4 w-4" />
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          {member.role !== 'MEMBER' && (
                            <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, 'MEMBER')}>
                              <User className="mr-2 h-4 w-4" />
                              Make Member
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove from Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
