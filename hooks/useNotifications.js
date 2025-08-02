import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useSession } from 'next-auth/react'

/**
 * Real-time notification hook
 * Manages WebSocket connection for receiving notifications and inbox updates
 */
export const useNotifications = () => {
  const { data: session } = useSession()
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastNotification, setLastNotification] = useState(null)

  // Initialize WebSocket connection
  useEffect(() => {
    if (!session?.user?.id) return

    // Create socket connection
    socketRef.current = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    })

    const socket = socketRef.current

    // Connection handlers
    socket.on('connect', () => {
      console.log('🔗 Notification socket connected')
      setIsConnected(true)
      
      // Register user for notifications
      socket.emit('user-connect', { userId: session.user.id })
    })

    socket.on('disconnect', () => {
      console.log('🔌 Notification socket disconnected')
      setIsConnected(false)
    })

    // Notification handlers
    socket.on('notification-received', (data) => {
      console.log('🔔 New notification received:', data)
      
      const { notification, inboxItem, type, timestamp } = data
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev.slice(0, 49)]) // Keep only 50 recent
      
      // Update unread count
      if (!notification.isRead) {
        setUnreadCount(prev => prev + 1)
      }
      
      // Set as last notification for UI display
      setLastNotification({
        ...notification,
        receivedAt: timestamp,
        type: 'new'
      })

      // Show browser notification if permission granted
      showBrowserNotification(notification)
    })

    socket.on('notifications-read-update', (data) => {
      console.log('📖 Notifications marked as read:', data)
      
      const { notificationIds } = data
      
      // Update local notifications
      setNotifications(prev => 
        prev.map(notif => 
          notificationIds.includes(notif.id) 
            ? { ...notif, isRead: true }
            : notif
        )
      )
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
    })

    socket.on('inbox-updated', (data) => {
      console.log('📥 Inbox updated:', data)
      
      // Handle inbox updates (refresh data if needed)
      const { action, result } = data
      
      if (action === 'mark_read' && result.markedAsRead) {
        setUnreadCount(prev => Math.max(0, prev - result.markedAsRead))
      }
    })

    // Error handling
    socket.on('connect_error', (error) => {
      console.error('❌ Notification socket connection error:', error)
    })

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [session?.user?.id])

  // Fetch initial notification data
  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications()
      fetchUnreadCount()
    }
  }, [session?.user?.id])

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=50')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?unread_only=true&limit=1')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [])

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          notificationIds
        })
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notificationIds.includes(notif.id) 
              ? { ...notif, isRead: true }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
        
        return true
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
    return false
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_all_read'
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update local state
        setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })))
        setUnreadCount(0)
        
        return data.markedAsRead || 0
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
    return 0
  }, [])

  // Archive notifications
  const archiveNotifications = useCallback(async (notificationIds) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'archive',
          notificationIds
        })
      })

      if (response.ok) {
        // Remove archived notifications from local state
        setNotifications(prev => 
          prev.filter(notif => !notificationIds.includes(notif.id))
        )
        
        return true
      }
    } catch (error) {
      console.error('Error archiving notifications:', error)
    }
    return false
  }, [])

  // Clear last notification (for UI)
  const clearLastNotification = useCallback(() => {
    setLastNotification(null)
  }, [])

  // Show browser notification
  const showBrowserNotification = useCallback((notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.content,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: false
      })
    }
  }, [])

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }, [])

  return {
    // Connection state
    isConnected,
    
    // Notification data
    notifications,
    unreadCount,
    lastNotification,
    
    // Actions
    markAsRead,
    markAllAsRead,
    archiveNotifications,
    clearLastNotification,
    fetchNotifications,
    fetchUnreadCount,
    
    // Browser notifications
    requestNotificationPermission,
    
    // Socket reference (for advanced usage)
    socket: socketRef.current
  }
}
