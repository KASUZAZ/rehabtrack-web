'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/dashboard', icon: '⌂', label: 'Dashboard' },
  { href: '/history', icon: '↺', label: 'History' },
  { href: '/device', icon: '⌁', label: 'Device' },
]

export default function AppShell({ children, name, deviceConnected = false }: { children: React.ReactNode; name?: string | null; deviceConnected?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  const logout = async () => {
    await createClient().auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div><strong>RehabTrack</strong><span>Motion Monitor</span></div>
        </div>

        <nav className="nav-list">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? 'nav-item active' : 'nav-item'}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className={deviceConnected ? 'connection online' : 'connection'}>
            <span className="dot" /> {deviceConnected ? 'ESP32 Connected' : 'No Device'}
          </div>
          <button className="ghost-btn full" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div><span className="eyebrow">PATIENT PORTAL</span><h2>{name ? `Hi, ${name}` : 'Exercise Monitoring'}</h2></div>
          <div className="avatar">{(name || 'P').slice(0, 1).toUpperCase()}</div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
