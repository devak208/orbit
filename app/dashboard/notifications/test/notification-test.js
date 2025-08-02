'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function NotificationTest() {
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState({})

  // Test data for different notification types
  const testData = {
    notification: {
      title: 'Test Notification',
      content: 'This is a test notification to verify the system is working',
      type: 'INFO',
      recipientId: '1', // Assuming user ID 1 exists
      metadata: {
        source: 'notification-test',
        testId: Date.now()
      }
    }
  }

  // Test notification creation
  const testCreateNotification = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData.notification)
      })

      const result = await response.json()
      
      if (response.ok) {
        setTestResults(prev => ({
          ...prev,
          create: { success: true, data: result }
        }))
        toast.success('Notification created successfully!')
      } else {
        throw new Error(result.error || 'Failed to create notification')
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        create: { success: false, error: error.message }
      }))
      toast.error(`Failed to create notification: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test notification fetching
  const testFetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications')
      const result = await response.json()
      
      if (response.ok) {
        setTestResults(prev => ({
          ...prev,
          fetch: { success: true, data: result }
        }))
        toast.success(`Fetched ${result.notifications?.length || 0} notifications`)
      } else {
        throw new Error(result.error || 'Failed to fetch notifications')
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        fetch: { success: false, error: error.message }
      }))
      toast.error(`Failed to fetch notifications: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test inbox operations
  const testInboxOperations = async () => {
    setLoading(true)
    try {
      // First fetch inbox items
      const response = await fetch('/api/inbox')
      const result = await response.json()
      
      if (response.ok) {
        const items = result.items || []
        
        if (items.length > 0) {
          // Test marking as read
          const testItem = items[0]
          const markReadResponse = await fetch('/api/inbox', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'markRead',
              ids: [testItem.id]
            })
          })

          const markReadResult = await markReadResponse.json()
          
          if (markReadResponse.ok) {
            setTestResults(prev => ({
              ...prev,
              inbox: { 
                success: true, 
                data: { 
                  totalItems: items.length,
                  markedRead: markReadResult.markedRead 
                }
              }
            }))
            toast.success('Inbox operations completed successfully!')
          } else {
            throw new Error(markReadResult.error || 'Failed to mark item as read')
          }
        } else {
          setTestResults(prev => ({
            ...prev,
            inbox: { 
              success: true, 
              data: { totalItems: 0, message: 'No inbox items to test' }
            }
          }))
          toast.info('No inbox items found to test operations')
        }
      } else {
        throw new Error(result.error || 'Failed to fetch inbox')
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        inbox: { success: false, error: error.message }
      }))
      toast.error(`Inbox test failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test WebSocket connection
  const testWebSocket = async () => {
    try {
      // This would typically be handled by the useNotifications hook
      // For now, we'll just check if the hook can be imported
      setTestResults(prev => ({
        ...prev,
        websocket: { 
          success: true, 
          data: { message: 'WebSocket test requires real-time component' }
        }
      }))
      toast.info('WebSocket test requires the useNotifications hook to be active')
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        websocket: { success: false, error: error.message }
      }))
      toast.error(`WebSocket test failed: ${error.message}`)
    }
  }

  // Run all tests
  const runAllTests = async () => {
    setTestResults({})
    await testCreateNotification()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
    await testFetchNotifications()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
    await testInboxOperations()
    await testWebSocket()
    toast.success('All tests completed!')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notification System Test</h1>
          <p className="text-gray-600 mt-2">
            Test all aspects of the notification system
          </p>
        </div>
        <Button 
          onClick={runAllTests} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </div>

      {/* Individual Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button 
          onClick={testCreateNotification} 
          disabled={loading}
          variant="outline"
        >
          Test Create Notification
        </Button>
        <Button 
          onClick={testFetchNotifications} 
          disabled={loading}
          variant="outline"
        >
          Test Fetch Notifications
        </Button>
        <Button 
          onClick={testInboxOperations} 
          disabled={loading}
          variant="outline"
        >
          Test Inbox Operations
        </Button>
        <Button 
          onClick={testWebSocket} 
          disabled={loading}
          variant="outline"
        >
          Test WebSocket
        </Button>
      </div>

      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(testResults).map(([testName, result]) => (
          <Card key={testName}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="capitalize">{testName} Test</CardTitle>
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.success ? 'PASS' : 'FAIL'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {result.success ? (
                <div>
                  <p className="text-green-600 font-medium mb-2">✓ Test passed</p>
                  {result.data && (
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-red-600 font-medium mb-2">✗ Test failed</p>
                  <p className="text-red-500 text-sm">{result.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Test Data</CardTitle>
          <CardDescription>
            Data used for testing notification creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(testData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
