import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, Github } from 'lucide-react';
import { useApp } from '../../store/appStore';
import './AuthModal.css';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { login } = useApp();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            const user = {
                id: `user-${Date.now()}`,
                name: isLogin ? (formData.email.split('@')[0] || 'User') : formData.name,
                email: formData.email,
                plan: 'free' as const,
                avatarUrl: `https://ui-avatars.com/api/?name=${isLogin ? formData.email : formData.name}&background=0D8ABC&color=fff`,
            };
            login(user);
            setIsLoading(false);
            onClose();
        }, 1500);
    };

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}><X size={20} /></button>

                <div className="auth-header">
                    <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p>{isLogin ? 'Enter your details to access your account' : 'Start your free trial today'}</p>
                </div>

                <div className="auth-tabs">
                    <button
                        className={`tab-btn ${isLogin ? 'active' : ''}`}
                        onClick={() => setIsLogin(true)}
                    >
                        Login
                    </button>
                    <button
                        className={`tab-btn ${!isLogin ? 'active' : ''}`}
                        onClick={() => setIsLogin(false)}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="form-group">
                            <div className="input-icon"><User size={18} /></div>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <div className="input-icon"><Mail size={18} /></div>
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <div className="input-icon"><Lock size={18} /></div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <button type="submit" className="submit-btn" disabled={isLoading}>
                        {isLoading ? (
                            <div className="spinner-sm white"></div>
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Create Account'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>

                    <div className="divider"><span>OR</span></div>

                    <button type="button" className="social-btn">
                        <Github size={18} />
                        Continue with GitHub
                    </button>
                </form>

                <div className="auth-footer">
                    {isLogin ? (
                        <p>Don't have an account? <button onClick={() => setIsLogin(false)}>Sign up</button></p>
                    ) : (
                        <p>Already have an account? <button onClick={() => setIsLogin(true)}>Login</button></p>
                    )}
                </div>
            </div>
        </div>
    );
}
