import React, { useState, useEffect } from 'react';
import { StudentView } from './components/StudentView';
import { TeacherView } from './components/TeacherView';
import { AdminView } from './components/AdminView';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { EpicOnboarding } from './components/EpicOnboarding';
import { UserGuide } from './components/UserGuide';
import { PhilosophyMode, Language, UserRole } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';

const AppContent: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [philosophyMode, setPhilosophyMode] = useState<PhilosophyMode>(PhilosophyMode.JAPAN);

  // Initialize language from local storage or default to English
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || Language.EN;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [forcedView, setForcedView] = useState<'STUDENT' | 'TEACHER' | 'ADMIN' | 'GUIDE' | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [showEpicOnboarding, setShowEpicOnboarding] = useState(false);

  // Persist language changes
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

  // If user logs out, reset view
  useEffect(() => {
    if (!user) {
      setForcedView(null);
      setIsOnboarding(false);
    } else {
      if (!user.isOnboarded && !localStorage.getItem(`onboarded_${user.id}`)) {
        setIsOnboarding(true);
      }
      if (!localStorage.getItem(`campus_epic_onboarding_${user.id}`)) {
        setShowEpicOnboarding(true);
      }
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarded_${user.id}`, 'true');
      setIsOnboarding(false);
    }
  };

  const handleEpicComplete = (detectedLang: Language) => {
    handleLanguageChange(detectedLang);
    if (user) {
      localStorage.setItem(`campus_epic_onboarding_${user.id}`, 'true');
    }
    setShowEpicOnboarding(false);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-slate-500 font-mono">Initializing System...</div>;
  }

  // Determine which view to show
  const activeView = forcedView
    ? forcedView
    : (user?.role === UserRole.ADMIN ? 'ADMIN' : user?.role === UserRole.TEACHER ? 'TEACHER' : 'STUDENT');

  if (!user && forcedView !== 'GUIDE') {
    return (
      <>
        <LandingPage
          onLoginClick={() => setIsAuthModalOpen(true)}
          onGuideClick={() => setForcedView('GUIDE')}
          language={language}
          setLanguage={handleLanguageChange}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          language={language}
          setLanguage={handleLanguageChange}
        />
      </>
    );
  }

  if (forcedView === 'GUIDE') {
    return <UserGuide language={language} onBack={() => setForcedView(null)} setLanguage={handleLanguageChange} />;
  }

  if (showEpicOnboarding) {
    return <EpicOnboarding onComplete={handleEpicComplete} />;
  }

  if (isOnboarding) {
    return <OnboardingWizard user={user} onComplete={handleOnboardingComplete} />;
  }

  if (activeView === 'ADMIN') {
    return <AdminView user={user} onLogout={logout} language={language} setLanguage={handleLanguageChange} />;
  }

  return (
    <>
      {activeView === 'STUDENT' ? (
        <StudentView
          mode={philosophyMode}
          language={language}
          user={user}
          onLogout={logout}
          onSwitchToTeacher={
            (user.role === UserRole.TEACHER || user.role === UserRole.ADMIN)
              ? () => setForcedView('TEACHER')
              : undefined
          }
        />
      ) : (
        <TeacherView
          currentMode={philosophyMode}
          language={language}
          user={user}
          onLogout={logout}
          onLanguageChange={handleLanguageChange}
          onModeChange={setPhilosophyMode}
          onSwitchToStudent={() => setForcedView('STUDENT')}
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;