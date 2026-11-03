'use client';
import { useState } from 'react';
import { SOURCES, type Evidence, type OrganInfo } from '@/lib/organs';

const TABS = [
  { id: 'human', label: 'Pada manusia', icon: 'person', tone: 'text-[#6bff8f]' },
  { id: 'lab', label: 'Hewan & lab', icon: 'biotech', tone: 'text-[#7dd3fc]' },
  { id: 'mechanism', label: 'Masih diteliti', icon: 'manage_search', tone: 'text-[#ffdf9a]' },
  { id: 'uncertain', label: 'Dampak belum pasti', icon: 'help', tone: 'text-[#ffb4ab]' },
] as const;

function Cited({ evidence, className = '' }: { evidence: Evidence; className?: string }) {
  return (
    <p className={`text-[13px] sm:text-sm leading-relaxed text-white/95 ${className}`}>
      {evidence.text}{' '}
      <span className="text-[11px] sm:text-xs text-white/70">
        {evidence.sources.map((id, index) => (
          <span key={id}>
            {index > 0 && '; '}
            <a href={`https://doi.org/${SOURCES[id].doi}`} target="_blank" rel="noreferrer" title={SOURCES[id].title} className="underline underline-offset-2 whitespace-nowrap">
              {SOURCES[id].label}
            </a>
          </span>
        ))}
      </span>
    </p>
  );
}

function Heading({ icon, children }: { icon: string; children: string }) {
  return (
    <h4 className="flex items-center gap-1.5 text-[11px] sm:text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold text-white/70 mb-1">
      <span className="material-symbols-outlined text-base leading-none">{icon}</span>
      {children}
    </h4>
  );
}

/** Panel bukti: temuan manusia, hewan atau lab, mekanisme, dan dampak yang belum pasti tidak dicampur */
export default function OrganEvidencePanel({ info }: { info: OrganInfo }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('human');
  const active = TABS.find(item => item.id === tab) ?? TABS[0];

  return (
    <div className="space-y-3">
      <section>
        <Heading icon="info">Fungsi utama</Heading>
        <p className="text-[13px] sm:text-sm leading-relaxed text-white/95">{info.func}</p>
      </section>

      <section>
        <Heading icon="route">Jalur paparan</Heading>
        <Cited evidence={info.route} />
      </section>

      <section>
        <Heading icon="science">Ringkasan penelitian</Heading>
        <div role="tablist" aria-label="Jenis bukti" className="grid grid-cols-2 gap-1.5">
          {TABS.map(item => (
            <button
              key={item.id}
              role="tab"
              aria-selected={item.id === tab}
              onClick={() => setTab(item.id)}
              className={`min-h-11 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 active:scale-95 ${
                item.id === tab ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/15 text-white/75'
              }`}
            >
              <span className={`material-symbols-outlined text-base leading-none ${item.tone}`}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="mt-2 rounded-xl bg-black/25 border border-white/10 p-3">
          <Cited evidence={info[active.id]} />
        </div>
      </section>

      <section className="rounded-xl border-l-4 border-[#ffdf9a] bg-white/5 p-3">
        <Heading icon="error">Batasan pengetahuan</Heading>
        <Cited evidence={info.limits} />
      </section>
    </div>
  );
}
