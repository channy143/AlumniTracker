import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';

export default function AuthLayout() {
  const { user, loading } = useAuthStore();
  const location = useLocation();
  const isRegister = location.pathname.includes('register');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ctu-blue" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex overflow-hidden bg-white">
      {/* Left: Brand panel — collapses when registering, hidden on mobile */}
      <motion.div
        initial={false}
        animate={{ width: isRegister ? '0%' : '50%', opacity: isRegister ? 0 : 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="hidden lg:block overflow-hidden shrink-0 min-w-0"
      >
        <div
          className="w-[50vw] min-h-screen relative bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/image/ChatGPT Image May 27, 2026, 04_38_30 AM.png")' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-12">
            <div className="max-w-md w-full">
              <h1 className="text-5xl md:text-6xl font-bold text-white font-display leading-[1.05] tracking-tight">
                CTU-Naga<br />
                <span className="text-ctu-marigold">Alumni Network</span>
              </h1>
              <div className="w-12 h-0.5 bg-ctu-marigold mt-6" />
              <p className="text-lg text-white/60 mt-6 font-light tracking-wide uppercase">
                Bridging Education to Eternity
              </p>
              <p className="text-sm text-white/40 mt-12 leading-relaxed max-w-xs">
                Cebu Technological University — Naga Extension Campus.
                A lifelong community of graduates, mentors, and changemakers.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Center: Form panel — full width on mobile, shifts left on desktop when brand collapses */}
      <div className="flex-1 min-h-screen flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>

      {/* Right: New panel — slides in when registering, hidden on mobile */}
      <motion.div
        initial={false}
        animate={{ width: isRegister ? '50%' : '0%', opacity: isRegister ? 1 : 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="hidden lg:block overflow-hidden shrink-0 min-w-0"
      >
        <div
          className="w-[50vw] min-h-screen relative bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/image/download.avif")' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-12">
            <div className="max-w-md w-full text-right">
            <h2 className="text-5xl md:text-6xl font-bold text-white font-display leading-[1.05] tracking-tight">
              Join the<br />
              <span className="text-ctu-marigold">Community</span>
            </h2>
            <div className="w-12 h-0.5 bg-ctu-marigold mt-6 ml-auto" />
            <p className="text-lg text-white/60 mt-6 font-light tracking-wide uppercase">
              Create Your Profile
            </p>
            <p className="text-sm text-white/40 mt-12 leading-relaxed">
              Create your alumni profile to connect with fellow graduates,
              discover career opportunities, and give back to CTU-Naga.
            </p>
            <div className="mt-8 flex items-center gap-2 text-sm text-white/50 justify-end">
              <span>Already part of the network?</span>
              <span className="w-2 h-2 rounded-full bg-ctu-marigold" />
            </div>
          </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
