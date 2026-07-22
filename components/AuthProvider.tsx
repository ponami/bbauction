"use client"

import SupabaseSessionSync from "./SupabaseSessionSync"

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SupabaseSessionSync />
      {children}
    </>
  )
}
