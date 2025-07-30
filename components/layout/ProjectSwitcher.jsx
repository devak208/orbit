'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ChevronsUpDown, 
  Plus, 
  Check,
  Hash,
  Users,
  Calendar,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProjectSwitcher({ projects, currentProject, onProjectChange }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleProjectSelect = (project) => {
    onProjectChange(project)
    setOpen(false)
    router.push(`/dashboard/projects/${project.id}`)
  }

  const handleNewProject = () => {
    setOpen(false)
    router.push('/dashboard/projects/new')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentProject ? (
              <>
                <div 
                  className="h-4 w-4 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: currentProject.color || '#6b7280' }}
                />
                <span className="truncate text-sm">{currentProject.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground text-sm">Select project...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search projects..." />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
            {projects.length > 0 && (
              <CommandGroup heading="Projects">
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() => handleProjectSelect(project)}
                    className="flex items-center gap-2"
                  >
                    <div 
                      className="h-4 w-4 rounded-sm"
                      style={{ backgroundColor: project.color || '#6b7280' }}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm truncate">{project.name}</span>
                      {project.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {project.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {project._count?.members || 0}
                      </div>
                      {currentProject?.id === project.id && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={handleNewProject}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Project
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
