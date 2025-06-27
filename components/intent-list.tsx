"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { addFriend, getConnectionStatus } from '@/lib/actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin, UserPlus, Clock } from 'lucide-react'
import type { Intent } from "@/lib/types"

interface IntentWithSimilarity extends Intent {
  similarity?: number
}

interface IntentListProps {
  intents: IntentWithSimilarity[]
}

export default function IntentList({ intents }: IntentListProps) {
  const { userId, username } = useAuth()
  const [loadingFriendRequests, setLoadingFriendRequests] = useState<Set<string>>(new Set())
  const [connectionStatuses, setConnectionStatuses] = useState<Map<string, 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked'>>(new Map())

  // Load connection statuses for all users in the intent list
  useEffect(() => {
    const loadConnectionStatuses = async () => {
      if (!userId) return

      const statusMap = new Map()
      for (const intent of intents) {
        if (intent.userId && intent.userId !== userId) {
          try {
            const status = await getConnectionStatus(userId, intent.userId)
            statusMap.set(intent.userId, status.status)
          } catch (error) {
            console.error('Error loading connection status:', error)
            statusMap.set(intent.userId, 'none')
          }
        }
      }
      setConnectionStatuses(statusMap)
    }

    loadConnectionStatuses()
  }, [intents, userId])

  const handleAddFriend = async (intent: IntentWithSimilarity) => {
    if (!userId || !intent.userId || intent.userId === userId) {
      return
    }

    setLoadingFriendRequests(prev => new Set(prev).add(intent.user))
    
    try {
      const result = await addFriend(userId, intent.userId)
      
      if (result.success) {
        console.log(`Friend request sent to ${intent.user}`)
        // Update connection status locally
        setConnectionStatuses(prev => new Map(prev.set(intent.userId!, 'pending_sent')))
      } else {
        console.error('Failed to send friend request:', result.message)
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
    } finally {
      setLoadingFriendRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(intent.user)
        return newSet
      })
    }
  }

  return (
    <div className="space-y-4">
      {intents.map((intent) => (
        <Card key={intent.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  {intent.userId ? (
                    <Link href={`/user/${intent.userId}`} className="flex items-center space-x-3 hover:opacity-75">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {intent.user[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm text-blue-600 hover:text-blue-800">@{intent.user}</p>
                        {intent.createdAt && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(intent.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {intent.user[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">@{intent.user}</p>
                        {intent.createdAt && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(intent.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                <p className="text-gray-800 mb-2">{intent.text}</p>
                
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {intent.location && (
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {intent.location}
                    </div>
                  )}
                  {intent.category && (
                    <Badge variant="outline" className="text-xs">
                      {intent.category}
                    </Badge>
                  )}
                </div>
                
                {intent.tags && intent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {intent.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {intent.similarity && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(intent.similarity * 100)}% match
                    </Badge>
                  </div>
                )}
              </div>
              
              {userId && intent.userId && intent.userId !== userId && (() => {
                const connectionStatus = connectionStatuses.get(intent.userId!) || 'none'
                const isLoading = loadingFriendRequests.has(intent.user)
                
                if (connectionStatus === 'friends') {
                  return (
                    <Button variant="outline" size="sm" disabled className="ml-4">
                      Friends
                    </Button>
                  )
                } else if (connectionStatus === 'pending_sent') {
                  return (
                    <Button variant="outline" size="sm" disabled className="ml-4">
                      Request Sent
                    </Button>
                  )
                } else if (connectionStatus === 'pending_received') {
                  return (
                    <Button variant="outline" size="sm" disabled className="ml-4">
                      Request Pending
                    </Button>
                  )
                } else if (connectionStatus === 'blocked') {
                  return (
                    <Button variant="outline" size="sm" disabled className="ml-4">
                      Blocked
                    </Button>
                  )
                } else {
                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddFriend(intent)}
                      disabled={isLoading}
                      className="ml-4"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {isLoading ? "Sending..." : "Connect"}
                    </Button>
                  )
                }
              })()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}