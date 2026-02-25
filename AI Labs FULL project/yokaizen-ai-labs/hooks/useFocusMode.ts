import { useState, useEffect } from 'react';

export const useFocusMode = () => {
    const [focusMode, setFocusModeState] = useState<boolean>(() => {
        return localStorage.getItem('yokaizen_focus_mode') === 'true';
    });

    const setFocusMode = (value: boolean) => {
        localStorage.setItem('yokaizen_focus_mode', String(value));
        setFocusModeState(value);
        window.dispatchEvent(new Event('focusModeChanged'));
    };

    useEffect(() => {
        const handleStorageChange = () => {
            setFocusModeState(localStorage.getItem('yokaizen_focus_mode') === 'true');
        };

        window.addEventListener('focusModeChanged', handleStorageChange);
        return () => window.removeEventListener('focusModeChanged', handleStorageChange);
    }, []);

    return { focusMode, setFocusMode };
};
