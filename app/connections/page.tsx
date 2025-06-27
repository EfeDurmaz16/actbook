"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  UserPlus, 
  Clock, 
  Check, 
  X, 
  Search,
  MapPin,
  Calendar,
  MessageCircle
} from 'lucide-react'
import { getUserConnections, sendConnectionRequest, respondToConnectionRequest, findSimilarUsers, getPendingRequests, getSentRequests } from '@/lib/actions'

interface User {
  id: string
  username: string
  firstName?: string
  lastName?: string
  bio?: string
  avatar?: string
  location?: string
  interests: string[]
  isActive: boolean
  lastSeen: Date
  createdAt: Date
}

interface Connection {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED'
  requester: User
  receiver: User
  createdAt: Date
}

export default function ConnectionsPage() {
  const { userId, username } = useAuth()
  const [connections, setConnections] = useState<Connection[]>([])
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([])
  const [sentRequests, setSentRequests] = useState<Connection[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([])
  const [searchUsers, setSearchUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('friends')

  useEffect(() => {
    if (userId) {
      fetchConnections()
      fetchSuggestedUsers()
    }
  }, [userId])

  useEffect(() => {
    if (searchQuery.trim()) {
      searchForUsers()
    } else {
      setSearchUsers([])
    }
  }, [searchQuery])

  const fetchConnections = async () => {
    try {
      const [userConnections, receivedRequests, userSentRequests] = await Promise.all([
        getUserConnections(userId!, 'ACCEPTED'),
        getPendingRequests(userId!),
        getSentRequests(userId!)
      ])
      
      setConnections(userConnections)
      setPendingRequests(receivedRequests)
      setSentRequests(userSentRequests)
    } catch (error) {
      console.error('Error fetching connections:', error)
    }
  }

  const fetchSuggestedUsers = async () => {
    try {
      // Get current user's interests from their profile
      const response = await fetch(`/api/users/${userId}`)
      const userData = await response.json()
      
      if (userData.user) {
        const similarUsers = await findSimilarUsers(
          userId!,
          userData.user.interests || [],
          userData.user.location
        )
        setSuggestedUsers(similarUsers)
      }
    } catch (error) {
      console.error('Error fetching suggested users:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchForUsers = async () => {
    try {
      const response = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}&excludeUserId=${userId}&limit=10`)
      const data = await response.json()
      
      if (data.users) {
        setSearchUsers(data.users)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  const handleSendConnectionRequest = async (receiverId: string) => {
    try {
      const result = await sendConnectionRequest(userId!, receiverId)
      if (result.success) {
        // Refresh connections
        fetchConnections()
        // Remove from suggested users
        setSuggestedUsers(prev => prev.filter(user => user.id !== receiverId))
        setSearchUsers(prev => prev.filter(user => user.id !== receiverId))
      }
    } catch (error) {
      console.error('Error sending connection request:', error)
    }
  }

  const handleRespondToConnection = async (connectionId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      console.log('Responding to connection:', { connectionId, status, userId })
      const result = await respondToConnectionRequest(connectionId, userId!, status)
      console.log('Response result:', result)
      if (result.success) {
        fetchConnections()
      } else {
        console.error('Failed to respond to connection:', result.message)
      }
    } catch (error) {
      console.error('Error responding to connection:', error)
    }
  }

  const getConnectionStatus = (user: User) => {
    // Check in accepted connections
    let connection = connections.find(conn => 
      (conn.requester.id === user.id && conn.receiver.id === userId) ||
      (conn.receiver.id === user.id && conn.requester.id === userId)
    )
    
    // If not found, check in pending requests
    if (!connection) {
      connection = pendingRequests.find(conn => 
        (conn.requester.id === user.id && conn.receiver.id === userId) ||
        (conn.receiver.id === user.id && conn.requester.id === userId)
      )
    }
    
    // If still not found, check in sent requests
    if (!connection) {
      connection = sentRequests.find(conn => 
        (conn.requester.id === user.id && conn.receiver.id === userId) ||
        (conn.receiver.id === user.id && conn.requester.id === userId)
      )
    }
    
    return connection
  }

  const renderUserCard = (user: User, showConnectionButton = true) => {
    const connection = getConnectionStatus(user)
    const isConnected = connection?.status === 'ACCEPTED'
    const isPending = connection?.status === 'PENDING'
    const isRequester = connection?.requester.id === userId

    return (
      <Card key={user.id} className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar} alt={user.username} />
              <AvatarFallback>
                {user.firstName?.[0] || user.username[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.username}
                  </h3>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                {showConnectionButton && (
                  <div className="flex gap-2">
                    {isConnected ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Users className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : isPending ? (
                      <div className="flex gap-2">
                        {isRequester ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleRespondToConnection(connection!.id, 'ACCEPTED')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRespondToConnection(connection!.id, 'REJECTED')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSendConnectionRequest(user.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {user.location && (
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {user.location}
                </div>
              )}
              
              {user.bio && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {user.bio}
                </p>
              )}
              
              {user.interests && user.interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {user.interests.slice(0, 3).map((interest, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                  {user.interests.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{user.interests.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const friends = connections // Already filtered to ACCEPTED in fetchConnections

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading connections...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Connections</h1>
          <p className="text-muted-foreground">
            Connect with people who share your interests and activities
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="discover" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Sent ({sentRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            {friends.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                  <p className="text-muted-foreground text-center">
                    Start connecting with people who share your interests
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {friends.map(connection => {
                  const friend = connection.requester.id === userId 
                    ? connection.receiver 
                    : connection.requester
                  return renderUserCard(friend, false)
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground">
                    You have no pending connection requests
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingRequests.map(connection => 
                  renderUserCard(connection.requester)
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discover" className="space-y-4">
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {searchQuery.trim() ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Search Results</h3>
                {searchUsers.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Search className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No users found</h3>
                      <p className="text-muted-foreground">
                        Try searching with different keywords
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {searchUsers.map(user => renderUserCard(user))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Suggested for you</h3>
                {suggestedUsers.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No suggestions available</h3>
                      <p className="text-muted-foreground text-center">
                        Complete your profile to get better suggestions
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {suggestedUsers.map(user => renderUserCard(user))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {sentRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sent requests</h3>
                  <p className="text-muted-foreground">
                    You haven't sent any connection requests yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sentRequests.map(connection => 
                  renderUserCard(connection.receiver)
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}