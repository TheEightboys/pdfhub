/**
 * Welcome Screen - Clean Minimal Design
 * Inspired by modern PDF editor landing pages
 * Adobe Red color palette, sharp solid colors
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Dropzone } from '../UI/Dropzone';
import { Shield, Zap, UserX } from 'lucide-react';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
    onFileOpen: (files: File[]) => void;
}

export function WelcomeScreen({ onFileOpen }: WelcomeScreenProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Entrance animations
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.hero-section',
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
            );

            gsap.fromTo('.upload-container',
                { opacity: 0, scale: 0.98 },
                { opacity: 1, scale: 1, duration: 0.4, delay: 0.15, ease: 'power2.out' }
            );

            gsap.fromTo('.trust-indicators',
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.4, delay: 0.25, ease: 'power2.out' }
            );
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div className="welcome-screen" ref={containerRef}>
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Edit your PDF in seconds.
                    </h1>
                    <p className="hero-subtitle">
                        Free, secure, and easy to use. No registration required.
                    </p>

                    {/* Upload Container */}
                    <div className="upload-container">
                        <Dropzone
                            onFilesAccepted={onFileOpen}
                            accept=".pdf"
                            multiple={false}
                            label="Select PDF Files"
                            hint="or drop PDFs here"
                        />
                    </div>

                    {/* Trust Indicators */}
                    <div className="trust-indicators">
                        <div className="trust-item">
                            <Zap size={18} />
                            <span>100% Free</span>
                        </div>
                        <div className="trust-item">
                            <Shield size={18} />
                            <span>Secure & Private</span>
                        </div>
                        <div className="trust-item">
                            <UserX size={18} />
                            <span>No Sign-up</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

