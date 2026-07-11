// =============================================================================
// app/recommendation/App.tsx
// =============================================================================
// หน้าหลักของ Frontend ผู้ใช้ (Faith Nakonpathom Recommendation App)
// ทำหน้าที่เป็น State & Flow Coordinator จัดการ State Flow ทั้งหมด
//
// State Machine (step):
//   selection → register / login → results → review / profile / navigation_history
//
// Sub-components แยกอิสระ:
//   - DivineBackground   : พื้นหลัง Animated background (blobs, particles)
//   - LandingView        : หน้า Landing Page ต้อนรับและแนะนำระบบ
//   - RecommendationList : แสดงตารางสถานที่แนะนำแยกตามหมวดความเชื่อ
//   - RatingModal        : หน้าต่าง Modal สำหรับให้คะแนนหลังกลับจาก Google Maps
//   - PlaceDetailModal   : หน้าต่างรายละเอียดสถานที่และปุ่มเปิด Google Maps
//   - AuthForm           : แบบฟอร์มเข้าสู่ระบบและลงทะเบียน
//   - UserMenu           : เมนูลัดจัดการโปรไฟล์, ดูประวัติ, ออกจากระบบ
//   - ResultsNavBar      : เมนูนำทางด้านบนสำหรับหน้าผลลัพธ์
//   - ResultsHeroBanner  : ส่วน Hero ภาพขนาดใหญ่และข้อความบนสุดของหน้าผลลัพธ์
//   - ResultsFooter      : ส่วนท้าย (Footer) หน้าผลลัพธ์
// =============================================================================

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, resolveImageUrl } from '@/lib/apiClient';
import { clearAuthSession, getAuthSession, setAuthSession } from '@/lib/auth';
import loveBg from './assets/love_bg.png';
import moneyBg from './assets/money_bg.png';
import workBg from './assets/work_bg.png';
import AuthForm from './components/AuthForm';
import DivineBackground from './components/DivineBackground';
import LandingView from './components/LandingView';
import NavigationHistory from './components/NavigationHistory';
import PlaceDetailModal from './components/PlaceDetailModal';
import RatingHistory from './components/RatingHistory';
import RatingModal from './components/RatingModal';
import RecommendationList, { Recommendation } from './components/RecommendationList';
import UserMenu from './components/UserMenu';
import UserProfile from './components/UserProfile';

type Step = 'selection' | 'register' | 'login' | 'results' | 'review' | 'profile' | 'navigation_history';

// =============================================================================
// Sub-Component: ResultsNavBar
// =============================================================================

interface ResultsNavBarProps {
  userName: string;
  isAdmin: boolean;
  onNavigateAdmin: () => void;
  onStepChange: (step: Step) => void;
  onLogout: () => void;
}

function ResultsNavBar({ userName, isAdmin, onNavigateAdmin, onStepChange, onLogout }: ResultsNavBarProps) {
  return (
    <nav className="flex justify-between items-center px-6 md:px-12 py-6 absolute w-full z-50">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onStepChange('selection')}>
        <motion.div
          whileHover={{ rotate: 180 }}
          className="p-2 bg-faith-gold rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.4)]"
        >
          <Compass className="text-[#1A0404]" size={20} />
        </motion.div>
        <div className="flex flex-col">
          <span className="text-xl font-black gold-gradient-text tracking-tighter uppercase leading-none">
            Faith Nakonpathom
          </span>
          <span className="text-[8px] text-gray-400 tracking-widest uppercase">ผู้นำทางจิตวิญญาณ</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <UserMenu
          userName={userName}
          isAdmin={isAdmin}
          onNavigateAdmin={onNavigateAdmin}
          onViewHistory={() => onStepChange('review')}
          onViewNavigationHistory={() => onStepChange('navigation_history')}
          onViewProfile={() => onStepChange('profile')}
          onLogout={onLogout}
        />
      </div>
    </nav>
  );
}

// =============================================================================
// Sub-Component: ResultsHeroBanner
// =============================================================================

interface ResultsHeroBannerProps {
  bgUrl: string;
}

function ResultsHeroBanner({ bgUrl }: ResultsHeroBannerProps) {
  return (
    <header className="w-full h-[45vh] md:h-[60vh] relative flex flex-col items-center justify-center overflow-hidden mb-10 md:mb-16">
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1A0404]/80 via-[#1A0404]/60 to-[#1A0404]" />

      <div className="relative z-10 text-center px-4 w-full flex flex-col items-center justify-center flex-1 pt-12">
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl sm:text-5xl md:text-8xl font-black mb-0 gold-gradient-text tracking-normal drop-shadow-2xl pb-6 leading-normal overflow-visible"
        >
          สถานที่สายมูในนครปฐม
        </motion.h2>
      </div>
    </header>
  );
}

// =============================================================================
// Sub-Component: ResultsFooter
// =============================================================================

function ResultsFooter() {
  return (
    <footer className="w-full bg-black/40 pt-6 pb-3 border-t border-white/10 mt-auto backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between mb-3 gap-4">
        <div className="max-w-sm">
          <div className="flex items-center gap-3 mb-2 opacity-60">
            <Compass size={32} className="text-faith-gold" />
            <span className="text-xl font-black tracking-widest text-white">Faith Nakonpathom</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed max-w-xs font-light">
            ค้นพบพลังแห่งจิตวิญญาณแห่งนครปฐม นำความสงบสุขและความเป็นสิริมงคลมาสู่ชีวิตผ่านการแนะนำสถานที่ศักดิ์สิทธิ์
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 border-t border-white/10 pt-3 flex flex-col items-center">
        <span className="text-[10px] text-gray-600 tracking-widest uppercase">
          © 2026 Nakornpathom Faith Experience
        </span>
      </div>
    </footer>
  );
}

// =============================================================================
// Main Component (Coordinator)
// =============================================================================

export default function App() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('selection');

  // Auth & User Session States
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isAdminSession, setIsAdminSession] = useState(false);

  // Recommendations & View States
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentBg] = useState(2);
  const [navHistoryRefreshCounter, setNavHistoryRefreshCounter] = useState(0);
  const backgrounds = [workBg, moneyBg, loveBg];

  // Modals & Map Return States
  const [selectedPlace, setSelectedPlace] = useState<Recommendation | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
  const [ratingTargetPlace, setRatingTargetPlace] = useState<Recommendation | null>(null);
  const [awaitingReturn, setAwaitingReturn] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });

  // Restore session or localStorage login on mount
  useEffect(() => {
    const savedId = localStorage.getItem('faith_userId');
    const savedName = localStorage.getItem('faith_userName');
    const session = getAuthSession();
    setIsAdminSession(session?.role === 'admin');

    if (session?.user_id && session?.user_name) {
      const sessionId = String(session.user_id);
      setUserId(sessionId);
      setUserName(session.user_name);
      setFormData((prev) => ({ ...prev, name: session.user_name }));

      if (savedId && savedName) {
        setRememberMe(true);
      }
      void fetchRecommendations(sessionId);
      return;
    }

    if (savedId && savedName) {
      setUserId(savedId);
      setUserName(savedName);
      setFormData((prev) => ({ ...prev, name: savedName }));
      setRememberMe(true);
      void fetchRecommendations(savedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect visibility change when user returns to tab after opening Google Maps
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && awaitingReturn) {
        setAwaitingReturn(false);
        setShowRatingModal(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [awaitingReturn]);

  const fetchRecommendations = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const apiRecommendations = (await apiGet(`/recommend/${id}`)) as {
        recommendations?: Recommendation[];
        is_new_user?: boolean;
        error?: string;
      };

      if (apiRecommendations?.error) {
        throw new Error(apiRecommendations.error);
      }

      const recs = Array.isArray(apiRecommendations?.recommendations)
        ? apiRecommendations.recommendations.map((item) => ({
          ...item,
          image: resolveImageUrl(item.image),
        }))
        : [];

      setBrokenImageIds(new Set());

      if (recs.length === 0) {
        setError('ไม่พบข้อมูลคำแนะนำจากระบบ');
      }

      setIsNewUser(Boolean(apiRecommendations?.is_new_user));
      setRecommendations(recs);
      setStep('results');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[fetchRecommendations] Error:', err);
      setError(`ไม่สามารถโหลดข้อมูลคำแนะนำได้ (${msg})`);
      setStep('results');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const nameVal = formData.name.trim();
      if (!nameVal) {
        setError('กรุณากรอกชื่อผู้ใช้');
        return;
      }

      const checkResult = (await apiGet(`/api/users/check-username/${encodeURIComponent(nameVal)}`)) as {
        exists: boolean;
      };
      if (checkResult.exists) {
        setError('ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น');
        return;
      }

      const created = (await apiPost('/api/users', {
        user_name: nameVal,
        password: formData.password,
        role: 'user',
      })) as { user_id: number; user_name: string };

      const uId = String(created.user_id);
      setUserId(uId);
      setUserName(created.user_name);
      setAuthSession({
        user_id: created.user_id,
        user_name: created.user_name,
        role: 'user',
      });
      setIsAdminSession(false);
      if (rememberMe) {
        localStorage.setItem('faith_userId', uId);
        localStorage.setItem('faith_userName', created.user_name);
      }
      void fetchRecommendations(uId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`เกิดข้อผิดพลาดในการลงทะเบียน (${msg})`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const inputName = formData.name.trim();
      if (!inputName) {
        setError('กรุณากรอกชื่อผู้ใช้');
        return;
      }

      const result = (await apiPost('/api/users/login', {
        user_name: inputName,
        password: formData.password,
      })) as { user_id: number; user_name: string; role: string };

      const uId = String(result.user_id);
      setUserId(uId);
      setUserName(result.user_name);
      setAuthSession({
        user_id: result.user_id,
        user_name: result.user_name,
        role: result.role || 'user',
      });
      setIsAdminSession(result.role === 'admin');
      if (rememberMe) {
        localStorage.setItem('faith_userId', uId);
        localStorage.setItem('faith_userName', result.user_name);
      } else {
        localStorage.removeItem('faith_userId');
        localStorage.removeItem('faith_userName');
      }
      void fetchRecommendations(uId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`เข้าสู่ระบบไม่สำเร็จ (${msg})`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('faith_userId');
    localStorage.removeItem('faith_userName');
    clearAuthSession();
    setIsAdminSession(false);
    setUserId('');
    setUserName('');
    setIsNewUser(false);
    setRecommendations([]);
    setStep('selection');
  };

  const handleOpenGoogleMaps = (place: Recommendation) => {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
    setRatingTargetPlace(place);
    setAwaitingReturn(true);

    apiPost('/api/activity-logs', {
      user_id: Number(userId),
      attraction_id: Number(place.id),
      action_type: 'view_map',
    }).catch(console.error);

    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`min-h-screen flex flex-col text-white selection:bg-faith-gold/30 font-outfit overflow-x-hidden ${step === 'register' || step === 'login' ? 'overflow-y-hidden' : ''
        }`}
    >
      <DivineBackground currentBgIndex={currentBg} backgrounds={backgrounds} />

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {step === 'selection' && (
            <LandingView onLoginClick={() => setStep('login')} onStartClick={() => setStep('register')} />
          )}

          {(step === 'register' || step === 'login') && (
            <AuthForm
              step={step as 'login' | 'register'}
              setStep={setStep as unknown as (step: 'login' | 'register' | 'selection') => void}
              formData={formData}
              setFormData={setFormData}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              error={error}
              loading={loading}
              handleRegister={handleRegister}
              handleLogin={handleLogin}
            />
          )}

          {step === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full relative z-10 font-outfit min-h-screen pb-0 flex flex-col"
            >
              <ResultsNavBar
                userName={userName}
                isAdmin={isAdminSession}
                onNavigateAdmin={() => navigate('/admin')}
                onStepChange={setStep}
                onLogout={handleLogout}
              />

              <ResultsHeroBanner bgUrl={backgrounds[currentBg]} />

              <main className="max-w-7xl mx-auto px-6 mb-10 flex-1 w-full relative z-20">
                <div className="flex flex-col mb-12 gap-6 w-full items-center">
                  <h3 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight flex flex-col md:flex-row gap-2 text-center md:text-left">
                    <span className="text-faith-gold">สถานที่</span> <span className="text-white">แนะนำสำหรับคุณ</span>
                  </h3>
                </div>

                <RecommendationList
                  recommendations={recommendations}
                  isNewUser={isNewUser}
                  error={error}
                  loading={loading}
                  brokenImageIds={brokenImageIds}
                  onImageError={(id) => {
                    setBrokenImageIds((prev) => {
                      const next = new Set(prev);
                      next.add(id);
                      return next;
                    });
                  }}
                  onSelectPlace={(place) => setSelectedPlace(place)}
                  onRetry={() => void fetchRecommendations(userId)}
                />
              </main>

              <ResultsFooter />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals & Sub-pages */}
      <AnimatePresence>
        {selectedPlace && (
          <PlaceDetailModal
            selectedPlace={selectedPlace}
            isNewUser={isNewUser}
            onClose={() => setSelectedPlace(null)}
            onOpenMap={handleOpenGoogleMaps}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRatingModal && ratingTargetPlace && (
          <RatingModal
            place={{ id: ratingTargetPlace.id, name: ratingTargetPlace.name }}
            userId={userId}
            onClose={() => setShowRatingModal(false)}
            onSubmit={() => {
              setShowRatingModal(false);
              setRatingTargetPlace(null);
              setNavHistoryRefreshCounter((prev) => prev + 1);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'review' && (
          <RatingHistory userId={userId} userName={userName} onBack={() => setStep('results')} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'profile' && (
          <UserProfile userId={userId} userName={userName} onBack={() => setStep('results')} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'navigation_history' && (
          <NavigationHistory
            userId={userId}
            userName={userName}
            refreshTrigger={navHistoryRefreshCounter}
            onBack={() => setStep('results')}
            onRatePlace={(id: string, name: string) => {
              setRatingTargetPlace({ id, name } as unknown as Recommendation);
              setShowRatingModal(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
