'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { 
  Mail, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  Send
} from 'lucide-react'

export default function InvitationSystemTest() {
  const [loading, setLoading] = useState(false)
  const [invitations, setInvitations] = useState([])
  const [stats, setStats] = useState(null)
  const [testData, setTestData] = useState({
    email: '',
    projectId: '',
    role: 'MEMBER'
  })

  // Fetch invitations
  const fetchInvitations = async (projectId = null) => {
    try {
      const url = projectId 
        ? `/api/invitations?projectId=${projectId}&includeExpired=true`
        : '/api/invitations?includeExpired=true'
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (response.ok) {
        setInvitations(result.invitations || [])
        toast.success(`Fetched ${result.invitations?.length || 0} invitations`)
      } else {
        throw new Error(result.error || 'Failed to fetch invitations')
      }
    } catch (error) {
      toast.error(`Failed to fetch invitations: ${error.message}`)
    }
  }

  // Create test invitation
  const createInvitation = async () => {
    if (!testData.email || !testData.projectId) {
      toast.error('Email and Project ID are required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${testData.projectId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testData.email,
          role: testData.role
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        toast.success('Invitation created successfully!')
        await fetchInvitations()
        setTestData({ ...testData, email: '' })
      } else {
        throw new Error(result.error || 'Failed to create invitation')
      }
    } catch (error) {
      toast.error(`Failed to create invitation: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test invitation actions
  const testInvitationAction = async (action, invitationIds) => {
    setLoading(true)
    try {
      const response = await fetch('/api/invitations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          invitationIds: Array.isArray(invitationIds) ? invitationIds : [invitationIds],
          projectId: testData.projectId
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        toast.success(`${action} completed successfully!`)
        await fetchInvitations()
      } else {
        throw new Error(result.error || `Failed to ${action}`)
      }
    } catch (error) {
      toast.error(`Failed to ${action}: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test invitation acceptance/rejection
  const testInvitationResponse = async (invitationId, action) => {
    setLoading(true)
    try {
      const response = await fetch('/api/inbox/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          action
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Invitation ${action}ed successfully!`)
        await fetchInvitations()
      } else {
        throw new Error(result.error || `Failed to ${action} invitation`)
      }
    } catch (error) {
      toast.error(`Failed to ${action} invitation: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Run maintenance tasks
  const runMaintenanceTask = async (task) => {
    setLoading(true)
    try {
      const response = await fetch('/api/maintenance/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task })
      })

      const result = await response.json()
      
      if (response.ok) {
        toast.success(result.message || `${task} completed successfully!`)
        if (task === 'health_check') {
          setStats(result.stats)
        }
        await fetchInvitations()
      } else {
        throw new Error(result.error || `Failed to run ${task}`)
      }
    } catch (error) {
      toast.error(`Failed to run ${task}: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Get status badge color
  const getStatusBadge = (invitation) => {
    if (invitation.isExpired && invitation.status === 'PENDING') {
      return <Badge variant="destructive">Expired</Badge>
    }
    
    switch (invitation.status) {
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>
      case 'ACCEPTED':
        return <Badge variant="default">Accepted</Badge>
      case 'DECLINED':
        return <Badge variant="secondary">Declined</Badge>
      case 'EXPIRED':
        return <Badge variant="destructive">Expired</Badge>
      default:
        return <Badge variant="outline">{invitation.status}</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Invitation System Test</h1>
          <p className="text-gray-600 mt-2">
            Test invitation lifecycle management and notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchInvitations()} 
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => runMaintenanceTask('health_check')} 
            disabled={loading}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Health Check
          </Button>
        </div>
      </div>

      <Tabs defaultValue="test" className="space-y-6">
        <TabsList>
          <TabsTrigger value="test">Test Invitations</TabsTrigger>
          <TabsTrigger value="manage">Manage Invitations</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Test Invitation</CardTitle>
              <CardDescription>
                Create invitations to test the lifecycle management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={testData.email}
                    onChange={(e) => setTestData({ ...testData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="projectId">Project ID</Label>
                  <Input
                    id="projectId"
                    placeholder="project-id"
                    value={testData.projectId}
                    onChange={(e) => setTestData({ ...testData, projectId: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={testData.role} onValueChange={(value) => setTestData({ ...testData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="OWNER">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={createInvitation} disabled={loading} className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? 'Creating...' : 'Create Invitation'}
              </Button>
            </CardContent>
          </Card>

          {/* Invitations List */}
          <Card>
            <CardHeader>
              <CardTitle>Invitations ({invitations.length})</CardTitle>
              <CardDescription>
                Current invitations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No invitations found</p>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div 
                      key={invitation.id} 
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4" />
                            <span className="font-medium">{invitation.email}</span>
                            {getStatusBadge(invitation)}
                            <Badge variant="outline">{invitation.role}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Project: {invitation.project?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Created: {new Date(invitation.createdAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            Expires: {new Date(invitation.expiresAt).toLocaleString()}
                            {invitation.isExpired && ' (EXPIRED)'}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {invitation.status === 'PENDING' && !invitation.isExpired && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => testInvitationResponse(invitation.id, 'accept')}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => testInvitationResponse(invitation.id, 'reject')}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {invitation.canResend && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testInvitationAction('resend', invitation.id)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Resend
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => testInvitationAction('cancel', invitation.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Operations</CardTitle>
                <CardDescription>
                  Perform bulk operations on invitations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => testInvitationAction('expire', invitations.filter(i => i.status === 'PENDING').map(i => i.id))}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Expire All Pending
                </Button>
                <Button 
                  onClick={() => testInvitationAction('cleanup_expired')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cleanup Expired
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>
                  Current invitation statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {invitations.filter(i => i.status === 'PENDING' && !i.isExpired).length}
                    </div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {invitations.filter(i => i.status === 'ACCEPTED').length}
                    </div>
                    <div className="text-sm text-gray-600">Accepted</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {invitations.filter(i => i.status === 'DECLINED').length}
                    </div>
                    <div className="text-sm text-gray-600">Declined</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {invitations.filter(i => i.isExpired || i.status === 'EXPIRED').length}
                    </div>
                    <div className="text-sm text-gray-600">Expired</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cleanup Tasks</CardTitle>
                <CardDescription>
                  Run maintenance and cleanup tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => runMaintenanceTask('cleanup_expired')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Cleanup Expired Invitations
                </Button>
                <Button 
                  onClick={() => runMaintenanceTask('cleanup_old_rejected')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Cleanup Old Rejected (30+ days)
                </Button>
                <Button 
                  onClick={() => runMaintenanceTask('sync_invitation_notifications')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Sync Notification States
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>
                  Check invitation system health
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Invitations:</span>
                      <span className="font-medium">{stats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">{stats.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accepted:</span>
                      <span className="font-medium">{stats.accepted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Declined:</span>
                      <span className="font-medium">{stats.declined}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expired Pending:</span>
                      <span className="font-medium text-orange-600">{stats.expiredPending}</span>
                    </div>
                    {stats.needsCleanup && (
                      <div className="mt-4 p-2 bg-orange-50 border border-orange-200 rounded">
                        <p className="text-orange-800 text-sm">
                          ⚠️ System needs cleanup
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button 
                    onClick={() => runMaintenanceTask('health_check')}
                    disabled={loading}
                    className="w-full"
                  >
                    Run Health Check
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Statistics</CardTitle>
              <CardDescription>
                Comprehensive invitation system statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total Invitations</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-3xl font-bold text-green-600">{stats.pending}</div>
                    <div className="text-sm text-gray-600">Active Pending</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-3xl font-bold text-purple-600">{stats.accepted}</div>
                    <div className="text-sm text-gray-600">Accepted</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-3xl font-bold text-red-600">{stats.declined}</div>
                    <div className="text-sm text-gray-600">Declined</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-3xl font-bold text-orange-600">{stats.expiredPending}</div>
                    <div className="text-sm text-gray-600">Expired Pending</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-3xl font-bold text-gray-600">{stats.orphanedNotifications}</div>
                    <div className="text-sm text-gray-600">Orphaned Notifications</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No statistics available</p>
                  <Button onClick={() => runMaintenanceTask('health_check')}>
                    Load Statistics
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
