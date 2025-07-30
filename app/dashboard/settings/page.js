'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Lock, Bell, Palette } from 'lucide-react'

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const [activeTab, setActiveTab] = useState('profile')

  // Profile Settings
  const [profileData, setProfileData] = useState({
    name: session?.user?.name || '',
    username: session?.user?.username || '',
    bio: session?.user?.bio || '',
    image: session?.user?.image || ''
  })

  // Password Settings
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }))
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })

      if (response.ok) {
        await update({ ...session, user: { ...session.user, ...profileData } })
        // Show success message
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    // Handle password change logic here
  }

  if (!session) {
    return null // Or a loading spinner
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Tabs
            orientation="vertical"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full flex-col h-auto items-stretch">
              <TabsTrigger value="profile" className="justify-start">
                <User className="mr-2 h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="password" className="justify-start">
                <Lock className="mr-2 h-4 w-4" />
                Password
              </TabsTrigger>
              <TabsTrigger value="notifications" className="justify-start">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance" className="justify-start">
                <Palette className="mr-2 h-4 w-4" />
                Appearance
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab}>
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>Update your personal information.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="flex items-center gap-6">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={profileData.image} />
                        <AvatarFallback className="text-4xl">
                          {profileData.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="outline" type="button">
                        Change Photo
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => handleProfileChange('name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={profileData.username}
                          onChange={(e) => handleProfileChange('username', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => handleProfileChange('bio', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button type="submit">Save Changes</Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password. Make sure it's a strong one!</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      />
                    </div>

                    <Button type="submit">Update Password</Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Manage how you receive notifications.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the app.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
