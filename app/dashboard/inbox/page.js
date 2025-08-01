'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, Mail, Archive, Trash2, Inbox as InboxIcon, Circle, CheckCircle, XCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/loading'

export default function InboxPage() {
  const [inboxItems, setInboxItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState(new Set())

  useEffect(() => {
    fetchInboxItems()
  }, [])

  const fetchInboxItems = async () => {
    try {
      const response = await fetch('/api/inbox')
      if (response.ok) {
        const data = await response.json()
        setInboxItems(data.items)
      }
    } catch (error) {
      console.error('Error fetching inbox items:', error)
    } finally {
      setLoading(false)
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

  const handleAction = async (action) => {
    if (selectedItems.size === 0) return
    
    try {
      const response = await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: Array.from(selectedItems) })
      })

      if (response.ok) {
        await fetchInboxItems() // Refresh inbox
        setSelectedItems(new Set()) // Clear selection
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error)
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
        console.log(result.message)
        await fetchInboxItems() // Refresh inbox to remove processed invitation
      } else {
        const error = await response.json()
        console.error('Error handling invitation:', error.error)
      }
    } catch (error) {
      console.error('Error handling invitation:', error)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground">
            Manage your notifications and communications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleAction('mark_read')} disabled={selectedItems.size === 0}>
            <Check className="mr-2 h-4 w-4" />
            Mark as Read
          </Button>
          <Button variant="outline" onClick={() => handleAction('archive')} disabled={selectedItems.size === 0}>
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>

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
              <h3 className="text-lg font-medium mb-2">All caught up!</h3>
              <p className="text-muted-foreground">Your inbox is empty.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {inboxItems.map(item => (
                <li
                  key={item.id}
                  className={`flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer ${
                    selectedItems.has(item.id) ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleSelectItem(item.id)}
                >
                  <div className="mt-1">
                    {selectedItems.has(item.id) ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{item.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
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
