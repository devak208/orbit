'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  FileText, 
  Save, 
  Trash2, 
  Edit, 
  MoreHorizontal,
  Bold,
  Italic,
  List,
  ListOrdered
} from 'lucide-react'

const EditorToolbar = ({ editor }) => {
  if (!editor) return null

  return (
    <div className="flex items-center gap-1 p-2 border-b">
      <Button
        variant={editor.isActive('bold') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('italic') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function ProjectNotesPage() {
  const params = useParams()
  const [project, setProject] = useState(null)
  const [notes, setNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your note...'
      })
    ],
    content: selectedNote?.content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Auto-save functionality can be added here
    }
  })

  useEffect(() => {
    if (params.id) {
      fetchProjectNotes()
    }
  }, [params.id])

  useEffect(() => {
    if (editor && selectedNote) {
      editor.commands.setContent(selectedNote.content || '')
    }
  }, [selectedNote, editor])

  const fetchProjectNotes = async () => {
    try {
      const [projectResponse, notesResponse] = await Promise.all([
        fetch(`/api/projects/${params.id}`),
        fetch(`/api/projects/${params.id}/notes`)
      ])

      if (projectResponse.ok && notesResponse.ok) {
        const projectData = await projectResponse.json()
        const notesData = await notesResponse.json()
        
        setProject(projectData.project)
        setNotes(notesData.notes)
        
        if (notesData.notes.length > 0 && !selectedNote) {
          setSelectedNote(notesData.notes[0])
        }
      }
    } catch (error) {
      console.error('Error fetching project notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return

    try {
      const response = await fetch(`/api/projects/${params.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNoteTitle.trim(),
          content: ''
        })
      })

      if (response.ok) {
        const { note } = await response.json()
        setNotes([note, ...notes])
        setSelectedNote(note)
        setNewNoteTitle('')
        setCreateDialogOpen(false)
      }
    } catch (error) {
      console.error('Error creating note:', error)
    }
  }

  const handleSaveNote = async () => {
    if (!selectedNote || !editor) return

    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${params.id}/notes/${selectedNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editor.getHTML()
        })
      })

      if (response.ok) {
        const { note } = await response.json()
        setNotes(notes.map(n => n.id === note.id ? note : n))
        setSelectedNote(note)
      }
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/projects/${params.id}/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const updatedNotes = notes.filter(n => n.id !== noteId)
        setNotes(updatedNotes)
        
        if (selectedNote?.id === noteId) {
          setSelectedNote(updatedNotes[0] || null)
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-6">
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="col-span-3 h-96 bg-gray-200 rounded"></div>
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
            <p className="text-sm text-muted-foreground">Project Notes</p>
          </div>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
              <DialogDescription>
                Add a new note to document ideas, requirements, or meeting notes.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Note Title</Label>
                <Input
                  id="title"
                  placeholder="Enter note title"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateNote}
                disabled={!newNoteTitle.trim()}
              >
                Create Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Notes Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notes</h3>
            <Badge variant="secondary">{notes.length}</Badge>
          </div>
          
          {notes.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  No notes created yet
                </p>
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-3 w-3" />
                  Create Note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <Card
                  key={note.id}
                  className={`cursor-pointer transition-colors ${
                    selectedNote?.id === note.id ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedNote(note)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{note.title}</h4>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={note.author?.image} />
                            <AvatarFallback className="text-xs">
                              {note.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNote(note.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          {selectedNote ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                <CardTitle className="text-lg">{selectedNote.title}</CardTitle>
                <Button
                  onClick={handleSaveNote}
                  disabled={saving}
                  size="sm"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </CardHeader>
              
              <CardContent className="p-0">
                <EditorToolbar editor={editor} />
                <div className="min-h-[400px] p-4">
                  <EditorContent 
                    editor={editor}
                    className="prose prose-sm max-w-none focus:outline-none"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No note selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a note from the sidebar or create a new one to get started.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Note
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
