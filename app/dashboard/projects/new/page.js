'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

const projectFormSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  color: z.string().optional(),
  isPublic: z.boolean().default(false),
})

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#3b82f6',
      isPublic: false,
    },
  })

  const onSubmit = async (values) => {
    setLoading(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Project created successfully!')
        router.push(`/dashboard/projects/${data.project.id}`)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to create project')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create a New Project</CardTitle>
          <CardDescription>
            Start a new project and invite your team to collaborate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Q4 Marketing Campaign" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your project in a few sentences."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm w-full">
                      <div className="space-y-0.5">
                        <FormLabel>Public Project</FormLabel>
                        <FormDescription>
                          Anyone with the link can view this project.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

