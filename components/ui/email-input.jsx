import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Check, X } from 'lucide-react'

export function EmailInput({ value, onChange, placeholder, disabled, ...props }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const searchUsers = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.users || [])
        setShowSuggestions(true)
        setSelectedIndex(-1)
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const newValue = e.target.value
    onChange(newValue)
    searchUsers(newValue)
  }

  const handleSelectUser = (user) => {
    onChange(user.email)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectUser(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleBlur = (e) => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }, 200)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="email"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        {...props}
      />
      
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Searching users...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((user, index) => (
              <div
                key={user.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                  index === selectedIndex ? 'bg-gray-50' : ''
                }`}
                onClick={() => handleSelectUser(user)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image} />
                  <AvatarFallback className="text-xs">
                    {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {user.name || 'No name'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.email}
                  </div>
                </div>
                <Check className="h-4 w-4 text-green-500" />
              </div>
            ))
          ) : value && value.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              No users found with this email
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
