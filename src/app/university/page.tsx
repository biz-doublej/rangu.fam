import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '랑구대학교 | Rang-Gu University',
  description:
    '진리·자유·평화. 더 나은 내일을 향한 도전. 2023년 개교한 사립 사이버대학교 랑구대학교 공식 홈페이지.',
}

// ── 학교 정보 (위키 출처: irang.wiki/wiki/랑구대학교) ──────────
const COLLEGES = [
  {
    key: 'humanities',
    name: '인문사회대학',
    hanja: '人文社會大學',
    en: 'College of Humanities & Social Sciences',
    founded: '2023.09.18',
    dean: '정민석',
    deanRole: '연애심리학 전임교수',
    accent: 'from-rose-700 via-rose-800 to-rose-900',
    departments: [
      {
        name: '연애심리학',
        founded: '2023.09.18',
        professor: '정민석',
        motto: '학교가 개교할 때부터 함께했던 명실상부 랑구대학교의 명품',
      },
      {
        name: '국사학',
        founded: '2025.09.27',
        professor: '강한울',
        motto: '역사를 잊은 민족에게 미래란 없다.',
      },
    ],
  },
  {
    key: 'engineering',
    name: '공과대학',
    hanja: '工科大學',
    en: 'College of Engineering',
    founded: '2024.12.29',
    dean: '정재원',
    deanRole: '컴퓨터공학 전임교수',
    accent: 'from-slate-700 via-slate-800 to-slate-900',
    departments: [
      {
        name: '컴퓨터공학',
        founded: '2024.12.29',
        professor: '정재원',
        motto: 'Building for Everyone.',
      },
      {
        name: '차량정비학',
        founded: '2025.09.24',
        professor: '김동성 (군휴직)',
        motto: '모든 차량은 정비를 받아야한다!',
      },
      {
        name: '기계공학',
        founded: '2024.12.29',
        professor: '정진규 (군휴직)',
        motto: '굳세고 용감한 기계과',
      },
    ],
  },
  {
    key: 'magic',
    name: '호그와트마법학교',
    hanja: '魔術大學',
    en: 'Hogwarts School of Magic',
    founded: '2025.09.27',
    dean: '이승찬',
    deanRole: '종합마술학 전임교수',
    accent: 'from-purple-800 via-violet-900 to-indigo-900',
    departments: [
      {
        name: '종합마술학',
        founded: '2025.09.27',
        professor: '이승찬',
        motto: 'MAGIC',
      },
      {
        name: '카드마술학',
        founded: '2025.09.27',
        professor: '강한울 (부교수)',
        motto: '카드에 퍼센트는 없다.',
      },
    ],
  },
]

const HISTORY = [
  { date: '2023.09.18', title: '병형신대학교 개교', body: '단일학과(연애심리학)로 출범. 정민석 초대 총장 취임.' },
  { date: '2024.12.29', title: '랑구대학교 전환', body: '교명 개칭. 3개 단과대학 7개 학과 체제로 확장.' },
  { date: '2025.09.24', title: '공과대학 차량정비학 신설', body: '김동성 교수 부임 (이후 군휴직).' },
  { date: '2025.09.27', title: '호그와트마법학교 신설', body: '국사학·종합마술학·카드마술학 동시 개설.' },
]

const QUICK_STATS = [
  { label: '개교', value: '2023', sub: '9월 18일' },
  { label: '단과대학', value: '3', sub: '학부 7개 학과' },
  { label: '재학생', value: '8', sub: '명' },
  { label: '교원', value: '8', sub: '전임 8 · 부교수 1' },
]

// ── 학교 정장 (Crest) SVG ────────────────────────────────────
function SchoolCrest({ size = 96, color = '#c9a96e' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-label="랑구대학교 정장">
      {/* 외곽 방패 */}
      <path
        d="M100 16 L168 36 L168 104 Q168 154 100 184 Q32 154 32 104 L32 36 Z"
        fill="#0a2540"
        stroke={color}
        strokeWidth="3"
      />
      {/* 안쪽 라인 */}
      <path
        d="M100 26 L158 44 L158 102 Q158 146 100 172 Q42 146 42 102 L42 44 Z"
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.5"
      />
      {/* 월계수 잎 좌측 */}
      <g fill={color} opacity="0.85">
        <ellipse cx="50" cy="80" rx="6" ry="14" transform="rotate(-30 50 80)" />
        <ellipse cx="48" cy="100" rx="6" ry="14" transform="rotate(-30 48 100)" />
        <ellipse cx="48" cy="120" rx="6" ry="14" transform="rotate(-30 48 120)" />
        <ellipse cx="52" cy="138" rx="5" ry="12" transform="rotate(-25 52 138)" />
      </g>
      {/* 월계수 잎 우측 */}
      <g fill={color} opacity="0.85">
        <ellipse cx="150" cy="80" rx="6" ry="14" transform="rotate(30 150 80)" />
        <ellipse cx="152" cy="100" rx="6" ry="14" transform="rotate(30 152 100)" />
        <ellipse cx="152" cy="120" rx="6" ry="14" transform="rotate(30 152 120)" />
        <ellipse cx="148" cy="138" rx="5" ry="12" transform="rotate(25 148 138)" />
      </g>
      {/* R 모노그램 */}
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fontFamily="'Gowun Batang', serif"
        fontSize="78"
        fontWeight="700"
        fill={color}
      >
        R
      </text>
      {/* 하단 RANG-GU 띠 */}
      <text
        x="100"
        y="158"
        textAnchor="middle"
        fontFamily="'Space Grotesk', sans-serif"
        fontSize="10"
        letterSpacing="2"
        fill={color}
      >
        RANG · GU · UNIV.
      </text>
    </svg>
  )
}

export default function UniversityPage() {
  return (
    <main
      className="min-h-screen text-stone-100"
      style={{
        background:
          'radial-gradient(ellipse at top, #0d2845 0%, #081729 50%, #050d18 100%)',
      }}
    >
      {/* ── 상단 학교 헤더 ──────────────────────────────────── */}
      <header className="border-b border-amber-700/20 backdrop-blur-sm bg-[#050d18]/40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SchoolCrest size={40} />
            <div className="leading-tight">
              <div className="text-base font-bold text-amber-100" style={{ fontFamily: "'Gowun Batang', serif" }}>
                랑구대학교
              </div>
              <div className="text-[10px] tracking-[0.3em] text-amber-300/70">RANG-GU UNIVERSITY</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-stone-300">
            <a href="#about" className="hover:text-amber-200 transition-colors">학교 소개</a>
            <a href="#colleges" className="hover:text-amber-200 transition-colors">단과대학</a>
            <a href="#history" className="hover:text-amber-200 transition-colors">연혁</a>
            <a href="#campus" className="hover:text-amber-200 transition-colors">캠퍼스</a>
            <a href="#admissions" className="hover:text-amber-200 transition-colors">입학</a>
            <a
              href="https://irang.wiki/wiki/%EB%9E%91%EA%B5%AC%EB%8C%80%ED%95%99%EA%B5%90"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 hover:text-amber-200 transition-colors"
            >
              위키 ↗
            </a>
          </nav>
          <Link
            href="/"
            className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            ← Rangu.fam
          </Link>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-amber-700/20">
        {/* 격자 배경 */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(201,169,110,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,110,0.6) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs tracking-[0.4em] text-amber-300/70 mb-4">EST · 2023 · SEOUL</div>
            <h1
              className="text-5xl md:text-7xl font-bold text-stone-100 leading-tight mb-3"
              style={{ fontFamily: "'Gowun Batang', serif" }}
            >
              浪區大學校
            </h1>
            <div className="text-2xl md:text-3xl text-amber-100/90 mb-2" style={{ fontFamily: "'Gowun Batang', serif" }}>
              랑구대학교
            </div>
            <div className="text-base tracking-[0.18em] text-stone-400 mb-8">
              RANG-GU UNIVERSITY
            </div>
            <div className="border-l-2 border-amber-500/60 pl-5 mb-10 max-w-xl">
              <div className="text-stone-300 text-sm uppercase tracking-[0.3em] mb-2 text-amber-200/70">
                교훈 · School Motto
              </div>
              <div
                className="text-3xl md:text-4xl text-stone-100"
                style={{ fontFamily: "'Gowun Batang', serif", letterSpacing: '0.1em' }}
              >
                진리 · 자유 · 평화
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="#colleges"
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-[#0a2540] font-semibold rounded-sm transition-colors"
              >
                단과대학 보기
              </a>
              <a
                href="#admissions"
                className="px-6 py-3 border border-amber-500/50 text-amber-100 hover:bg-amber-500/10 rounded-sm transition-colors"
              >
                입학 안내
              </a>
            </div>
          </div>

          {/* 학교 정장 */}
          <div className="flex justify-center md:justify-end">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full" />
              <div className="relative">
                <SchoolCrest size={320} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 표어 ──────────────────────────────────────────────── */}
      <section className="bg-amber-500/[0.03] border-b border-amber-700/10 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-xs tracking-[0.4em] text-amber-300/70 mb-4">VISION · 표어</div>
          <p
            className="text-3xl md:text-4xl text-amber-100 leading-relaxed"
            style={{ fontFamily: "'Gowun Batang', serif" }}
          >
            “더 나은 내일을 향한 도전”
          </p>
          <p className="mt-6 text-stone-400 text-sm leading-relaxed max-w-2xl mx-auto">
            랑구대학교 내에서 배울 수 있는 모든 과목은 모든 사람이 더 나은 내일을 향해 나아갈 수 있도록 개설한 과목이며,
            교내에서도 학생들에 대한 지원을 아끼지 않습니다.
          </p>
        </div>
      </section>

      {/* ── 빠른 정보 ─────────────────────────────────────────── */}
      <section id="about" className="border-b border-amber-700/10 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs tracking-[0.4em] text-amber-300/70 mb-2">AT A GLANCE</div>
            <h2 className="text-3xl text-stone-100" style={{ fontFamily: "'Gowun Batang', serif" }}>
              한눈에 보기
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {QUICK_STATS.map((s) => (
              <div
                key={s.label}
                className="border border-amber-700/20 bg-[#0a1828]/60 px-6 py-8 text-center hover:border-amber-500/40 transition-colors"
              >
                <div className="text-xs tracking-[0.3em] text-amber-300/70 mb-3">{s.label}</div>
                <div
                  className="text-4xl font-bold text-amber-100 mb-1"
                  style={{ fontFamily: "'Gowun Batang', serif" }}
                >
                  {s.value}
                </div>
                <div className="text-xs text-stone-400">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 단과대학 ──────────────────────────────────────────── */}
      <section id="colleges" className="border-b border-amber-700/10 py-24 bg-[#040b14]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-xs tracking-[0.4em] text-amber-300/70 mb-2">COLLEGES</div>
            <h2 className="text-4xl text-stone-100 mb-4" style={{ fontFamily: "'Gowun Batang', serif" }}>
              단과대학
            </h2>
            <p className="text-stone-400 text-sm max-w-xl mx-auto leading-relaxed">
              3개의 단과대학, 7개의 학과를 운영합니다. 각 학과는 학장 교수님의 책임 하에 학생 개인 면담제로 운영됩니다.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {COLLEGES.map((c) => (
              <article
                key={c.key}
                className="group flex flex-col border border-amber-700/20 bg-gradient-to-b from-[#0a1828]/80 to-[#040b14]/80 overflow-hidden hover:border-amber-500/40 transition-all"
              >
                {/* 헤더 — 단과대학 색상 그라디언트 */}
                <div
                  className={`bg-gradient-to-br ${c.accent} px-6 py-8 border-b border-amber-700/30 relative overflow-hidden`}
                >
                  <div
                    className="absolute -right-6 -bottom-6 text-9xl opacity-10 font-bold text-amber-200"
                    style={{ fontFamily: "'Gowun Batang', serif" }}
                  >
                    {c.hanja[0]}
                  </div>
                  <div className="relative">
                    <div className="text-[10px] tracking-[0.3em] text-amber-200/70 mb-2">
                      {c.en.toUpperCase()}
                    </div>
                    <h3
                      className="text-2xl text-stone-100 mb-1"
                      style={{ fontFamily: "'Gowun Batang', serif" }}
                    >
                      {c.name}
                    </h3>
                    <div className="text-xs text-amber-200/70">{c.hanja}</div>
                  </div>
                </div>

                {/* 학장 정보 */}
                <div className="px-6 py-4 border-b border-amber-700/15 bg-black/20">
                  <div className="text-[10px] tracking-[0.25em] text-amber-300/60 mb-1">학장 · DEAN</div>
                  <div className="flex items-baseline gap-2">
                    <div
                      className="text-lg text-amber-100"
                      style={{ fontFamily: "'Gowun Batang', serif" }}
                    >
                      {c.dean}
                    </div>
                    <div className="text-[11px] text-stone-400">{c.deanRole}</div>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">설립 {c.founded}</div>
                </div>

                {/* 학과 목록 */}
                <div className="flex-1 px-6 py-5">
                  <div className="text-[10px] tracking-[0.25em] text-amber-300/60 mb-3">
                    학과 · DEPARTMENTS
                  </div>
                  <ul className="space-y-3">
                    {c.departments.map((d) => (
                      <li
                        key={d.name}
                        className="border-l-2 border-amber-500/30 pl-3 hover:border-amber-400 transition-colors"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div
                            className="text-sm text-stone-100"
                            style={{ fontFamily: "'Gowun Batang', serif" }}
                          >
                            {d.name}
                          </div>
                          <div className="text-[10px] text-stone-500 tabular-nums">
                            {d.founded}
                          </div>
                        </div>
                        <div className="text-[11px] text-amber-200/60 italic mt-0.5">
                          “{d.motto}”
                        </div>
                        <div className="text-[10px] text-stone-500 mt-0.5">교수 {d.professor}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 연혁 ──────────────────────────────────────────────── */}
      <section id="history" className="border-b border-amber-700/10 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs tracking-[0.4em] text-amber-300/70 mb-2">HISTORY · 연혁</div>
            <h2 className="text-3xl text-stone-100" style={{ fontFamily: "'Gowun Batang', serif" }}>
              학교의 발자취
            </h2>
          </div>

          <ol className="relative border-l border-amber-700/30 ml-3 space-y-10">
            {HISTORY.map((h, idx) => (
              <li key={idx} className="pl-8">
                <div className="absolute -left-[7px] w-3 h-3 rounded-full bg-amber-500 ring-4 ring-[#0d2845]" />
                <div className="text-xs tracking-[0.2em] text-amber-300/80 mb-1 tabular-nums">
                  {h.date}
                </div>
                <div
                  className="text-xl text-stone-100 mb-1"
                  style={{ fontFamily: "'Gowun Batang', serif" }}
                >
                  {h.title}
                </div>
                <div className="text-sm text-stone-400 leading-relaxed">{h.body}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 임원 / 행정 ──────────────────────────────────────── */}
      <section className="border-b border-amber-700/10 py-24 bg-[#040b14]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs tracking-[0.4em] text-amber-300/70 mb-2">LEADERSHIP</div>
            <h2 className="text-3xl text-stone-100" style={{ fontFamily: "'Gowun Batang', serif" }}>
              임원
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                role: '이사장',
                en: 'Chairman of the Board',
                name: '정재원',
                meta: '랑구 그룹 창립자 · 초대 이사장',
              },
              {
                role: '총장 직무대행',
                en: 'Acting President',
                name: '강한울',
                meta: '교무행정처장',
              },
              {
                role: '이사회',
                en: 'Board of Directors',
                name: '정재원 · 강한울 · 정민석 · 정진규',
                meta: '랑구 멤버 4인',
              },
            ].map((p) => (
              <div
                key={p.role}
                className="border border-amber-700/20 px-6 py-6 bg-[#0a1828]/40"
              >
                <div className="text-[10px] tracking-[0.3em] text-amber-300/70 mb-2">
                  {p.en.toUpperCase()}
                </div>
                <div
                  className="text-xs text-amber-200/80 mb-1"
                  style={{ fontFamily: "'Gowun Batang', serif" }}
                >
                  {p.role}
                </div>
                <div
                  className="text-2xl text-stone-100 mb-2"
                  style={{ fontFamily: "'Gowun Batang', serif" }}
                >
                  {p.name}
                </div>
                <div className="text-[11px] text-stone-400 leading-relaxed">{p.meta}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 캠퍼스 ────────────────────────────────────────────── */}
      <section id="campus" className="border-b border-amber-700/10 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <div className="text-xs tracking-[0.4em] text-amber-300/70 mb-2">CAMPUS</div>
              <h2
                className="text-4xl text-stone-100 mb-6"
                style={{ fontFamily: "'Gowun Batang', serif" }}
              >
                중랑청년청 캠퍼스
              </h2>
              <p className="text-stone-400 text-sm leading-relaxed mb-8">
                사이버 대학을 명시하고 있으나, 중랑구 소재 중랑청년청을 캠퍼스로 삼고 있습니다.
                대부분의 강의와 활동은 디스코드 서버에서 진행되며, 오프라인 모임은 연 수회
                중랑청년청에서 개최됩니다.
              </p>
              <dl className="space-y-3 text-sm">
                <div className="flex">
                  <dt className="w-20 text-amber-300/70 text-xs tracking-[0.2em] pt-0.5">주소</dt>
                  <dd className="flex-1 text-stone-200">
                    서울특별시 중랑구 중랑역로 159
                    <span className="text-stone-500 ml-1">(중랑청년청)</span>
                  </dd>
                </div>
                <div className="flex">
                  <dt className="w-20 text-amber-300/70 text-xs tracking-[0.2em] pt-0.5">분류</dt>
                  <dd className="flex-1 text-stone-200">사립 · 다목적학교 · 사이버대학</dd>
                </div>
                <div className="flex">
                  <dt className="w-20 text-amber-300/70 text-xs tracking-[0.2em] pt-0.5">법인</dt>
                  <dd className="flex-1 text-stone-200">사립대학 랑구대학교</dd>
                </div>
                <div className="flex">
                  <dt className="w-20 text-amber-300/70 text-xs tracking-[0.2em] pt-0.5">국가</dt>
                  <dd className="flex-1 text-stone-200">대한민국</dd>
                </div>
              </dl>
            </div>

            {/* 캠퍼스 일러스트 — 격자 + 건물 실루엣 */}
            <div className="relative aspect-[4/3] border border-amber-700/20 bg-[#0a1828]/60 overflow-hidden">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(201,169,110,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(201,169,110,0.3) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full">
                {/* 건물 실루엣 */}
                <g fill="#c9a96e" opacity="0.6">
                  <rect x="60" y="160" width="80" height="100" />
                  <rect x="160" y="120" width="100" height="140" />
                  <rect x="280" y="170" width="70" height="90" />
                  {/* 창문 패턴 */}
                  <g fill="#0a2540" opacity="0.8">
                    {[170, 192, 214, 236].map((x) =>
                      [140, 160, 180, 200, 220, 240].map((y) => (
                        <rect key={`${x}-${y}`} x={x} y={y} width="8" height="10" />
                      ))
                    )}
                  </g>
                </g>
                {/* 깃대 */}
                <line x1="210" y1="120" x2="210" y2="80" stroke="#c9a96e" strokeWidth="1.5" />
                <path d="M210 80 L240 86 L210 92 Z" fill="#c9a96e" />
              </svg>
              <div className="absolute bottom-3 left-3 text-[10px] tracking-[0.2em] text-amber-300/60">
                JUNGNANG YOUTH CENTER
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 입학 안내 ────────────────────────────────────────── */}
      <section id="admissions" className="border-b border-amber-700/10 py-24 bg-[#040b14]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-xs tracking-[0.4em] text-amber-300/70 mb-4">ADMISSIONS · 입학</div>
          <h2
            className="text-4xl text-stone-100 mb-4"
            style={{ fontFamily: "'Gowun Batang', serif" }}
          >
            학사 제도
          </h2>
          <p className="text-stone-400 text-sm leading-relaxed max-w-2xl mx-auto mb-10">
            해당 학과의 담당 교수님과 면담 후 수업을 듣고, 모든 과정을 완료했다는 증명을
            받으면 학사가 발급됩니다. 다만 학사가 나오지 않고 수료로 끝나는 경우도 있으니
            성실하게 수업을 들으시기 바랍니다.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
            {[
              { step: '01', title: '학과 면담', body: '담당 교수님과 1:1 면담 신청' },
              { step: '02', title: '수업 이수', body: '디스코드 강의실에서 과정 수강' },
              { step: '03', title: '학사 / 수료', body: '교수 인증 후 학위 또는 수료증 수여' },
            ].map((s) => (
              <div key={s.step} className="border border-amber-700/20 p-5 bg-[#0a1828]/40 text-left">
                <div className="text-3xl font-bold text-amber-500/70 mb-2 tabular-nums" style={{ fontFamily: "'Gowun Batang', serif" }}>
                  {s.step}
                </div>
                <div
                  className="text-base text-stone-100 mb-1"
                  style={{ fontFamily: "'Gowun Batang', serif" }}
                >
                  {s.title}
                </div>
                <div className="text-xs text-stone-400">{s.body}</div>
              </div>
            ))}
          </div>

          <div className="inline-flex flex-col sm:flex-row gap-3">
            <a
              href="https://irang.wiki/wiki/%EB%9E%91%EA%B5%AC%EB%8C%80%ED%95%99%EA%B5%90"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-[#0a2540] font-semibold rounded-sm transition-colors"
            >
              위키에서 자세히 보기
            </a>
            <a
              href="https://irang.wiki/wiki/%EB%9E%91%EA%B5%AC%EB%8C%80%ED%95%99%EA%B5%90/%ED%95%99%EB%B6%80"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-amber-500/50 text-amber-100 hover:bg-amber-500/10 rounded-sm transition-colors"
            >
              학부 정보 ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── 푸터 ──────────────────────────────────────────────── */}
      <footer className="bg-[#020812] border-t border-amber-700/20">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <SchoolCrest size={56} />
                <div>
                  <div
                    className="text-lg text-amber-100"
                    style={{ fontFamily: "'Gowun Batang', serif" }}
                  >
                    랑구대학교
                  </div>
                  <div className="text-[10px] tracking-[0.3em] text-amber-300/70">
                    RANG-GU UNIVERSITY
                  </div>
                </div>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed max-w-md">
                © 2023— 사립대학 랑구대학교. 본 페이지는 랑구팸의 가상 대학 프로젝트로, 실제
                인가된 교육기관이 아닙니다.
              </p>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.3em] text-amber-300/70 mb-3">
                바로가기
              </div>
              <ul className="space-y-2 text-sm text-stone-300">
                <li><a href="#about" className="hover:text-amber-200 transition-colors">학교 소개</a></li>
                <li><a href="#colleges" className="hover:text-amber-200 transition-colors">단과대학</a></li>
                <li><a href="#history" className="hover:text-amber-200 transition-colors">연혁</a></li>
                <li><a href="#campus" className="hover:text-amber-200 transition-colors">캠퍼스</a></li>
              </ul>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.3em] text-amber-300/70 mb-3">관련 사이트</div>
              <ul className="space-y-2 text-sm text-stone-300">
                <li>
                  <Link href="/" className="hover:text-amber-200 transition-colors">
                    Rangu.fam
                  </Link>
                </li>
                <li>
                  <a
                    href="https://irang.wiki"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-200 transition-colors"
                  >
                    이랑위키 ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://irang.wiki/wiki/%EB%9E%91%EA%B5%AC%EB%8C%80%ED%95%99%EA%B5%90/%ED%95%99%EB%B6%80"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-200 transition-colors"
                  >
                    학부 정보 ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-amber-700/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-stone-500 tracking-[0.15em]">
            <div>VERITAS · LIBERTAS · PAX</div>
            <div>SEOUL · 2023</div>
          </div>
        </div>
      </footer>
    </main>
  )
}
