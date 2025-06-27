"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { getFriends, getUserActivities, addFriend, removeFriend } from '@/lib/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { MapPin, Users, Calendar, Edit2, Save, X, UserPlus, UserMinus, Activity } from 'lucide-react'
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

export default function ProfilePage() {
  const { username, userId } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [friends, setFriends] = useState<User[]>([])
  const [activities, setActivities] = useState<Intent[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    interests: [] as string[]
  })
  const [newInterest, setNewInterest] = useState('')

  useEffect(() => {
    console.log('Profile page useEffect - userId:', userId, 'username:', username)
    if (userId) {
      fetchProfileData()
    } else if (userId === null) {
      // User is not authenticated
      setLoading(false)
    }
  }, [userId, username])

  const fetchProfileData = async () => {
    try {
      // Create a mock profile for now since we don't have a real API
      const mockProfile: UserProfile = {
        id: userId!,
        username: username!,
        firstName: '',
        lastName: '',
        bio: '',
        avatar: '',
        location: '',
        interests: [],
        isActive: true,
        lastSeen: new Date(),
        createdAt: new Date(),
        _count: {
          intents: 0,
          sentConnections: 0,
          receivedConnections: 0
        }
      }
      
      // Fetch friends and activities in parallel
      const [friendsData, activitiesData] = await Promise.all([
        getFriends(userId!),
        getUserActivities(userId!)
      ])

      setProfile(mockProfile)
      setEditForm({
        firstName: '',
        lastName: '',
        bio: '',
        location: '',
        interests: []
      })

      setFriends(friendsData)
      setActivities(activitiesData)
      
      // Update counts based on actual data
      setProfile(prev => prev ? {
        ...prev,
        _count: {
          ...prev._count,
          intents: activitiesData.length
        }
      } : prev)
    } catch (error) {
      console.error('Error fetching profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      // Update profile locally since we don't have a real API
      setProfile(prev => prev ? {
        ...prev,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        bio: editForm.bio,
        location: editForm.location,
        interests: editForm.interests
      } : prev)
      
      setEditing(false)
      
      // Refresh friends and activities
      const [friendsData, activitiesData] = await Promise.all([
        getFriends(userId!),
        getUserActivities(userId!)
      ])
      setFriends(friendsData)
      setActivities(activitiesData)
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const addInterest = () => {
    if (newInterest.trim() && !editForm.interests.includes(newInterest.trim())) {
      setEditForm({
        ...editForm,
        interests: [...editForm.interests, newInterest.trim()]
      })
      setNewInterest('')
    }
  }

  const removeInterest = (interest: string) => {
    setEditForm({
      ...editForm,
      interests: editForm.interests.filter(i => i !== interest)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading profile...</div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Please log in to view your profile</div>
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

  const totalConnections = profile._count.sentConnections + profile._count.receivedConnections

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const result = await removeFriend(userId!, friendId)
      if (result.success) {
        setFriends(prev => prev.filter(friend => friend.id !== friendId))
      }
    } catch (error) {
      console.error('Error removing friend:', error)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
              <Button
                variant={editing ? "destructive" : "outline"}
                onClick={() => {
                  if (editing) {
                    setEditing(false)
                    setEditForm({
                      firstName: profile.firstName || '',
                      lastName: profile.lastName || '',
                      bio: profile.bio || '',
                      location: profile.location || '',
                      interests: profile.interests || []
                    })
                  } else {
                    setEditing(true)
                  }
                }}
              >
                {editing ? <X className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
                {editing ? 'Cancel' : 'Edit Profile'}
              </Button>
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

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="Your location"
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Interests</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editForm.interests.map((interest, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer">
                        {interest}
                        <button
                          onClick={() => removeInterest(interest)}
                          className="ml-2 text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      placeholder="Add an interest"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addInterest()
                        }
                      }}
                    />
                    <Button type="button" onClick={addInterest}>
                      Add
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="activities" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              My Activities ({activities.length})
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
                    Start creating activities to connect with others
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
                    Connect with people who share your interests
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {friends.map((friend) => (
                  <Card key={friend.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
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
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                      
                      {friend.bio && (
                        <p className="text-sm text-muted-foreground mt-2 ml-14">
                          {friend.bio}
                        </p>
                      )}
                      
                      {friend.interests && friend.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 ml-14">
                          {friend.interests.slice(0, 3).map((interest, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                          {friend.interests.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{friend.interests.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
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