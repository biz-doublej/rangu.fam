'use client'

/**
 * 정민석 — Hospitality Portfolio (English).
 *
 * 톤: 럭셔리 호텔 매거진 (Aman / Four Seasons / Mandarin Oriental 톤).
 *     warm ivory + brass gold + deep forest, Cormorant/Playfair serif,
 *     editorial layout, generous whitespace.
 *
 * 목적: 호텔 인턴십 지원 시 HR/디렉터에게 보여줄 수 있는 영문 포트폴리오.
 *       소스: Minseok_Jung_CV.pdf, GCS Barista/Roasting Lv1, Qualifi Level 5 Diploma.
 */

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

const EDUCATION = [
  {
    period: 'Feb 2026 — Present',
    institution: 'IMI International Management Institute Switzerland',
    location: 'Luzern, Switzerland',
    program: 'BA (Hons) in International Hospitality Business Management',
    detail:
      'Currently pursuing an honours degree at one of Switzerland’s most established hospitality schools, with a focus on global luxury operations and service leadership.',
  },
  {
    period: 'Jan 2024 — Jun 2025',
    institution: 'Catalyst of Academics',
    location: 'Republic of Korea',
    program: 'Qualifi Level 5 Extended Diploma — Hospitality & Tourism Management',
    detail:
      'Awarded 15 July 2025 (Cert. Ref. 90797 · Ofqual-regulated). 240 credits across operations, sustainability, destination management, and an independent research project.',
  },
]

const QUALIFI_UNITS = [
  { code: 'J/617/5587', title: 'Sustainability in Tourism & Hospitality Management', level: 4 },
  { code: 'L/617/5588', title: 'Operations Management in Tourism & Resort Operations', level: 4 },
  { code: 'R/617/5589', title: 'Management of Visitor Attractions', level: 4 },
  { code: 'J/617/5590', title: 'Employability & Development in Hospitality Industry', level: 4 },
  { code: 'H/617/5631', title: 'Tourism Destination Management', level: 5 },
  { code: 'T/617/5634', title: 'Entrepreneurship in Tourism & Hospitality Management', level: 5 },
  { code: 'L/617/5719', title: 'Cultural Tourism Management', level: 5 },
  { code: 'F/617/5720', title: 'Research Project', level: 5 },
]

const EXPERIENCE = [
  {
    role: 'Full-time Team Member',
    company: 'Tom N Toms Coffee',
    location: 'Seoul, Republic of Korea',
    period: 'Nov 2024 — Mar 2025',
    bullets: [
      'Prepared specialty beverages to brand-standard recipes during continuous high-volume service.',
      'Delivered attentive, on-brand guest service in a fast-paced café environment.',
      'Supported the rollout of seasonal promotional campaigns and limited-edition menus.',
      'Maintained POS accuracy and handled daily cash reconciliation without variance.',
    ],
  },
  {
    role: 'Full-time Operations Associate',
    company: 'Waffle Shop',
    location: 'Seoul, Republic of Korea',
    period: 'Mar 2024 — Oct 2024',
    bullets: [
      'Supervised daily store operations and coordinated team scheduling across split shifts.',
      'Managed peak-hour guest flow while protecting service quality and ticket times.',
      'Monitored inventory and controlled stock levels to minimise waste and stock-outs.',
      'Contributed to revenue growth through structured upselling and menu suggestion.',
      'Upheld hygiene and HACCP-aligned operational standards across the front and back of house.',
    ],
  },
]

const CERTIFICATIONS = [
  {
    title: 'GCS Techno Barista — Level 1',
    issuer: 'Global Coffee School',
    date: 'Feb 27, 2026',
    ref: 'GB-LV1-14052',
  },
  {
    title: 'GCS Techno Roasting — Level 1',
    issuer: 'Global Coffee School',
    date: 'Feb 27, 2026',
    ref: 'GR-LV1-1491',
  },
  {
    title: 'Qualifi Level 5 Extended Diploma',
    issuer: 'Qualifi Ltd (Ofqual-regulated, UK)',
    date: 'Jul 15, 2025',
    ref: '610/3386/8',
  },
  {
    title: 'IELTS Academic',
    issuer: 'British Council / IDP',
    date: '2025',
    ref: 'Overall Band 6.0',
  },
]

const COMPETENCIES = [
  { label: 'Food & Beverage Operations', desc: 'Service flow, recipe adherence, station discipline.' },
  { label: 'Guest Service Excellence', desc: 'Attentive, anticipatory, calm under pressure.' },
  { label: 'Sales & Upselling', desc: 'Suggestive selling that respects guest experience.' },
  { label: 'Inventory & Cost Control', desc: 'Par-level management, waste reduction, ordering.' },
  { label: 'POS & Cash Handling', desc: 'Accurate transactions, end-of-day reconciliation.' },
  { label: 'Team Coordination', desc: 'Scheduling, briefings, mentoring junior staff.' },
  { label: 'Cross-cultural Communication', desc: 'KR/EN service across diverse guest profiles.' },
  { label: 'Specialty Coffee', desc: 'Espresso preparation, roast profiling fundamentals.' },
]

const LANGUAGES = [
  { name: 'Korean', level: 'Native' },
  { name: 'English', level: 'Fluent · IELTS 6.0' },
]

export default function MinseokHospitalityPage({
  onSwitchToMusic,
}: {
  onSwitchToMusic?: () => void
}) {
  const reduce = useReducedMotion()

  return (
    <div className="minseok-hosp min-h-screen bg-[#FAF6EC] text-[#1B140A] antialiased">
      {/* paper texture */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\' stitchTiles=\'stitch\'/></filter><rect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.55\'/></svg>")',
        }}
      />

      {/* ===== Top Bar ===== */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 pt-8 md:px-10">
        <Link
          href="https://rangu-fam.com"
          className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#6B5B3D] hover:text-[#1B140A] transition"
        >
          ← rangu.fam
        </Link>

        <div className="hidden items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-[#6B5B3D] md:flex">
          <span className="font-mono">Portfolio</span>
          <span className="text-[#B08D57]">◆</span>
          <span className="font-mono">Hospitality Edition</span>
        </div>

        <button
          type="button"
          onClick={onSwitchToMusic}
          className="group flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-[#6B5B3D] transition hover:text-[#1B140A]"
        >
          <span>music</span>
          <span className="transition group-hover:translate-x-0.5">→</span>
        </button>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 md:px-10 md:pt-32">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.6 }}
          className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#B08D57]"
        >
          Aspiring Hospitality Professional &nbsp;·&nbsp; IMI Switzerland &nbsp;·&nbsp; 2026
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.9, delay: 0.1 }}
          className="font-serif mt-8 text-[3.4rem] leading-[0.95] tracking-[-0.02em] text-[#1B140A] md:text-[7rem] md:leading-[0.92]"
        >
          Minseok
          <span className="block italic text-[#1F3A2E]">Jung.</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.8, delay: 0.3 }}
          className="mt-14 grid gap-12 md:grid-cols-[1.4fr,1fr] md:items-end"
        >
          <p className="font-serif text-[1.35rem] leading-relaxed text-[#3a2e1c] md:text-[1.6rem]">
            A future hotelier in training at{' '}
            <span className="italic">IMI Switzerland</span> — combining a Qualifi Level 5
            Diploma, certified specialty-coffee expertise, and a year of full-time
            front-line F&amp;B service in Seoul.
            <span className="mt-3 block text-[1rem] text-[#6B5B3D] md:text-[1.1rem]">
              Seeking a six-month operational internship to learn the craft from the floor up.
            </span>
          </p>

          <div className="grid grid-cols-2 gap-px border border-[#D8C9A6] bg-[#D8C9A6] text-[#1B140A]">
            <Stat label="Availability" value="Aug 2026 — Jan 2027" />
            <Stat label="Minimum" value="6 months" />
            <Stat label="Function" value="F&B / Rotation" />
            <Stat label="Region" value="KR · Asia-Pacific" />
          </div>
        </motion.div>

        {/* gold rule */}
        <div className="mt-20 flex items-center gap-6">
          <span className="h-px flex-1 bg-[#D8C9A6]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#B08D57]">
            Portfolio · MJ · 2026
          </span>
          <span className="h-px flex-1 bg-[#D8C9A6]" />
        </div>
      </section>

      {/* ===== Profile statement ===== */}
      <section className="relative bg-[#F2EADA]">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10">
          <SectionLabel index="01" caption="Profile" />

          <div className="mt-10 grid gap-12 md:grid-cols-[1fr,1.6fr]">
            <h2 className="font-serif text-3xl italic leading-tight text-[#1F3A2E] md:text-5xl">
              Service is a craft.
              <br />
              I want to learn it on the floor.
            </h2>

            <div className="space-y-6 font-serif text-[1.05rem] leading-[1.75] text-[#2a2010] md:text-[1.15rem]">
              <p>
                Born in 2005 in Yeongwol, Gangwon-do, I am an honours student of International
                Hospitality Business Management at IMI Switzerland. My route into the industry
                began on the floor — a full year as a full-time team member at a Seoul waffle
                shop and at Tom N Toms Coffee, where I learned that consistency, hygiene, and
                guest care are not abstract values but daily decisions.
              </p>
              <p>
                I hold a Qualifi Level 5 Extended Diploma in Hospitality and Tourism Management
                (Ofqual-regulated, UK) and certifications in Techno Barista and Roasting from
                Global Coffee School. I am calm in service pressure, comfortable across
                cultures, and looking to apply what I&apos;ve learned in a properties&apos; F&amp;B
                or rotational programme.
              </p>
              <p className="font-serif italic text-[#6B5B3D]">
                &mdash; M. Jung, Luzern, 2026.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Education ===== */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10">
          <SectionLabel index="02" caption="Education" />

          <h2 className="font-serif mt-6 text-4xl text-[#1B140A] md:text-6xl">
            Trained where hospitality
            <span className="block italic text-[#1F3A2E]">is taken seriously.</span>
          </h2>

          <div className="mt-16 space-y-px bg-[#D8C9A6]">
            {EDUCATION.map((e, i) => (
              <motion.article
                key={e.institution}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: reduce ? 0 : 0.6, delay: i * 0.08 }}
                className="bg-[#FAF6EC] px-6 py-10 md:px-10 md:py-14"
              >
                <div className="grid gap-8 md:grid-cols-[200px,1fr]">
                  <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#B08D57]">
                    {e.period}
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#6B5B3D]">
                      {e.location}
                    </p>
                    <h3 className="font-serif mt-3 text-[1.9rem] leading-tight text-[#1B140A] md:text-[2.4rem]">
                      {e.institution}
                    </h3>
                    <p className="font-serif mt-3 text-[1.05rem] italic text-[#1F3A2E] md:text-[1.2rem]">
                      {e.program}
                    </p>
                    <p className="font-serif mt-5 max-w-3xl text-[1rem] leading-[1.75] text-[#3a2e1c]">
                      {e.detail}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Qualifi credit unit table */}
          <div className="mt-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#B08D57]">
              ◆ Qualifi Level 5 Diploma — Unit Credits (240 total · all passed)
            </p>
            <div className="mt-6 overflow-x-auto border border-[#D8C9A6]">
              <table className="w-full min-w-[560px] text-left text-sm md:text-base">
                <thead className="bg-[#F2EADA] font-mono text-[10px] uppercase tracking-[0.24em] text-[#6B5B3D]">
                  <tr>
                    <th className="px-4 py-3 md:px-6 md:py-4">Unit</th>
                    <th className="px-4 py-3 md:px-6 md:py-4">Title</th>
                    <th className="px-4 py-3 text-right md:px-6 md:py-4">Level</th>
                    <th className="px-4 py-3 text-right md:px-6 md:py-4">Credits</th>
                  </tr>
                </thead>
                <tbody className="font-serif">
                  {QUALIFI_UNITS.map((u) => (
                    <tr key={u.code} className="border-t border-[#E8DCC0]">
                      <td className="px-4 py-4 font-mono text-[11px] text-[#6B5B3D] md:px-6">
                        {u.code}
                      </td>
                      <td className="px-4 py-4 text-[#1B140A] md:px-6">{u.title}</td>
                      <td className="px-4 py-4 text-right text-[#1F3A2E] md:px-6">{u.level}</td>
                      <td className="px-4 py-4 text-right font-mono text-[#1B140A] md:px-6">
                        30
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F2EADA] font-mono text-[11px] uppercase tracking-[0.24em] text-[#1F3A2E]">
                  <tr>
                    <td className="px-4 py-4 md:px-6" colSpan={3}>
                      Total
                    </td>
                    <td className="px-4 py-4 text-right md:px-6">240 credits · Pass</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Experience ===== */}
      <section className="relative bg-[#1F3A2E] text-[#F3EBD8]">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10">
          <SectionLabel index="03" caption="Experience" tone="dark" />

          <h2 className="font-serif mt-6 text-4xl text-[#F3EBD8] md:text-6xl">
            One full year
            <span className="block italic text-[#D4B071]">on the floor.</span>
          </h2>

          <div className="mt-16 grid gap-12 md:grid-cols-2">
            {EXPERIENCE.map((x, i) => (
              <motion.article
                key={x.company}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: reduce ? 0 : 0.6, delay: i * 0.1 }}
                className="border border-[#3a5848] bg-[#1A3327] p-8 md:p-10"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#D4B071]">
                  {x.period}
                </p>
                <h3 className="font-serif mt-4 text-[1.7rem] leading-tight text-[#F3EBD8] md:text-[2.1rem]">
                  {x.company}
                </h3>
                <p className="font-serif mt-1 text-[1rem] italic text-[#B8C9B7]">
                  {x.role} &nbsp;·&nbsp; {x.location}
                </p>

                <ul className="mt-8 space-y-4 text-[0.95rem] leading-[1.7] text-[#E0D3B0]">
                  {x.bullets.map((b) => (
                    <li key={b} className="flex gap-3">
                      <span className="mt-2 inline-block h-px w-4 flex-none bg-[#D4B071]" />
                      <span className="font-serif">{b}</span>
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Certifications ===== */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10">
          <SectionLabel index="04" caption="Certifications" />

          <h2 className="font-serif mt-6 text-4xl text-[#1B140A] md:text-6xl">
            Credentialed
            <span className="block italic text-[#1F3A2E]">and verifiable.</span>
          </h2>

          <div className="mt-16 grid gap-px border border-[#D8C9A6] bg-[#D8C9A6] md:grid-cols-2">
            {CERTIFICATIONS.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: reduce ? 0 : 0.5, delay: i * 0.06 }}
                className="group relative overflow-hidden bg-[#FAF6EC] p-8 md:p-10"
              >
                <div className="absolute right-6 top-6 font-serif text-[3rem] leading-none text-[#E8DCC0] transition group-hover:text-[#D4B071] md:text-[4rem]">
                  ◆
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#B08D57]">
                  {c.date}
                </p>
                <h3 className="font-serif mt-4 text-[1.5rem] leading-tight text-[#1B140A] md:text-[1.75rem]">
                  {c.title}
                </h3>
                <p className="font-serif mt-2 italic text-[#1F3A2E]">{c.issuer}</p>
                <p className="font-mono mt-6 text-[11px] uppercase tracking-[0.2em] text-[#6B5B3D]">
                  Ref · {c.ref}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Competencies ===== */}
      <section className="relative bg-[#F2EADA]">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10">
          <SectionLabel index="05" caption="Competencies" />

          <h2 className="font-serif mt-6 text-4xl text-[#1B140A] md:text-6xl">
            Trained for the
            <span className="block italic text-[#1F3A2E]">guest-facing floor.</span>
          </h2>

          <div className="mt-14 grid gap-px bg-[#D8C9A6] md:grid-cols-2 lg:grid-cols-4">
            {COMPETENCIES.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: reduce ? 0 : 0.45, delay: i * 0.04 }}
                className="bg-[#FAF6EC] p-6 md:p-7"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#B08D57]">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="font-serif mt-3 text-[1.1rem] leading-tight text-[#1B140A] md:text-[1.2rem]">
                  {c.label}
                </h3>
                <p className="font-serif mt-3 text-[0.92rem] leading-[1.6] text-[#5a4a30]">
                  {c.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Languages */}
          <div className="mt-16 grid gap-12 md:grid-cols-[1fr,2fr] md:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#B08D57]">
                ◆ Languages
              </p>
              <h3 className="font-serif mt-3 text-3xl italic text-[#1F3A2E]">
                Korean &amp; English.
              </h3>
            </div>
            <ul className="grid gap-px bg-[#D8C9A6] md:grid-cols-2">
              {LANGUAGES.map((l) => (
                <li
                  key={l.name}
                  className="flex items-baseline justify-between bg-[#FAF6EC] px-6 py-5"
                >
                  <span className="font-serif text-[1.4rem] text-[#1B140A]">{l.name}</span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#6B5B3D]">
                    {l.level}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== Availability & Preferences ===== */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10">
          <SectionLabel index="06" caption="Internship Availability" />

          <div className="mt-12 grid gap-16 md:grid-cols-[1.1fr,1fr]">
            <div>
              <h2 className="font-serif text-4xl text-[#1B140A] md:text-6xl">
                Available for a
                <span className="block italic text-[#1F3A2E]">six-month placement.</span>
              </h2>
              <p className="font-serif mt-8 max-w-xl text-[1.05rem] leading-[1.8] text-[#3a2e1c] md:text-[1.15rem]">
                I am open to operational internships of at least six months, with a strong
                preference for Food &amp; Beverage roles or rotational programmes that allow
                exposure to multiple departments. Korean and English working environments
                are both comfortable.
              </p>
            </div>

            <dl className="space-y-px border border-[#D8C9A6] bg-[#D8C9A6]">
              <Row label="Availability" value="August 2026 — January 2027" />
              <Row label="Duration" value="Minimum 6 months" />
              <Row label="Function preference" value="F&B Operations · Job Rotation" />
              <Row label="Primary location" value="Republic of Korea" />
              <Row label="Open to" value="Asia-Pacific properties" />
              <Row label="Visa / work auth." value="Available — KR national" />
            </dl>
          </div>
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section className="relative bg-[#1B140A] text-[#F3EBD8]">
        <div className="mx-auto max-w-6xl px-6 py-28 md:px-10 md:py-36">
          <SectionLabel index="07" caption="Contact" tone="dark" />

          <h2 className="font-serif mt-8 text-5xl italic leading-[1] text-[#F3EBD8] md:text-[7rem]">
            Let&apos;s talk.
          </h2>

          <div className="mt-16 grid gap-10 md:grid-cols-3">
            <ContactRow label="Personal" value="05alstjr@gmail.com" href="mailto:05alstjr@gmail.com" />
            <ContactRow
              label="IMI Luzern"
              value="311867@imi-luzern.com"
              href="mailto:311867@imi-luzern.com"
            />
            <ContactRow label="Phone" value="+82 10 9700 0553" href="tel:+821097000553" />
          </div>

          <div className="mt-16 grid gap-10 border-t border-[#3a2e1c] pt-12 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#D4B071]">
                ◆ Mailing address
              </p>
              <p className="font-serif mt-3 text-[1.1rem] leading-[1.7] text-[#E0D3B0]">
                140-7, Mureung-gil, Mureungdowon-myeon,
                <br />
                Yeongwol-gun, Gangwon-do,
                <br />
                Republic of Korea
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#D4B071]">
                ◆ References &amp; documents
              </p>
              <p className="font-serif mt-3 text-[1.05rem] leading-[1.7] text-[#E0D3B0]">
                Full CV, original Qualifi e-certificate (QR-verifiable), GCS Barista &amp;
                Roasting certificates, and IELTS TRF can be provided upon request.
              </p>
            </div>
          </div>

          <div className="mt-20 flex flex-col items-center gap-6 border-t border-[#3a2e1c] pt-12 md:flex-row md:justify-between">
            <Link
              href="https://rangu-fam.com"
              className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#D4B071] transition hover:text-[#F3EBD8]"
            >
              ← rangu.fam
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#6B5B3D]">
              Minseok Jung &nbsp;·&nbsp; Hospitality Portfolio &nbsp;·&nbsp; Edition 2026
            </p>
            <button
              type="button"
              onClick={onSwitchToMusic}
              className="group flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-[#D4B071] transition hover:text-[#F3EBD8]"
            >
              <span>flip · music side</span>
              <span className="transition group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>
      </section>

      <style jsx>{`
        .minseok-hosp :global(.font-serif) {
          font-family: 'Cormorant Garamond', 'Playfair Display', 'EB Garamond', Georgia, serif;
          font-weight: 500;
        }
        .minseok-hosp :global(.font-mono) {
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .minseok-hosp :global(h1.font-serif),
        .minseok-hosp :global(h2.font-serif),
        .minseok-hosp :global(h3.font-serif) {
          font-weight: 500;
          letter-spacing: -0.005em;
        }
      `}</style>
    </div>
  )
}

/* ---------- subcomponents ---------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FAF6EC] px-5 py-5">
      <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-[#B08D57]">{label}</p>
      <p className="font-serif mt-2 text-[1.05rem] leading-tight text-[#1B140A] md:text-[1.2rem]">
        {value}
      </p>
    </div>
  )
}

function SectionLabel({
  index,
  caption,
  tone = 'light',
}: {
  index: string
  caption: string
  tone?: 'light' | 'dark'
}) {
  const color = tone === 'dark' ? 'text-[#D4B071]' : 'text-[#B08D57]'
  const rule = tone === 'dark' ? 'bg-[#3a5848]' : 'bg-[#D8C9A6]'
  return (
    <div className="flex items-center gap-5">
      <span className={`font-mono text-[11px] uppercase tracking-[0.32em] ${color}`}>
        Chapter {index}
      </span>
      <span className={`h-px w-12 ${rule}`} />
      <span className={`font-mono text-[11px] uppercase tracking-[0.32em] ${color}`}>
        {caption}
      </span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between bg-[#FAF6EC] px-6 py-5">
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#6B5B3D]">
        {label}
      </span>
      <span className="font-serif text-right text-[1rem] text-[#1B140A] md:text-[1.05rem]">
        {value}
      </span>
    </div>
  )
}

function ContactRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a href={href} className="group block">
      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#D4B071]">{label}</p>
      <p className="font-serif mt-3 break-all border-b border-[#3a2e1c] pb-2 text-[1.2rem] text-[#F3EBD8] transition group-hover:border-[#D4B071] md:text-[1.4rem]">
        {value}
      </p>
    </a>
  )
}
