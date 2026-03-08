import { useState, useEffect, useMemo } from 'react';
import { Compass, MapPin, Star, Sparkles, Loader2, Heart, ArrowRight, User, Lock, LogIn, CheckCircle2, X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/apiClient';
import { clearAuthSession, getAuthSession, setAuthSession } from '@/lib/auth';
import workBg from './assets/work_bg.png';
import moneyBg from './assets/money_bg.png';
import loveBg from './assets/love_bg.png';
import PlaceMap from './components/Map';

interface Recommendation {
  id: string;
  name: string;
  type: string;
  category: string;
  lat: number;
  lng: number;
  score: number;
  image?: string;
  sacred_object?: string;
  offerings?: string;
}

type Step = 'selection' | 'register' | 'login' | 'results';

interface AttractionApi {
  attraction_id: number;
  attraction_name: string;
  type_id: number | null;
  lat: number | string | null;
  lng: number | string | null;
  sacred_obj?: string | null;
  offering?: string | null;
  attraction_image?: string | null;
  categories?: string | null;
}

interface RatingApi {
  attraction_id: number;
  rating_work: number;
  rating_finance: number;
  rating_love: number;
}

interface TypeApi {
  type_id: number;
  type_name: string;
}

const CATEGORY_LABELS: Record<'LOVE' | 'WEALTH' | 'CAREER', string> = {
  LOVE: 'ความรัก',
  WEALTH: 'โชคลาภ',
  CAREER: 'การงาน',
};

const CATEGORY_FILTER_ALIASES: Record<'LOVE' | 'WEALTH' | 'CAREER', string[]> = {
  LOVE: ['ความรัก'],
  WEALTH: ['โชคลาภ', 'การเงิน'],
  CAREER: ['การงาน'],
};

const BACKEND_BASE_URL = 'http://localhost:8000';

const resolveImageUrl = (value?: string | null, cacheBuster?: number) => {
  if (!value) return undefined;
  const appendCacheBuster = (url: string) => {
    if (!cacheBuster) return url;
    return `${url}${url.includes('?') ? '&' : '?'}v=${cacheBuster}`;
  };

  if (/^https?:\/\//i.test(value)) return appendCacheBuster(value);
  if (value.startsWith('/uploads/')) return appendCacheBuster(`${BACKEND_BASE_URL}${value}`);
  return appendCacheBuster(value);
};

// Mystical Mandala Component
const MysticalMandala = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-20">
      {/* Outer Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        className="absolute w-[800px] h-[800px] border border-faith-gold/30 rounded-full flex items-center justify-center"
      >
        <div className="absolute w-[90%] h-[90%] border border-faith-gold/20 rounded-full border-dashed" />
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 bg-faith-gold/40 rounded-full"
            style={{
              transform: `rotate(${i * 30}deg) translate(400px)`,
            }}
          />
        ))}
      </motion.div>

      {/* Middle Ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute w-[600px] h-[600px] border border-faith-gold/30 rounded-full flex items-center justify-center"
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-32 h-32 border border-faith-gold/20 rounded-full"
            style={{
              transform: `rotate(${i * 45}deg) translate(150px)`,
            }}
          />
        ))}
      </motion.div>

      {/* Inner Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute w-[400px] h-[400px] border border-faith-gold/30 rounded-full flex items-center justify-center opacity-50"
      >
        <div className="w-full h-full border-4 border-faith-gold/10 rounded-full" />
        {[...Array(6)].map((_, i) => (
          <Star
            key={i}
            size={24}
            className="absolute text-faith-gold/40"
            style={{
              transform: `rotate(${i * 60}deg) translate(200px) rotate(-${i * 60}deg)`,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

// Animated Background Component
const DivineBackground = ({ currentBgIndex, backgrounds }: { currentBgIndex: number, backgrounds: string[] }) => {
  const particles = useMemo(() => {
    return [...Array(30)].map(() => ({
      left: Math.random() * 100 + "%",
      top: (Math.random() * 50 + 50) + "%",
      delay: Math.random() * 10,
      duration: Math.random() * 8 + 8,
      x: (Math.random() - 0.5) * 60
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#1A0404]">
      {/* Background Image Carousel */}
      <AnimatePresence mode='wait'>
        <motion.div
          key={currentBgIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgrounds[currentBgIndex]})` }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1A0404] via-[#1A0404]/80 to-[#1A0404]" />

      {/* Moving Blobs */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -40, 80, 0],
          scale: [1, 1.1, 0.95, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{ willChange: "transform" }}
        className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-amber-600/10 blur-[120px] rounded-full"
      />
      <motion.div
        animate={{
          x: [0, -80, 40, 0],
          y: [0, 80, -40, 0],
          scale: [1, 1.05, 0.9, 1]
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{ willChange: "transform" }}
        className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-800/15 blur-[100px] rounded-full"
      />

      {/* Divine Sparks (Floating Particles) */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{
            left: p.left,
            top: p.top,
            opacity: 0,
            scale: 0
          }}
          animate={{
            y: [0, -400],
            x: [0, p.x],
            opacity: [0, 0.7, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
          style={{ willChange: "transform, opacity" }}
          className="absolute w-1 h-1 bg-faith-gold rounded-full shadow-[0_0_12px_#D4AF37]"
        />
      ))}

      <MysticalMandala />
    </div>
  );
};

// --- Star Rating Component ---
const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-125 focus:outline-none"
        >
          <Star
            size={32}
            className={`transition-colors ${star <= (hovered || value)
              ? 'text-faith-gold fill-faith-gold'
              : 'text-gray-600'
              }`}
          />
        </button>
      ))}
    </div>
  );
};

// --- Rating Modal Component ---
const RatingModal = ({
  place,
  userId,
  onSubmit,
  onClose,
}: {
  place: { id: string; name: string };
  userId: string;
  onSubmit: (ratings: { work: number; finance: number; love: number }) => void;
  onClose: () => void;
}) => {
  const [work, setWork] = useState(0);
  const [finance, setFinance] = useState(0);
  const [love, setLove] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // At least 1 category must be rated to submit (all are optional individually)
  const hasAny = work > 0 || finance > 0 || love > 0;

  const handleSubmit = async () => {
    if (!hasAny) return;
    setSubmitting(true);
    try {
      await apiPost('/api/rating', {
        user_id: Number(userId),
        attraction_id: Number(place.id),
        rating_work: work,
        rating_finance: finance,
        rating_love: love,
      });
    } catch (e) {
      console.error('Rating save failed:', e);
    } finally {
      setSubmitting(false);
      onSubmit({ work, finance, love });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-[#1A0404] border border-faith-gold/40 rounded-[2rem] w-full max-w-md p-8 relative shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/40 rounded-full text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-faith-gold/20 border border-faith-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star className="text-faith-gold fill-faith-gold" size={32} />
          </div>
          <h3 className="text-2xl font-black text-white gold-gradient-text mb-1">ให้คะแนนสถานที่</h3>
          <p className="text-gray-400 text-sm">{place.name}</p>
          <p className="text-gray-500 text-xs mt-2">ให้คะแนนในหมวดที่ต้องการ (ไม่บังคับทุกหมวด)</p>
        </div>

        {/* Rating Rows */}
        <div className="space-y-6 mb-8">
          {([
            { label: 'การงาน', icon: '💼', value: work, onChange: setWork },
            { label: 'การเงิน', icon: '💰', value: finance, onChange: setFinance },
            { label: 'ความรัก', icon: '❤️', value: love, onChange: setLove },
          ] as const).map(({ label, icon, value, onChange }) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-24 shrink-0">
                <span className="text-xl">{icon}</span>
                <span className="text-sm font-bold text-white">{label}</span>
              </div>
              <StarRating value={value} onChange={onChange} />
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <motion.button
          whileHover={hasAny ? { scale: 1.02 } : {}}
          whileTap={hasAny ? { scale: 0.98 } : {}}
          onClick={handleSubmit}
          disabled={!hasAny || submitting}
          className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${hasAny
            ? 'bg-faith-gold text-[#1A0404] shadow-lg shadow-amber-700/30 hover:bg-amber-400'
            : 'bg-white/10 text-gray-500 cursor-not-allowed'
            }`}
        >
          {submitting ? <Loader2 className="animate-spin" size={22} /> : <><Star size={20} />ส่งคะแนน</>}
        </motion.button>
        <button
          onClick={onClose}
          className="w-full mt-3 py-3 rounded-2xl text-gray-500 hover:text-gray-300 text-sm font-bold transition-colors"
        >
          ข้ามขั้นตอนนี้
        </button>
      </motion.div>
    </motion.div>
  );
};

function App() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('selection');
  // const [selectedInterests, setSelectedInterests] = useState<string[]>([]); // Removed selection logic
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentBg, setCurrentBg] = useState(2);
  const backgrounds = [workBg, moneyBg, loveBg];

  const [activeCategory, setActiveCategory] = useState<string>('LOVE');
  const [rememberMe, setRememberMe] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Recommendation | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
  // ratingTargetPlace: the place the user went to see on Google Maps
  const [ratingTargetPlace, setRatingTargetPlace] = useState<Recommendation | null>(null);
  // awaitingReturn: true while user is in Google Maps tab
  const [awaitingReturn, setAwaitingReturn] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const savedId = localStorage.getItem('faith_userId');
    const savedName = localStorage.getItem('faith_userName');
    const session = getAuthSession();
    setIsAdminSession(session?.role === 'admin');

    if (session?.user_id && session?.user_name) {
      const sessionId = String(session.user_id);
      setUserId(sessionId);
      setUserName(session.user_name);
      setFormData(prev => ({ ...prev, name: session.user_name }));

      if (savedId && savedName) {
        setRememberMe(true);
      }

      // Keep user on logged-in flow after refresh when auth session exists.
      fetchRecommendations(sessionId);
      return;
    }

    if (savedId && savedName) {
      setUserId(savedId);
      setUserName(savedName);
      setFormData(prev => ({ ...prev, name: savedName }));
      setRememberMe(true);
      // Auto-restore the results page without re-login
      fetchRecommendations(savedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect when user returns to the tab after opening Google Maps
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
      const apiRecommendations = await apiGet(`/recommend/${id}`) as {
        recommendations?: Recommendation[];
        error?: string;
      };

      if (apiRecommendations?.error) {
        throw new Error(apiRecommendations.error);
      }

      const cacheBuster = Date.now();
      const recommendations = Array.isArray(apiRecommendations?.recommendations)
        ? apiRecommendations.recommendations.map((item) => ({
            ...item,
            image: resolveImageUrl(item.image, cacheBuster) || item.image,
          }))
        : [];

      setBrokenImageIds(new Set());

      if (recommendations.length === 0) {
        setError('ไม่พบข้อมูลคำแนะนำจากระบบ');
      }

      setRecommendations(recommendations);
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
      const userName = formData.name.trim();
      if (!userName) {
        setError('กรุณากรอกชื่อผู้ใช้');
        return;
      }

      const users = await apiGet('/api/users') as Array<{ user_id: number; user_name: string; password: string }>;
      const isDuplicate = users.some((item) => item.user_name.toLowerCase() === userName.toLowerCase());
      if (isDuplicate) {
        setError('ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น');
        return;
      }

      const created = await apiPost('/api/users', {
        user_name: userName,
        password: formData.password,
        role: 'user',
      }) as { user_id: number; user_name: string };

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
      fetchRecommendations(uId);
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

      const users = await apiGet('/api/users') as Array<{ user_id: number; user_name: string; password: string; role?: string }>;
      const matched = users.find((item) => item.user_name.toLowerCase() === inputName.toLowerCase());

      if (!matched || matched.password !== formData.password) {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        return;
      }

      const uId = String(matched.user_id);
      const role = matched.role || 'user';
      setUserId(uId);
      setUserName(matched.user_name);
      setAuthSession({
        user_id: matched.user_id,
        user_name: matched.user_name,
        role,
      });
      setIsAdminSession(role === 'admin');
      if (rememberMe) {
        localStorage.setItem('faith_userId', uId);
        localStorage.setItem('faith_userName', matched.user_name);
      } else {
        localStorage.removeItem('faith_userId');
        localStorage.removeItem('faith_userName');
      }
      fetchRecommendations(uId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`เข้าสู่ระบบไม่สำเร็จ (${msg})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col text-white selection:bg-faith-gold/30 font-outfit overflow-x-hidden ${(step === 'register' || step === 'login') ? 'overflow-y-hidden' : ''}`}>
      <DivineBackground currentBgIndex={currentBg} backgrounds={backgrounds} />

      <div className="flex-1">
      <AnimatePresence mode="wait">
        {step === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto px-6 py-10 relative z-10 min-h-screen flex flex-col"
          >
            {/* Top Left Navigation (Login removed) */}
            {/* Top Right Navigation */}
            <nav className="flex justify-end items-center gap-4 mb-10">
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setStep('login')}
                className="bg-white/10 text-white px-6 py-2.5 sm:px-5 sm:py-2 rounded-full font-bold text-sm sm:text-xs border border-white/10 hover:bg-white/20 transition-all flex items-center gap-2 backdrop-blur-md"
              >
                <LogIn size={18} /> เข้าสู่ระบบ
              </motion.button>
            </nav>

            <div className="flex-1 flex flex-col justify-center items-center text-center relative z-20">
              <div className="mb-20 flex justify-center items-center gap-3">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                  <Sparkles className="text-faith-gold" size={24} />
                </motion.div>
                <span className="text-faith-gold font-black tracking-[0.3em] text-sm uppercase">Faith Nokonpathom</span>
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                  <Sparkles className="text-faith-gold" size={24} />
                </motion.div>
              </div>

              <motion.h1
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
                className="text-6xl md:text-9xl font-black mb-12 gold-gradient-text tracking-tight leading-normal drop-shadow-2xl overflow-visible"
              >
                สถานที่สายมูในนครปฐม
              </motion.h1>

              <motion.h2
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="text-lg md:text-2xl text-faith-gold font-bold mb-6 tracking-wide drop-shadow-md"
              >
                "ค้นพบเส้นทางสายมูที่ใช่ ในแบบที่เป็นคุณ"
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="text-gray-300 max-w-3xl text-lg font-light leading-relaxed mb-12 drop-shadow-md mx-auto"
              >
                แพลตฟอร์มแนะนำการท่องเที่ยวเชิงความเชื่อในจังหวัดนครปฐม ที่รวมรวบข้อมูลสถานที่ศักดิ์สิทธิ์และแหล่งท่องเที่ยวสำคัญทั่วจังหวัด โดยใช้ระบบ <span className="text-faith-gold font-medium">Recommendation System</span> มาเป็นผู้ช่วยส่วนตัวในการวิเคราะห์และนำเสนอสถานที่ที่ตรงกับความสนใจของคุณ เพื่อให้ทุกการเดินทางเปี่ยมไปด้วยความหมายและสิริมงคล
              </motion.p>

              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(212, 175, 55, 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep('register')}
                className="bg-faith-gold hover:bg-amber-400 text-[#1A0404] px-8 py-4 sm:px-4 sm:py-1.5 rounded-full font-black text-lg sm:text-xs shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all flex items-center gap-3 mb-20 group"
              >
                <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
                เริ่มต้นเส้นทางศรัทธา
                <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </motion.button>

              {/* Features Section Removed */}
            </div>
          </motion.div>
        )}

        {(step === 'register' || step === 'login') && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
            className="w-full h-full px-4 sm:px-4 relative z-10 min-h-screen flex flex-col justify-center items-center"
          >
            <div className="glass-card rounded-2xl sm:rounded-[3rem] p-6 sm:px-10 sm:py-7 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-lg sm:max-w-xl">
              <div className="text-center mb-8 sm:mb-7">
                <motion.div
                  initial={{ rotateY: 0 }} animate={{ rotateY: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 sm:w-14 sm:h-14 bg-faith-gold rounded-2xl sm:rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-5 shadow-2xl shadow-amber-500/30 text-[#1A0404]"
                >
                  {step === 'register' ? <User size={32} className="sm:hidden" /> : <LogIn size={32} className="sm:hidden" />}
                  {step === 'register' ? <User size={26} className="hidden sm:block" /> : <LogIn size={26} className="hidden sm:block" />}
                </motion.div>
                <h2 className="text-2xl sm:text-2xl font-black mb-2 sm:mb-2 gold-gradient-text uppercase tracking-tight">{step === 'register' ? 'ลงทะเบียน' : 'ยินดีต้อนรับกลับมา'}</h2>
                <p className="text-gray-400 text-xs sm:text-xs font-medium">ร่วมเดินทางสู่เส้นทางแห่งศรัทธา</p>
              </div>

              <form onSubmit={step === 'register' ? handleRegister : handleLogin} className="space-y-4 sm:space-y-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-faith-gold/80 pl-1">ชื่อผู้ใช้</label>
                  <div className="relative">
                    <User className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-500 z-10 pointer-events-none" size={16} />
                    <input
                      type="text" required placeholder="กรอกชื่อผู้ใช้"
                      className="w-full text-xs sm:text-sm bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-12 sm:pl-14 pr-4 sm:pr-6 focus:border-faith-gold transition-all outline-none backdrop-blur-xl"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-faith-gold/80 pl-1">รหัสผ่าน</label>
                  <div className="relative">
                    <Lock className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-500 z-10 pointer-events-none" size={16} />
                    <input
                      type={showPassword ? "text" : "password"} required placeholder="รหัสผ่านของคุณ"
                      className="w-full text-xs sm:text-sm bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-12 sm:pl-14 pr-20 sm:pr-24 focus:border-faith-gold transition-all outline-none backdrop-blur-xl"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-faith-gold hover:text-amber-300 transition-colors"
                      aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {step === 'register' && (
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-faith-gold/80 pl-1">ยืนยันรหัสผ่าน</label>
                    <div className="relative">
                      <Lock className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-500 z-10 pointer-events-none" size={16} />
                      <input
                        type={showPassword ? "text" : "password"} required placeholder="ยืนยันรหัสผ่าน"
                        className="w-full text-xs sm:text-sm bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-12 sm:pl-14 pr-20 sm:pr-24 focus:border-faith-gold transition-all outline-none backdrop-blur-xl"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-faith-gold hover:text-amber-300 transition-colors"
                        aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 sm:gap-3 px-1 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-faith-gold border-faith-gold' : 'border-white/20'}`}>
                    {rememberMe && <CheckCircle2 size={14} className="sm:size-16 text-black" />}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-300 font-medium group-hover:text-white transition-colors">จดจำบัญชีในอุปกรณ์นี้</span>
                </div>

                {error && <p className="text-red-400 text-xs text-center font-bold bg-red-950/40 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-red-900/50">{error}</p>}

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit" disabled={loading}
                  className="w-full bg-faith-gold hover:bg-amber-400 text-[#1A0404] py-3 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-base sm:text-base transition-all shadow-2xl shadow-amber-600/30 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>{step === 'register' ? 'ลงทะเบียน' : 'เข้าสู่ระบบ'} <ArrowRight size={18} className="sm:size-5" /></>
                  )}
                </motion.button>
              </form>

              <p className="mt-6 sm:mt-6 text-center text-xs sm:text-sm text-gray-400">
                {step === 'register' ? 'มีบัญชีอยู่แล้ว?' : 'เพิ่งเคยมาที่นี่ครั้งแรก?'} <button type="button" onClick={() => setStep(step === 'register' ? 'login' : 'register')} className="text-faith-gold hover:underline underline-offset-4 ml-1 font-semibold">{step === 'register' ? 'เข้าสู่ระบบ' : 'ลงทะเบียน'}</button>
              </p>
            </div>

            <button
              onClick={() => setStep('selection')}
              className="mt-4 sm:mt-5 text-gray-400 hover:text-faith-gold text-xs sm:text-sm w-full transition-all font-semibold"
            >
              ← กลับหน้าหลัก
            </button>
          </motion.div>
        )}

        {step === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full relative z-10 font-outfit min-h-screen pb-0 flex flex-col"
          >
            {/* Navbar */}
            <nav className="flex justify-between items-center px-6 md:px-12 py-6 absolute w-full z-50">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setStep('selection')}>
                <motion.div whileHover={{ rotate: 180 }} className="p-2 bg-faith-gold rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                  <Compass className="text-[#1A0404]" size={20} />
                </motion.div>
                <div className="flex flex-col">
                  <span className="text-xl font-black gold-gradient-text tracking-tighter uppercase leading-none">ศรัทธา AI</span>
                  <span className="text-[8px] text-gray-400 tracking-widest uppercase">ผู้นำทางจิตวิญญาณ</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {isAdminSession && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="px-6 py-2 bg-faith-gold hover:bg-amber-400 text-[#1A0404] rounded-full text-xs font-black uppercase tracking-widest transition-all border border-faith-gold"
                  >
                    ไปหน้า Admin
                  </button>
                )}
                <button onClick={() => {
                  localStorage.removeItem('faith_userId');
                  localStorage.removeItem('faith_userName');
                  clearAuthSession();
                  setIsAdminSession(false);
                  setUserId('');
                  setUserName('');
                  setRecommendations([]);
                  setStep('selection');
                }}
                  className="px-6 py-2 bg-white/10 hover:bg-faith-gold text-white hover:text-[#1A0404] rounded-full text-xs font-black uppercase tracking-widest transition-all backdrop-blur-md border border-white/20 hover:border-faith-gold group"
                >
                  <span className="hidden sm:inline">{userName ? `ผู้ใช้: ${userName.substring(0, 8)}` : 'ออกจากระบบ'}</span>
                  <LogIn size={14} className="inline sm:hidden" />
                </button>
              </div>
            </nav>

            {/* Large Hero Area */}
            <header className="w-full h-[45vh] md:h-[60vh] relative flex flex-col items-center justify-center overflow-hidden mb-10 md:mb-16">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
                style={{ backgroundImage: `url(${backgrounds[currentBg]})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#1A0404]/80 via-[#1A0404]/60 to-[#1A0404]" />

              <div className="relative z-10 text-center px-4 w-full flex flex-col items-center justify-center flex-1 pt-12">
                <motion.h2
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                  className="text-5xl md:text-8xl font-black mb-0 gold-gradient-text tracking-tighter drop-shadow-2xl pb-6 leading-normal overflow-visible"
                >
                  สถานที่สายมูในนครปฐม
                </motion.h2>

                {/* Mimic the black bar from wireframe as an elegant search or separator */}

              </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 mb-10 flex-1 w-full relative z-20">
              <div className="flex flex-col mb-12 gap-6 w-full items-center">
                <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tight flex flex-col md:flex-row gap-2 text-center md:text-left">
                  <span className="text-faith-gold">สถานที่</span> <span className="text-white">แนะนำสำหรับคุณ</span>
                </h3>

                {/* Filter Buttons */}
                <div className="flex items-center w-[85%] sm:w-auto justify-between sm:justify-center overflow-x-auto no-scrollbar gap-1 sm:gap-4 p-1 rounded-full border border-white/10 bg-black/60 backdrop-blur-md">
                  <button
                    onClick={() => { setActiveCategory('LOVE'); setCurrentBg(2); }}
                    className={`flex-1 sm:flex-none px-4 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-sm font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeCategory === 'LOVE' ? 'bg-faith-gold text-[#1A0404]' : 'text-white hover:text-faith-gold'}`}>
                    ความรัก
                  </button>
                  <button
                    onClick={() => { setActiveCategory('WEALTH'); setCurrentBg(1); }}
                    className={`flex-1 sm:flex-none px-4 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-sm font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeCategory === 'WEALTH' ? 'bg-faith-gold text-[#1A0404]' : 'text-white hover:text-faith-gold'}`}>
                    การเงิน
                  </button>
                  <button
                    onClick={() => { setActiveCategory('CAREER'); setCurrentBg(0); }}
                    className={`flex-1 sm:flex-none px-4 md:px-8 py-2 md:py-3 rounded-full text-[10px] md:text-sm font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeCategory === 'CAREER' ? 'bg-faith-gold text-[#1A0404]' : 'text-white hover:text-faith-gold'}`}>
                    การงาน
                  </button>
                </div>
              </div>

              {/* Error State with Retry */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-24 text-center"
                >
                  <div className="w-20 h-20 bg-red-950/50 rounded-full flex items-center justify-center mb-6 border border-red-800/50">
                    <span className="text-4xl">⚠️</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3">ไม่สามารถโหลดคำแนะนำได้</h3>
                  <p className="text-gray-400 text-sm max-w-md mb-8 leading-relaxed">{error}</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => fetchRecommendations(userId)}
                    disabled={loading}
                    className="bg-faith-gold hover:bg-amber-400 text-[#1A0404] px-10 py-4 rounded-full font-black text-base shadow-lg flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    ลองใหม่อีกครั้ง
                  </motion.button>
                </motion.div>
              )}

              {/* Grid 3 top, 2 bottom centered */}
              {!error && <div className="flex flex-wrap justify-center gap-6">
                {recommendations
                  .filter(item => {
                    const aliases = CATEGORY_FILTER_ALIASES[activeCategory as 'LOVE' | 'WEALTH' | 'CAREER'];
                    return aliases.some((label) => item.category.includes(label));
                  })
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5)
                  .map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -10, boxShadow: "0 25px 50px -12px rgba(212,175,55,0.25)" }}
                      className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] glass-card rounded-[2rem] overflow-hidden flex flex-col border border-white/10 hover:border-faith-gold/50 cursor-pointer transition-all"
                      onClick={() => setSelectedPlace(item)}
                    >
                      {/* Card Image Area */}
                      <div className="h-56 relative overflow-hidden group/img">
                        {item.image && !brokenImageIds.has(item.id) ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                            onError={() => {
                              setBrokenImageIds((prev) => {
                                const next = new Set(prev);
                                next.add(item.id);
                                return next;
                              });
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white/70 text-sm font-bold tracking-wider">
                            NO IMAGE
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1A0404] via-[#1A0404]/40 to-transparent" />


                      </div>

                      <div className="p-6 flex-1 flex flex-col">
                        <h4 className="text-xl font-black text-white mb-3 line-clamp-1 group-hover:text-faith-gold transition-colors">{item.name}</h4>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-1.5 bg-faith-gold/20 rounded border border-faith-gold/30">
                            <Star size={12} className="text-faith-gold fill-faith-gold" />
                          </div>
                          <span className="text-sm font-bold text-gray-300 tracking-wider font-mono">
                            {item.score.toFixed(1)} <span className="text-gray-500 font-sans tracking-normal font-medium text-xs ml-1">(คะแนนความเข้ากัน)</span>
                          </span>
                        </div>

                        <p className="text-sm text-gray-400 mb-8 flex-1 line-clamp-2 leading-relaxed font-light">
                          {item.sacred_object && item.sacred_object !== "-" ? `สิ่งศักดิ์สิทธิ์: ${item.sacred_object}` : (item.offerings && item.offerings !== "-" ? `ของไหว้: ${item.offerings}` : "สถานที่ศักดิ์สิทธิ์ที่เปี่ยมไปด้วยสิริมงคลและพลังวิเศษ")}
                        </p>

                        <button className="w-full bg-white/5 hover:bg-faith-gold text-white hover:text-[#1A0404] py-4 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-transparent group/btn mt-auto">
                          <Sparkles size={16} className="text-faith-gold group-hover/btn:text-[#1A0404]" /> รับเส้นทางการเดินทาง
                        </button>
                      </div>
                    </motion.div>
                  ))}
              </div>}
            </main>

            {/* Footer matching wireframe */}
            <footer className="w-full bg-black/40 pt-6 pb-3 border-t border-white/10 mt-auto backdrop-blur-lg">
              <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between mb-3 gap-4">
                <div className="max-w-sm">
                  <div className="flex items-center gap-3 mb-2 opacity-60">
                    <Compass size={32} className="text-faith-gold" />
                    <span className="text-xl font-black tracking-widest text-white">ศรัทธา AI</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-xs font-light">
                    ค้นพบพลังแห่งจิตวิญญาณแห่งนครปฐม นำความสงบสุขและความเป็นสิริมงคลมาสู่ชีวิตผ่านการแนะนำสถานที่ศักดิ์สิทธิ์
                  </p>
                </div>

                <div className="flex flex-wrap gap-6 md:gap-12 opacity-80">
                  <div className="flex flex-col gap-2">
                    <h5 className="text-faith-gold text-xs font-black uppercase tracking-[0.2em] mb-1">แพลตฟอร์ม</h5>
                    <a href="#" className="text-xs text-gray-400 hover:text-white transition-colors">เริ่มต้นการเดินทาง</a>
                    <a href="#" className="text-xs text-gray-400 hover:text-white transition-colors">สำรวจแผนที่</a>
                    <a href="#" className="text-xs text-gray-400 hover:text-white transition-colors">สถานที่ศักดิ์สิทธิ์</a>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h5 className="text-faith-gold text-xs font-black uppercase tracking-[0.2em] mb-1">ข้อมูลทางกฎหมาย</h5>
                    <a href="#" className="text-xs text-gray-400 hover:text-white transition-colors">นโยบายความเป็นส่วนตัว</a>
                    <a href="#" className="text-xs text-gray-400 hover:text-white transition-colors">เงื่อนไขการให้บริการ</a>
                    <a href="#" className="text-xs text-gray-400 hover:text-white transition-colors">ติดต่อฝ่ายสนับสนุน</a>
                  </div>
                </div>
              </div>

              <div className="max-w-7xl mx-auto px-6 border-t border-white/10 pt-3 flex flex-col items-center">
                <span className="text-[10px] text-gray-600 tracking-widest uppercase">
                  © 2026 Nakornpathom Faith Experience
                </span>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPlace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedPlace(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A0404] border border-faith-gold/30 rounded-t-[1.5rem] sm:rounded-[2rem] max-w-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto desktop-no-scrollbar relative shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPlace(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2.5 bg-black/50 rounded-full text-gray-300 hover:text-white transition-colors z-20"
              >
                <X size={24} />
              </button>

              <div className="relative h-44 sm:h-64 md:h-72">
                {selectedPlace.image && !brokenImageIds.has(selectedPlace.id) ? (
                  <img
                    src={selectedPlace.image}
                    alt={selectedPlace.name}
                    className="w-full h-full object-cover"
                    onError={() => {
                      setBrokenImageIds((prev) => {
                        const next = new Set(prev);
                        next.add(selectedPlace.id);
                        return next;
                      });
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-faith-gold/10 flex items-center justify-center">
                    <span className="text-faith-gold/30 font-black text-4xl">NO IMAGE</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A0404] via-[#1A0404]/35 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    {[selectedPlace.type, ...selectedPlace.category.split(',').map((item) => item.trim()).filter(Boolean)].slice(0, 3).map((chip, index) => (
                      <span
                        key={`${chip}-${index}`}
                        className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-faith-gold/85 text-[#1A0404] text-[10px] sm:text-xs font-black rounded-lg sm:rounded-xl tracking-wide"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight drop-shadow-lg line-clamp-2">{selectedPlace.name}</h2>
                </div>
              </div>

              <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                <div className="bg-[#5F2B2B] border border-white/15 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3 text-faith-gold">
                    <Star size={18} fill="currentColor" />
                    <span className="font-black text-base sm:text-lg">คะแนนรวม</span>
                  </div>
                  <span className="text-3xl sm:text-5xl font-black text-white leading-none">{selectedPlace.score.toFixed(2)}</span>
                </div>

                <div className="bg-[#5F2B2B] border border-white/15 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3 text-faith-gold">
                    <Sparkles size={18} />
                    <span className="font-black text-xl sm:text-2xl">สิ่งศักดิ์สิทธิ์</span>
                  </div>
                  <p className="text-white text-sm sm:text-lg leading-snug">{selectedPlace.sacred_object || 'ไม่ระบุข้อมูล'}</p>
                </div>

                <div className="bg-[#5F2B2B] border border-white/15 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3 text-faith-gold">
                    <Heart size={18} />
                    <span className="font-black text-xl sm:text-2xl">ของไหว้</span>
                  </div>
                  <p className="text-white text-sm sm:text-lg leading-snug">{selectedPlace.offerings || 'ไม่ระบุข้อมูล'}</p>
                </div>

                <div className="w-full h-44 sm:h-56 rounded-2xl overflow-hidden border border-white/20">
                  <PlaceMap recommendations={[selectedPlace]} className="h-full" />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`;
                    // Save which place the user visited so we can show the rating modal on return
                    setRatingTargetPlace(selectedPlace);
                    setAwaitingReturn(true);
                    window.open(mapUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3.5 sm:py-4 bg-faith-gold text-[#1A0404] font-black rounded-2xl hover:bg-amber-400 transition-colors text-sm sm:text-lg"
                >
                  <MapPin size={18} />
                  <span>เปิดในแผนที่ GOOGLE MAPS</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      {step === 'selection' && (
        <footer className="py-12 text-center text-xs font-semibold text-gray-500 relative z-10 pointer-events-none">
          © 2026 Nakornpathom Faith Experience • AI Recommendation System
        </footer>
      )}

      {/* Rating Modal — shows after user returns from Google Maps */}
      <AnimatePresence>
        {showRatingModal && ratingTargetPlace && (
          <RatingModal
            place={{ id: ratingTargetPlace.id, name: ratingTargetPlace.name }}
            userId={userId}
            onClose={() => setShowRatingModal(false)}
            onSubmit={() => {
              setShowRatingModal(false);
              setRatingTargetPlace(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
