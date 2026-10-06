import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '../components/Footer'
import RatecardClient from '../components/ratecard/RatecardClient'
import { logout } from '@/app/actions/auth'

export const metadata: Metadata = {
  title: 'KOL Ratecard · Honda Digital Content Intelligence',
}

export default function RatecardPage() {
  return (
    <>
      <header className="bg-white" style={{ borderTop: '4px solid #E62533', borderBottom: '1px solid #E5E7EB' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://asset.honda-indonesia.com/2023/10/19/logo-side.svg"
            alt="Honda"
            className="h-8 sm:h-9 flex-shrink-0"
          />
          <div className="hidden sm:block flex-shrink-0" style={{ width: '1px', height: '32px', background: '#E5E7EB' }} />
          <h1 className="flex-1 min-w-0 font-roboto font-bold truncate" style={{ fontSize: '15px', lineHeight: '1.3', color: '#111827' }}>
            KOL Ratecard
          </h1>
          <Link
            href="/dashboard"
            style={{ fontSize: '12px', color: '#E62533', fontWeight: 600, padding: '2px 4px', textDecoration: 'none' }}
          >
            Dashboard
          </Link>
          <form action={logout as () => Promise<void>}>
            <button
              type="submit"
              style={{ fontSize: '12px', color: '#999999', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>
      <main>
        <RatecardClient />
      </main>
      <Footer />
    </>
  )
}
