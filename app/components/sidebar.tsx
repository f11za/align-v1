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
  <aside className="w-64 bg-sage-light border-r border-sage-border h-screen sticky top-0 p-8 flex flex-col">
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-sage-primary tracking-tight">Align</h2>
      <div className="h-1 w-8 bg-sage-primary mt-1 rounded-full" />
    </div>
    
    <nav className="flex-1 space-y-2">
      {navItems.map((item) => (
        <Link 
          key={item.name} 
          href={item.href}
          className={`block px-4 py-3 rounded-xl font-medium transition-all ${
            pathname === item.href 
              ? "bg-white text-sage-primary shadow-sm ring-1 ring-slate-200" 
              : "text-slate-500 hover:text-sage-primary hover:bg-white/50"
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