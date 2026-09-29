
import Onboarding from '@/src/splash_screens/scroll_splash';
import SplashScreen from '@/src/splash_screens/static_splash';
import React, { useEffect, useState } from 'react';
// import Dashboard from '../dashboard/dashboard';



export default function TabLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen/>;
  }

  return <Onboarding/>;
  
}
