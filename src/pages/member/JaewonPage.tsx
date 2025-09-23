import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Code2, 
  Plane, 
  Brain,
  Star,
  Mail,
  // Phone,
  Linkedin,
  ArrowLeft,
  Download,
  Github,
  Database,
  Cpu,
  Sparkles,
  GraduationCap,
  Camera,
  Palette,
  Zap,
  Rocket,
  Monitor,
  Server,
  Globe,
  Instagram,
  // ExternalLink,
  // BookOpen,
  // Trophy,
  // Target,
  Users
} from 'lucide-react';

const JaewonPage: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 개발 프로젝트 데이터
  const developmentProjects = [
    {
      title: "AI-Powered Flight Analytics",
      subtitle: "항공 데이터 분석 시스템",
      tech: ["Python", "TensorFlow", "React", "FastAPI"],
      category: "AI/BigData",
      status: "In Progress",
      description: "항공기 운항 데이터를 AI로 분석하여 효율적인 경로와 연료 소비를 최적화하는 시스템",
      highlights: ["실시간 데이터 처리", "ML 예측 모델", "대시보드 시각화"]
    },
    {
      title: "Fashion Model Portfolio Platform",
      subtitle: "모델 포트폴리오 관리 웹앱",
      tech: ["Next.js", "TypeScript", "Prisma", "PostgreSQL"],
      category: "FullStack",
      status: "Completed",
      description: "패션모델들의 포트폴리오를 관리하고 에이전시와 연결해주는 플랫폼",
      highlights: ["반응형 갤러리", "실시간 채팅", "스케줄 관리"]
    },
    {
      title: "BigData Student Management",
      subtitle: "학과 학생 관리 시스템",
      tech: ["Java", "Spring Boot", "MySQL", "Vue.js"],
      category: "Backend",
      status: "Completed",
      description: "빅데이터과 학생들의 성적, 프로젝트, 진로를 체계적으로 관리하는 시스템",
      highlights: ["성적 분석", "진로 추천", "프로젝트 매칭"]
    }
  ];

  // 기술 스택 (실제 사용 기술들)
  const techStacks = {
    frontend: [
      { name: "React/Next.js", level: 95, icon: "⚛️" },
      { name: "TypeScript", level: 90, icon: "📘" },
      { name: "JavaScript", level: 95, icon: "🟨" },
      { name: "HTML5/CSS3", level: 92, icon: "🎨" },
      { name: "Angular", level: 80, icon: "🔺" },
      { name: "Vue.js", level: 78, icon: "💚" }
    ],
    backend: [
      { name: "Node.js", level: 90, icon: "🟢" },
      { name: "Python", level: 95, icon: "🐍" },
      { name: "Java/Spring", level: 85, icon: "☕" },
      { name: "PHP", level: 75, icon: "🐘" },
      { name: "C/C++", level: 80, icon: "⚙️" },
      { name: "Swift", level: 70, icon: "🧡" }
    ],
    tools: [
      { name: "Docker", level: 88, icon: "🐳" },
      { name: "Kubernetes", level: 75, icon: "⚓" },
      { name: "Git/GitHub", level: 95, icon: "🐙" },
      { name: "AWS", level: 82, icon: "☁️" },
      { name: "MongoDB", level: 85, icon: "🍃" },
      { name: "PostgreSQL", level: 88, icon: "🐘" }
    ],
    aiData: [
      { name: "TensorFlow", level: 85, icon: "🧠" },
      { name: "PyTorch", level: 80, icon: "🔥" },
      { name: "Django", level: 85, icon: "🎯" },
      { name: "FastAPI", level: 88, icon: "⚡" },
      { name: "Pandas/NumPy", level: 90, icon: "📊" },
      { name: "Jupyter", level: 92, icon: "📓" }
    ]
  };

  // 패션모델 활동
  const modelingExperience = [
    {
      event: "Seoul Fashion Week 2024",
      brand: "Local Designer Showcase",
      date: "2024.03",
      type: "Runway",
      description: "신진 디자이너 컬렉션의 메인 모델로 참여"
    },
    {
      event: "Tech Fashion Photoshoot",
      brand: "Digital Magazine",
      date: "2024.01",
      type: "Editorial",
      description: "테크놀로지와 패션의 만남을 테마로 한 화보 촬영"
    },
    {
      event: "University Fashion Show",
      brand: "Kyungbok University",
      date: "2023.11",
      type: "Campus",
      description: "대학 패션쇼 메인 모델 및 기획 참여"
    }
  ];

  const getProjectColor = (category: string) => {
    switch(category) {
      case 'AI/BigData': return 'from-purple-500 to-pink-500';
      case 'FullStack': return 'from-blue-500 to-cyan-500';
      case 'Backend': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black text-white relative overflow-hidden">
      {/* 테크노 배경 효과 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-black"></div>
        {/* 코딩 매트릭스 효과 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300ff00' fill-opacity='0.3'%3E%3Ctext x='5' y='15' font-family='monospace' font-size='12'%3E01%3C/text%3E%3Ctext x='20' y='30' font-family='monospace' font-size='10'%3E1%3C/text%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
      </div>

      {/* 플로팅 코드 요소들 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        ></div>
        <div 
          className="absolute bottom-32 left-10 w-80 h-80 bg-gradient-to-br from-cyan-500/5 to-pink-500/5 rounded-full blur-3xl"
          style={{ transform: `translateY(${-scrollY * 0.15}px)` }}
        ></div>
        {/* 플로팅 아이콘들 */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute text-blue-400/20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              fontSize: '24px'
            }}
          >
            {['⚛️', '🚀', '💻', '🤖', '✈️', '📱', '🎨', '🔥'][i]}
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-16">
          <button
            onClick={() => navigate('/whose')}
            className="group flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all duration-500 border border-white/10 backdrop-blur-lg"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="font-medium">Back to Team</span>
          </button>

          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-2xl transition-all duration-300 font-medium shadow-lg">
              <Download size={18} />
              <span>Download Resume</span>
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-300 border border-white/20 backdrop-blur-lg">
              <Github size={18} />
              <span>GitHub</span>
            </button>
          </div>
        </div>

        {/* 히어로 섹션 */}
        <div className={`mb-24 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* 왼쪽 - 메인 정보 */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl">
                    <Code2 size={40} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-7xl font-bold tracking-tight">
                      <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        Jaewon
                      </span>
                    </h1>
                    <p className="text-3xl text-gray-300 font-light">Full-Stack Developer & AI Engineer</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30">
                    <GraduationCap size={16} className="text-green-400" />
                    <span className="text-green-300 font-medium">경복대학교 빅데이터과 2학년</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30">
                    <Plane size={16} className="text-blue-400" />
                    <span className="text-blue-300 font-medium">항공소프트웨어 엔지니어 지망</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                    <Camera size={16} className="text-purple-400" />
                    <span className="text-purple-300 font-medium">패션모델</span>
                  </div>
                </div>
                
                                 <p className="text-xl text-gray-300 leading-relaxed">
                   <span className="text-blue-400 font-semibold">25개 이상의 기술 스택</span>을 다루는 풀스택 개발자로, 
                   <span className="text-purple-400 font-semibold"> 항공 소프트웨어</span> 분야의 혁신을 꿈꾸며 
                   패션모델로도 활동하는 <span className="text-cyan-400 font-semibold">다재다능한 테크 크리에이터</span>입니다.
                 </p>
              </div>

              {/* 연락처 */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                  <Mail size={16} className="text-blue-400" />
                  <span className="text-gray-300">jaewon@jungtrio.com</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                  <Github size={16} className="text-gray-400" />
                  <span className="text-gray-300">@jaewon-dev</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                  <Instagram size={16} className="text-pink-400" />
                  <span className="text-gray-300">@jaewon_model</span>
                </div>
              </div>
            </div>

            {/* 오른쪽 - 실시간 통계 */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-3xl p-8 border border-white/10 backdrop-blur-lg">
                <h3 className="text-2xl font-bold mb-6 text-center">Current Status</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">2024</div>
                    <div className="text-sm text-gray-400">Current Year</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">2nd</div>
                    <div className="text-sm text-gray-400">University Year</div>
                  </div>
                                     <div className="text-center">
                     <div className="text-3xl font-bold text-purple-400 mb-2">25+</div>
                     <div className="text-sm text-gray-400">Tech Stacks</div>
                   </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-pink-400 mb-2">8+</div>
                    <div className="text-sm text-gray-400">Fashion Shows</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/10 rounded-2xl p-6 border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Brain size={24} className="text-blue-400" />
                    <span className="font-semibold">AI Development</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">Active</div>
                  <div className="text-sm text-gray-400">Machine Learning Projects</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Camera size={24} className="text-purple-400" />
                    <span className="font-semibold">Modeling Career</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">Active</div>
                  <div className="text-sm text-gray-400">Fashion & Editorial</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 네비게이션 탭 */}
        <div className="flex justify-center mb-16">
          <div className="flex bg-white/5 backdrop-blur-lg rounded-3xl p-2 border border-white/10">
            {[
              { id: 'overview', label: 'Overview', icon: Star },
              { id: 'development', label: 'Development', icon: Code2 },
              { id: 'modeling', label: 'Modeling', icon: Camera },
              { id: 'contact', label: 'Contact', icon: Mail }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-medium transition-all duration-300 ${
                  activeSection === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-xl'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 컨텐츠 섹션 */}
        <div className="mb-20">
          {activeSection === 'overview' && (
            <div className="space-y-16">
              {/* 전문 분야 개요 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-3xl p-8 border border-blue-500/20 backdrop-blur-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                      <Code2 size={32} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold">Full-Stack Development</h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    프론트엔드부터 백엔드, AI까지 전 영역을 아우르는 풀스택 개발 역량으로 혁신적인 솔루션을 구현합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['React', 'Node.js', 'Python', 'AI/ML'].map((tech, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl p-8 border border-purple-500/20 backdrop-blur-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                      <Plane size={32} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold">Aviation Software</h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    항공 산업의 디지털 혁신을 이끌 항공소프트웨어 엔지니어가 되어 안전하고 효율적인 항공 시스템을 개발하고자 합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Flight Systems', 'Safety Critical', 'Real-time', 'Embedded'].map((tech, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-3xl p-8 border border-pink-500/20 backdrop-blur-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center">
                      <Camera size={32} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold">Fashion Modeling</h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    테크놀로지와 패션의 경계를 넘나들며, 창의적인 시각과 표현력으로 다양한 브랜드와 컬렉션에 참여하고 있습니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Runway', 'Editorial', 'Commercial', 'Creative'].map((type, i) => (
                      <span key={i} className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-lg text-sm">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

                             {/* 기술 스택 */}
               <div className="bg-gradient-to-r from-slate-800/50 to-gray-800/30 rounded-3xl p-12 border border-white/10 backdrop-blur-lg">
                 <h3 className="text-3xl font-bold text-center mb-12">Tech Stack Mastery</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   <div>
                     <h4 className="text-xl font-semibold mb-6 flex items-center gap-2">
                       <Monitor size={24} className="text-blue-400" />
                       Frontend
                     </h4>
                     <div className="space-y-4">
                       {techStacks.frontend.map((tech, index) => (
                         <div key={index} className="space-y-2">
                           <div className="flex justify-between items-center">
                             <span className="flex items-center gap-2">
                               <span>{tech.icon}</span>
                               <span className="font-medium text-sm">{tech.name}</span>
                             </span>
                             <span className="text-blue-400 font-bold text-sm">{tech.level}%</span>
                           </div>
                           <div className="w-full bg-gray-700 rounded-full h-2">
                             <div 
                               className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-1000"
                               style={{ width: `${tech.level}%` }}
                             ></div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
 
                   <div>
                     <h4 className="text-xl font-semibold mb-6 flex items-center gap-2">
                       <Server size={24} className="text-green-400" />
                       Backend
                     </h4>
                     <div className="space-y-4">
                       {techStacks.backend.map((tech, index) => (
                         <div key={index} className="space-y-2">
                           <div className="flex justify-between items-center">
                             <span className="flex items-center gap-2">
                               <span>{tech.icon}</span>
                               <span className="font-medium text-sm">{tech.name}</span>
                             </span>
                             <span className="text-green-400 font-bold text-sm">{tech.level}%</span>
                           </div>
                           <div className="w-full bg-gray-700 rounded-full h-2">
                             <div 
                               className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-1000"
                               style={{ width: `${tech.level}%` }}
                             ></div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>

                   <div>
                     <h4 className="text-xl font-semibold mb-6 flex items-center gap-2">
                       <Database size={24} className="text-orange-400" />
                       DevOps & DB
                     </h4>
                     <div className="space-y-4">
                       {techStacks.tools.map((tech, index) => (
                         <div key={index} className="space-y-2">
                           <div className="flex justify-between items-center">
                             <span className="flex items-center gap-2">
                               <span>{tech.icon}</span>
                               <span className="font-medium text-sm">{tech.name}</span>
                             </span>
                             <span className="text-orange-400 font-bold text-sm">{tech.level}%</span>
                           </div>
                           <div className="w-full bg-gray-700 rounded-full h-2">
                             <div 
                               className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-1000"
                               style={{ width: `${tech.level}%` }}
                             ></div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
 
                   <div>
                     <h4 className="text-xl font-semibold mb-6 flex items-center gap-2">
                       <Brain size={24} className="text-purple-400" />
                       AI & Data
                     </h4>
                     <div className="space-y-4">
                       {techStacks.aiData.map((tech, index) => (
                         <div key={index} className="space-y-2">
                           <div className="flex justify-between items-center">
                             <span className="flex items-center gap-2">
                               <span>{tech.icon}</span>
                               <span className="font-medium text-sm">{tech.name}</span>
                             </span>
                             <span className="text-purple-400 font-bold text-sm">{tech.level}%</span>
                           </div>
                           <div className="w-full bg-gray-700 rounded-full h-2">
                             <div 
                               className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000"
                               style={{ width: `${tech.level}%` }}
                             ></div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {activeSection === 'development' && (
            <div className="space-y-16">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Development Portfolio</h2>
                <p className="text-xl text-gray-400">AI와 풀스택 기술로 구현하는 혁신적인 솔루션들</p>
              </div>

              <div className="space-y-8">
                {developmentProjects.map((project, index) => (
                  <div key={index} className="group">
                    <div className="bg-gradient-to-r from-white/5 to-white/2 rounded-3xl p-8 border border-white/10 backdrop-blur-lg hover:border-blue-500/30 transition-all duration-500">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-1">
                          <div className={`w-16 h-16 bg-gradient-to-br ${getProjectColor(project.category)} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            {project.category === 'AI/BigData' && <Brain size={32} className="text-white" />}
                            {project.category === 'FullStack' && <Globe size={32} className="text-white" />}
                            {project.category === 'Backend' && <Server size={32} className="text-white" />}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 bg-gradient-to-r ${getProjectColor(project.category)} bg-opacity-20 rounded-lg text-sm font-medium`}>
                              {project.category}
                            </span>
                          </div>
                          <div className={`text-sm font-medium ${project.status === 'Completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {project.status}
                          </div>
                        </div>

                        <div className="lg:col-span-3">
                          <h3 className="text-2xl font-bold mb-2">{project.title}</h3>
                          <p className="text-lg text-blue-400 mb-4">{project.subtitle}</p>
                          <p className="text-gray-300 leading-relaxed mb-6">{project.description}</p>
                          
                          <div className="space-y-4">
                            <div>
                              <h5 className="font-semibold mb-2">Tech Stack</h5>
                              <div className="flex flex-wrap gap-2">
                                {project.tech.map((tech, techIndex) => (
                                  <span key={techIndex} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm border border-blue-500/30">
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-semibold mb-2">Key Features</h5>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {project.highlights.map((highlight, hIndex) => (
                                  <div key={hIndex} className="flex items-center gap-2">
                                    <Zap size={16} className="text-yellow-400" />
                                    <span className="text-gray-300 text-sm">{highlight}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'modeling' && (
            <div className="space-y-16">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Fashion Modeling Career</h2>
                <p className="text-xl text-gray-400">테크놀로지와 패션을 넘나드는 크리에이티브 여정</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modelingExperience.map((exp, index) => (
                  <div key={index} className="group">
                    <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-3xl p-6 border border-pink-500/20 backdrop-blur-lg hover:border-pink-500/40 transition-all duration-500 h-full">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className={`w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center`}>
                            <Camera size={24} className="text-white" />
                          </div>
                          <span className="text-sm text-gray-400">{exp.date}</span>
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-bold mb-2">{exp.event}</h3>
                          <p className="text-pink-400 font-medium mb-2">{exp.brand}</p>
                          <div className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm mb-3">
                            {exp.type}
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed">{exp.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 모델링 철학 */}
              <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 rounded-3xl p-12 border border-white/10 backdrop-blur-lg">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold mb-4">Creative Philosophy</h3>
                  <div className="w-24 h-1 bg-gradient-to-r from-pink-400 to-purple-400 mx-auto rounded-full"></div>
                </div>
                
                <div className="max-w-4xl mx-auto">
                  <blockquote className="text-2xl font-light italic text-center text-gray-300 mb-8 leading-relaxed">
                    "기술과 예술의 경계에서 새로운 표현을 찾아가며,<br />
                    코드와 카메라 앞에서 모두 자신만의 이야기를 만들어갑니다."
                  </blockquote>
                  <div className="text-center text-pink-400 font-medium">— Jung Jaewon</div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'contact' && (
            <div className="space-y-16">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Let's Create Together</h2>
                <p className="text-xl text-gray-400">개발 프로젝트부터 크리에이티브 콜라보레이션까지</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <h3 className="text-2xl font-bold mb-6">Get In Touch</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                      <Mail className="text-blue-400" size={24} />
                      <div>
                        <div className="font-medium">Email</div>
                        <div className="text-gray-400">jaewon.jung@jungtrio.com</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                      <Github className="text-gray-400" size={24} />
                      <div>
                        <div className="font-medium">GitHub</div>
                        <div className="text-gray-400">github.com/jaewon-dev</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                      <Instagram className="text-pink-400" size={24} />
                      <div>
                        <div className="font-medium">Instagram</div>
                        <div className="text-gray-400">@jaewon_model</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-bold mb-6">Collaboration Areas</h3>
                  
                  <div className="space-y-4">
                    <div className="p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                      <div className="flex items-center gap-3 mb-3">
                        <Code2 className="text-blue-400" size={24} />
                        <h4 className="text-lg font-semibold">Software Development</h4>
                      </div>
                      <p className="text-gray-300">AI/ML 솔루션, 풀스택 웹앱, 항공 소프트웨어 개발</p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                      <div className="flex items-center gap-3 mb-3">
                        <Camera className="text-purple-400" size={24} />
                        <h4 className="text-lg font-semibold">Fashion & Creative</h4>
                      </div>
                      <p className="text-gray-300">패션 촬영, 브랜드 모델링, 크리에이티브 프로젝트</p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="text-green-400" size={24} />
                        <h4 className="text-lg font-semibold">Tech Mentoring</h4>
                      </div>
                      <p className="text-gray-300">대학생 개발자 멘토링, 기술 스택 상담</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JaewonPage; 
