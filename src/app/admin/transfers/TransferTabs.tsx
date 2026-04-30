'use client'

import { useState } from 'react'
import TransferForm from './TransferForm'
import BulkTransferForm from './BulkTransferForm'

interface TeamOption { name: string; logo_url: string | null }
interface PlayerOption { slug: string; ign: string; photo_url: string | null }

interface Props {
  playerOptions: PlayerOption[]
  teamOptions: TeamOption[]
}

const tabClass = (active: boolean) =>
  `px-4 py-1.5 rounded text-sm font-semibold transition-colors ${
    active
      ? 'bg-orange-500 text-white'
      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
  }`

export default function TransferTabs({ playerOptions, teamOptions }: Props) {
  const [tab, setTab] = useState<'single' | 'bulk'>('single')

  return (
    <div className="rounded-xl p-5 mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Add Transfer
        </p>
        <div className="flex gap-1" style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 3 }}>
          <button type="button" className={tabClass(tab === 'single')} onClick={() => setTab('single')}>
            Single
          </button>
          <button type="button" className={tabClass(tab === 'bulk')} onClick={() => setTab('bulk')}>
            Bulk
          </button>
        </div>
      </div>

      {tab === 'single' ? (
        <TransferForm playerOptions={playerOptions} teamOptions={teamOptions} />
      ) : (
        <BulkTransferForm playerOptions={playerOptions} teamOptions={teamOptions} />
      )}
    </div>
  )
}
