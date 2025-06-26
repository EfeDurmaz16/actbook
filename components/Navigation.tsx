"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Search, 
  Users, 
  User,
  Activity,
  Bell
} from 'lucide-react'

const navigationItems = [
  {
    name: 'Home',
    href: '/',
    icon: Home,
    authRequired: false
  },
  {
    name: 'Search',
    href: '/search',
    icon: Search,
    authRequired: false
  },
  {
    name: 'Connections',
    href: '/connections',
    icon: Users,
    authRequired: true
  },
  {
    name: 'Activities',
    href: '/activities',
    icon: Activity,
    authRequired: true
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
    authRequired: true
  }
]

export function Navigation() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()

  const visibleItems = navigationItems.filter(item => 
    !item.authRequired || isAuthenticated
  )

  return (
    <nav className="flex items-center space-x-1">
      {visibleItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:block">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}