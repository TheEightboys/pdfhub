/**
 * GSAP Animation Hooks
 * Professional, subtle animations for MNC-quality UI
 */

import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

/**
 * Stagger reveal animation for multiple elements
 */
export function useStaggerReveal(
    selector: string,
    options: {
        stagger?: number;
        duration?: number;
        y?: number;
        delay?: number;
    } = {}
) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const elements = containerRef.current.querySelectorAll(selector);
        if (elements.length === 0) return;

        gsap.fromTo(
            elements,
            {
                opacity: 0,
                y: options.y ?? 30,
            },
            {
                opacity: 1,
                y: 0,
                duration: options.duration ?? 0.5,
                stagger: options.stagger ?? 0.08,
                delay: options.delay ?? 0.1,
                ease: 'power2.out',
            }
        );

        return () => {
            gsap.killTweensOf(elements);
        };
    }, [selector, options.stagger, options.duration, options.y, options.delay]);

    return containerRef;
}

/**
 * Fade in animation for a single element
 */
export function useFadeIn(delay: number = 0) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        gsap.fromTo(
            ref.current,
            { opacity: 0, y: 20 },
            {
                opacity: 1,
                y: 0,
                duration: 0.5,
                delay,
                ease: 'power2.out',
            }
        );

        return () => {
            if (ref.current) {
                gsap.killTweensOf(ref.current);
            }
        };
    }, [delay]);

    return ref;
}

/**
 * Scale animation on hover
 */
export function useHoverScale(scale: number = 1.02) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const element = ref.current;

        const handleEnter = () => {
            gsap.to(element, {
                scale,
                duration: 0.25,
                ease: 'power2.out',
            });
        };

        const handleLeave = () => {
            gsap.to(element, {
                scale: 1,
                duration: 0.25,
                ease: 'power2.out',
            });
        };

        element.addEventListener('mouseenter', handleEnter);
        element.addEventListener('mouseleave', handleLeave);

        return () => {
            element.removeEventListener('mouseenter', handleEnter);
            element.removeEventListener('mouseleave', handleLeave);
            gsap.killTweensOf(element);
        };
    }, [scale]);

    return ref;
}

/**
 * Animate tool cards with stagger effect
 */
export function useToolCardAnimation() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const cards = containerRef.current.querySelectorAll('.tool-card');

        gsap.fromTo(
            cards,
            {
                opacity: 0,
                y: 40,
                scale: 0.95,
            },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.5,
                stagger: 0.06,
                ease: 'power3.out',
            }
        );

        return () => {
            gsap.killTweensOf(cards);
        };
    }, []);

    return containerRef;
}

/**
 * Animate category change with smooth transition
 */
export function useCategoryTransition() {
    const animate = useCallback((container: HTMLElement, direction: 'left' | 'right' = 'right') => {
        const cards = container.querySelectorAll('.tool-card');

        // Exit animation
        gsap.to(cards, {
            opacity: 0,
            x: direction === 'right' ? -20 : 20,
            duration: 0.2,
            stagger: 0.02,
            ease: 'power2.in',
            onComplete: () => {
                // Entry animation after content update
                gsap.fromTo(
                    cards,
                    {
                        opacity: 0,
                        x: direction === 'right' ? 20 : -20,
                    },
                    {
                        opacity: 1,
                        x: 0,
                        duration: 0.3,
                        stagger: 0.04,
                        ease: 'power2.out',
                    }
                );
            },
        });
    }, []);

    return animate;
}

/**
 * Dropzone animation for drag states
 */
export function useDropzoneAnimation() {
    const ref = useRef<HTMLDivElement>(null);

    const animateDragOver = useCallback(() => {
        if (!ref.current) return;
        gsap.to(ref.current, {
            scale: 1.02,
            borderColor: 'var(--color-primary-500)',
            duration: 0.3,
            ease: 'power2.out',
        });
    }, []);

    const animateDragLeave = useCallback(() => {
        if (!ref.current) return;
        gsap.to(ref.current, {
            scale: 1,
            borderColor: 'var(--border-light)',
            duration: 0.3,
            ease: 'power2.out',
        });
    }, []);

    const animateDrop = useCallback(() => {
        if (!ref.current) return;
        gsap.fromTo(
            ref.current,
            { scale: 1.02 },
            {
                scale: 1,
                duration: 0.4,
                ease: 'elastic.out(1, 0.5)',
            }
        );
    }, []);

    return { ref, animateDragOver, animateDragLeave, animateDrop };
}
