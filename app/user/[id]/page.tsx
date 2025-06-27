"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { getFriends, getUserActivities, addFriend, removeFriend, getConnectionStatus } from '@/lib/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Users, Calendar, UserPlus, UserMinus, Activity, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { User, Intent } from '@/lib/types'

interface UserProfile {
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
  _count: {
    intents: number
    sentConnections: number
    receivedConnections: number
  }
}

export default function UserProfilePage() {
  const { id: userId } = useParams()
  const { userId: currentUserId } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [friends, setFriends] = useState<User[]>([])
  const [activities, setActivities] = useState<Intent[]>([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked'>('none')
  const [connectionId, setConnectionId] = useState<string | undefined>()

  useEffect(() => {
    if (userId && typeof userId === 'string') {
      fetchUserProfile(userId)
    }
  }, [userId])

  const fetchUserProfile = async (targetUserId: string) => {
    try {
      // Fetch real user profile, activities, and friends in parallel
      const [profileResponse, activitiesData, friendsData] = await Promise.all([
        fetch(`/api/users/${targetUserId}`),
        getUserActivities(targetUserId),
        getFriends(targetUserId)
      ])

      if (!profileResponse.ok) {
        console.error('Failed to fetch user profile')
        return
      }

      const { user: profileData } = await profileResponse.json()
      
      setProfile(profileData)
      setActivities(activitiesData)
      setFriends(friendsData)

      // Check connection status between current user and target user
      if (currentUserId && currentUserId !== targetUserId) {
        const status = await getConnectionStatus(currentUserId, targetUserId)
        setConnectionStatus(status.status)
        setConnectionId(status.connectionId)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async () => {
    if (!currentUserId || !userId || typeof userId !== 'string') return

    try {
      const result = await addFriend(currentUserId, userId)
      
      if (result.success) {
        setConnectionStatus('pending_sent')
        console.log('Friend request sent!')
      } else {
        console.error(`Failed to send friend request: ${result.message}`)
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
    }
  }

  const handleRemoveFriend = async () => {
    if (!currentUserId || !userId || typeof userId !== 'string') return

    try {
      const result = await removeFriend(currentUserId, userId)
      
      if (result.success) {
        setConnectionStatus('none')
        // Refresh friends list
        const friendsData = await getFriends(currentUserId)
        setFriends(friendsData)
        console.log('Friend removed')
      } else {
        console.error(`Failed to remove friend: ${result.message}`)
      }
    } catch (error) {
      console.error('Error removing friend:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Profile not found</div>
      </div>
    )
  }

  const isOwnProfile = currentUserId === userId

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/search" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Link>
        </div>

        <Card className="mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar} alt={profile.username} />
                  <AvatarFallback className="text-lg">
                    {profile.firstName?.[0] || profile.username[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold">
                    {profile.firstName && profile.lastName
                      ? `${profile.firstName} ${profile.lastName}`
                      : profile.username}
                  </h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                  {profile.location && (
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {profile.location}
                    </div>
                  )}
                </div>
              </div>
              
              {!isOwnProfile && currentUserId && (
                <div className="flex gap-2">
                  {connectionStatus === 'friends' ? (
                    <Button
                      variant="outline"
                      onClick={handleRemoveFriend}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Friend
                    </Button>
                  ) : connectionStatus === 'pending_sent' ? (
                    <Button variant="outline" disabled>
                      Request Sent
                    </Button>
                  ) : connectionStatus === 'pending_received' ? (
                    <Button variant="outline" disabled>
                      Request Pending
                    </Button>
                  ) : connectionStatus === 'blocked' ? (
                    <Button variant="outline" disabled>
                      Blocked
                    </Button>
                  ) : (
                    <Button onClick={handleAddFriend}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Friend
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{activities.length}</div>
                <div className="text-sm text-muted-foreground">Activities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{friends.length}</div>
                <div className="text-sm text-muted-foreground">Friends</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </div>
                <div className="text-sm text-muted-foreground">Joined</div>
              </div>
            </div>

            <div className="space-y-4">
              {profile.bio && (
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-muted-foreground">{profile.bio}</p>
                </div>
              )}
              {profile.interests.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <Badge key={index} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="activities" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activities ({activities.length})
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Friends ({friends.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-4">
            {activities.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No activities yet</h3>
                  <p className="text-muted-foreground text-center">
                    This user hasn't posted any activities yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activities.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{activity.text}</p>
                          {activity.location && (
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {activity.location}
                            </div>
                          )}
                          {activity.tags && activity.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {activity.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity.createdAt && new Date(activity.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends" className="space-y-4">
            {friends.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                  <p className="text-muted-foreground text-center">
                    This user hasn't connected with anyone yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {friends.map((friend) => (
                  <Card key={friend.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Link href={`/user/${friend.id}`} className="flex items-center space-x-4 hover:opacity-75">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.avatar} alt={friend.username} />
                            <AvatarFallback>
                              {friend.firstName?.[0] || friend.username[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              {friend.firstName && friend.lastName
                                ? `${friend.firstName} ${friend.lastName}`
                                : friend.username}
                            </h3>
                            <p className="text-sm text-muted-foreground">@{friend.username}</p>
                            {friend.location && (
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                {friend.location}
                              </div>
                            )}
                          </div>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}