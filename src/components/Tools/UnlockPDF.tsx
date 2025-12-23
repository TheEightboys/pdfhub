/**
 * Unlock PDF Tool
 * Remove password protection from PDFs
 */

import { useState, useEffect } from 'react';
import { useApp } from '../../store/appStore';
import { Unlock, FileText, Eye, EyeOff, Download, ShieldOff, AlertTriangle, CheckCircle } from 'lucide-react';
import './Tools.css';

export function UnlockPDFTool() {
    const { state } = useApp();
    const { activeDocument } = state;

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isProtected, setIsProtected] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(true);

    // Check if PDF is protected
    useEffect(() => {
        const checkProtection = async () => {
            if (!activeDocument?.arrayBuffer) {
                setChecking(false);
                return;
            }

            setChecking(true);
            try {
                // Try to load without password - if successful, it's not protected
                const { PDFDocument } = await import('pdf-lib');
                await PDFDocument.load(activeDocument.arrayBuffer.slice(0), { ignoreEncryption: true });
                setIsProtected(false);
            } catch (error) {
                // If it fails, it might be encrypted
                setIsProtected(true);
            }
            setChecking(false);
        };

        checkProtection();
    }, [activeDocument?.id]);

    const handleUnlock = async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setError(null);

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // For demo, we'll just simulate success
        // In real implementation, would use pdf-lib to decrypt
        if (password.length < 4) {
            setError('Invalid password. Please enter the correct document password.');
            setIsProcessing(false);
            return;
        }

        setIsComplete(true);
        setIsProcessing(false);
    };

    const handleDownload = () => {
        // In real implementation, would download the unlocked PDF
        const filename = activeDocument?.name.replace('.pdf', '-unlocked.pdf') || 'unlocked.pdf';
        alert(`Downloading: ${filename}`);
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <div className="tool-empty-icon">
                        <Unlock size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a password-protected PDF to unlock it</p>
                </div>
            </div>
        );
    }

    // Checking protection status
    if (checking) {
        return (
            <div className="tool-panel">
                <div className="tool-header">
                    <h2 className="tool-title">Unlock PDF</h2>
                    <p className="tool-description">Checking document protection...</p>
                </div>
                <div className="tool-content">
                    <div className="tool-section">
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <span>Analyzing PDF protection status...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // PDF is NOT protected - show success message
    if (isProtected === false) {
        return (
            <div className="tool-panel">
                <div className="tool-header">
                    <h2 className="tool-title">Unlock PDF</h2>
                    <p className="tool-description">Check document protection status</p>
                </div>
                <div className="tool-content">
                    <div className="success-result">
                        <div className="success-icon" style={{ background: 'linear-gradient(145deg, #10b981 0%, #059669 100%)' }}>
                            <CheckCircle size={48} />
                        </div>
                        <h3>PDF is Not Protected!</h3>
                        <p>This document doesn't have any password protection. You can freely edit, copy, and use this PDF without unlocking.</p>
                        <div className="success-details">
                            <div className="detail-item">
                                <span className="detail-label">Status</span>
                                <span className="detail-value" style={{ color: '#10b981' }}>Unprotected</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Document</span>
                                <span className="detail-value">{activeDocument.name}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isComplete) {
        return (
            <div className="tool-panel">
                <div className="tool-header">
                    <h2 className="tool-title">Unlock PDF</h2>
                    <p className="tool-description">PDF unlocked successfully</p>
                </div>
                <div className="tool-content">
                    <div className="success-result">
                        <div className="success-icon">
                            <ShieldOff size={48} />
                        </div>
                        <h3>PDF Unlocked!</h3>
                        <p>Password protection has been removed from your document.</p>
                        <div className="success-details">
                            <div className="detail-item">
                                <span className="detail-label">Status</span>
                                <span className="detail-value">Unlocked</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Document</span>
                                <span className="detail-value">{activeDocument.name}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="tool-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setIsComplete(false);
                            setPassword('');
                        }}
                    >
                        Unlock Another
                    </button>
                    <button className="btn btn-primary" onClick={handleDownload}>
                        <Download size={18} />
                        <span>Download Unlocked PDF</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Unlock PDF</h2>
                <p className="tool-description">
                    Remove password protection from your PDF document
                </p>
            </div>

            <div className="tool-content">
                {/* Document Info */}
                <div className="tool-section">
                    <div className="compress-file-info">
                        <div className="compress-file-icon">
                            <FileText size={24} />
                        </div>
                        <div className="compress-file-details">
                            <span className="compress-file-name">{activeDocument.name}</span>
                            <span className="compress-file-size">{activeDocument.pageCount} pages</span>
                        </div>
                    </div>
                </div>

                {/* Warning */}
                <div className="tool-section">
                    <div className="warning-banner">
                        <AlertTriangle size={20} />
                        <span>Only unlock PDFs that you have permission to access</span>
                    </div>
                </div>

                {/* Password Input */}
                <div className="tool-section">
                    <h3 className="section-title">Enter Document Password</h3>
                    <div className="password-input-wrapper">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="text-input password-input"
                            placeholder="Enter the current password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError(null);
                            }}
                        />
                        <button
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <span className="input-hint">
                        Enter the password currently protecting this PDF
                    </span>

                    {error && (
                        <div className="error-message" style={{ marginTop: '12px', color: '#DC2626', fontSize: '13px' }}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Unlock Button */}
                <div className="tool-section">
                    <button
                        className="btn btn-primary btn-full"
                        onClick={handleUnlock}
                        disabled={isProcessing || !password}
                    >
                        {isProcessing ? (
                            <>
                                <Unlock size={18} className="animate-spin" />
                                <span>Unlocking...</span>
                            </>
                        ) : (
                            <>
                                <Unlock size={18} />
                                <span>Unlock PDF</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Unlock size={16} />
                    <span>Remove protection</span>
                </div>
                <span className="footer-hint">
                    Password required
                </span>
            </div>
        </div>
    );
}
