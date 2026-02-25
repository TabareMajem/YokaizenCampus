import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useFocusMode } from '../../hooks/useFocusMode';

export const FPSGrader = () => {
    const { focusMode, setFocusMode } = useFocusMode();
    const framesBelowThreshold = useRef(0);
    const totalFrames = useRef(0);
    const hasGraded = useRef(false);

    useFrame((state, delta) => {
        // Skip if already graded or if Focus Mode is already on
        if (hasGraded.current || focusMode) return;

        // Wait 2 seconds for initial load stutter to pass, then sample for 5 seconds
        if (state.clock.elapsedTime > 2 && state.clock.elapsedTime < 7) {
            totalFrames.current += 1;
            const fps = 1 / delta;

            if (fps < 35) {
                framesBelowThreshold.current += 1;
            }
        }

        // Evaluate after 7 seconds
        if (state.clock.elapsedTime >= 7 && !hasGraded.current) {
            hasGraded.current = true;
            const failRatio = framesBelowThreshold.current / (totalFrames.current || 1);

            // If more than 30% of frames were under 35fps, it's a low-end device
            if (failRatio > 0.3) {
                console.warn(`📉 FPS Auto-Grader: Poor performance detected (Failed frames: ${(failRatio * 100).toFixed(1)}%). Engaging Focus Mode.`);
                setFocusMode(true);
            }
        }
    });

    return null;
};
