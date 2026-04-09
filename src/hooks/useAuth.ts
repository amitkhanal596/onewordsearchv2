/**
 * useAuth Hook
 *
 * Client-side hook for accessing authentication state and user data.
 * This hook subscribes to Supabase auth state changes and provides
 * real-time updates when the user signs in or out.
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/auth'

interface UseAuthReturn {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        // Fetch profile if user exists
        if (initialSession?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', initialSession.user.id)
            .single()

          setProfile(profileData)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      // Fetch profile when user signs in
      if (currentSession?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single()

        setProfile(profileData)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    session,
    profile,
    loading,
  }
}
