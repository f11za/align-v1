'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './sidebar'

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/'

  return (
    <div className="flex min-h-screen bg-background">
      {!isAuthPage && <Sidebar />}

      <main
        className={
          isAuthPage
            ? "flex-1 min-h-screen overflow-y-auto"
            : "flex-1 p-8 overflow-y-auto"
        }
      >
        {children}
      </main>
    </div>
  )
}