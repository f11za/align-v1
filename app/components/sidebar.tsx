'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserProfile } from './userprofile'

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Start Scribing', href: '/record' },
    { name: 'Patient Vault', href: '/vault' },
  ];

  return (
    <aside className="w-64 bg-sage-primary border-r border-white/10 h-screen sticky top-0 p-8 flex flex-col text-white">
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white tracking-tight">Align</h2>
        <div className="h-1 w-8 bg-white/80 mt-1 rounded-full" />
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`block px-4 py-3 rounded-xl font-medium transition-all ${
              pathname === item.href
                ? "bg-white text-sage-primary shadow-sm"
                : "text-white/75 hover:text-white hover:bg-white/10"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <UserProfile />
    </aside>
  );
}