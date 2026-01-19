/**
 * Password Protect Tool
 * Real PDF encryption using pdf-encrypt-lite
 */

import { useState } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { Lock, FileText, Eye, EyeOff, Shield, ShieldCheck, Download, Loader2 } from 'lucide-react';
import './Tools.css';

export function PasswordProtectTool() {
    const { state } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [userPassword, setUserPassword] = useState('');
    const [ownerPassword, setOwnerPassword] = useState('');
    const [showUserPassword, setShowUserPassword] = useState(false);
    const [showOwnerPassword, setShowOwnerPassword] = useState(false);
    const [encryptedPdfBytes, setEncryptedPdfBytes] = useState<Uint8Array | null>(null);
    const [permissions, setPermissions] = useState({
        printing: true,
        copying: false,
        modifying: false,
        annotating: true,
        formFilling: true,
    });

    const handleProtect = async () => {
        if (!activeDocument || !userPassword) return;

        setIsProcessing(true);

        try {
            // Dynamically import the encryption library
            const { PDFDocument } = await import('pdf-lib');
            const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt-lite');

            // Load the PDF
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));

            // Get PDF bytes
            const pdfBytes = await pdfDoc.save();

            // Encrypt the PDF (API: encryptPDF(bytes, userPassword, ownerPassword?))
            const encrypted = await encryptPDF(
                new Uint8Array(pdfBytes),
                userPassword,
                ownerPassword || null
            );

            setEncryptedPdfBytes(encrypted);
            setIsComplete(true);
            
            addToast({
                type: 'success',
                title: 'PDF Encrypted!',
                message: 'Your document is now protected with a password.',
            });
        } catch (error) {
            console.error('Encryption failed:', error);
            addToast({
                type: 'error',
                title: 'Encryption Failed',
                message: 'Could not encrypt the PDF. Please try again.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!encryptedPdfBytes) return;

        const blob = new Blob([encryptedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeDocument?.name.replace('.pdf', '-protected.pdf') || 'protected.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const togglePermission = (key: keyof typeof permissions) => {
        setPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const getPasswordStrength = (password: string) => {
        if (password.length === 0) return { label: '', color: '' };
        if (password.length < 6) return { label: 'Weak', color: '#DC2626' };
        if (password.length < 10) return { label: 'Medium', color: '#F59E0B' };
        if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
            return { label: 'Strong', color: '#10B981' };
        }
        return { label: 'Good', color: '#F59E0B' };
    };

    const strength = getPasswordStrength(userPassword);

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <div className="tool-empty-icon">
                        <Lock size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF file to add password protection</p>
                </div>
            </div>
        );
    }

    if (isComplete && encryptedPdfBytes) {
        return (
            <div className="tool-panel">
                <div className="tool-header">
                    <h2 className="tool-title">Password Protect</h2>
                    <p className="tool-description">Your PDF has been encrypted successfully</p>
                </div>

                <div className="tool-content">
                    <div className="success-result">
                        <div className="success-icon">
                            <ShieldCheck size={48} />
                        </div>
                        <h3>PDF Protected!</h3>
                        <p>Your document is now encrypted with password protection.</p>

                        <div className="success-details">
                            <div className="detail-item">
                                <span className="detail-label">Encryption</span>
                                <span className="detail-value">RC4 128-bit</span>
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
                            setUserPassword('');
                            setOwnerPassword('');
                            setEncryptedPdfBytes(null);
                        }}
                    >
                        Protect Another
                    </button>
                    <button className="btn btn-primary" onClick={handleDownload}>
                        <Download size={18} />
                        <span>Download Protected PDF</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Password Protect</h2>
                <p className="tool-description">
                    Encrypt your PDF with a password to restrict access
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

                {/* User Password */}
                <div className="tool-section">
                    <h3 className="section-title">Document Password (Required)</h3>
                    <div className="password-input-wrapper">
                        <input
                            type={showUserPassword ? 'text' : 'password'}
                            className="text-input password-input"
                            placeholder="Enter password to open document"
                            value={userPassword}
                            onChange={(e) => setUserPassword(e.target.value)}
                        />
                        <button
                            className="password-toggle"
                            onClick={() => setShowUserPassword(!showUserPassword)}
                        >
                            {showUserPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {strength.label && (
                        <div className="password-strength">
                            <div
                                className="strength-bar"
                                style={{
                                    width: strength.label === 'Weak' ? '33%' :
                                        strength.label === 'Medium' || strength.label === 'Good' ? '66%' : '100%',
                                    backgroundColor: strength.color
                                }}
                            />
                            <span className="strength-label" style={{ color: strength.color }}>
                                {strength.label}
                            </span>
                        </div>
                    )}
                    <span className="input-hint">
                        Users will need this password to open the PDF
                    </span>
                </div>

                {/* Owner Password */}
                <div className="tool-section">
                    <h3 className="section-title">Owner Password (Optional)</h3>
                    <div className="password-input-wrapper">
                        <input
                            type={showOwnerPassword ? 'text' : 'password'}
                            className="text-input password-input"
                            placeholder="Set a different owner password"
                            value={ownerPassword}
                            onChange={(e) => setOwnerPassword(e.target.value)}
                        />
                        <button
                            className="password-toggle"
                            onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                        >
                            {showOwnerPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <span className="input-hint">
                        Owner password allows changing permissions and removing protection
                    </span>
                </div>

                {/* Permissions */}
                <div className="tool-section">
                    <h3 className="section-title">Document Permissions</h3>
                    <div className="permissions-list">
                        <label className="checkbox-option-inline">
                            <input
                                type="checkbox"
                                checked={permissions.printing}
                                onChange={() => togglePermission('printing')}
                            />
                            <span>Allow printing</span>
                        </label>
                        <label className="checkbox-option-inline">
                            <input
                                type="checkbox"
                                checked={permissions.copying}
                                onChange={() => togglePermission('copying')}
                            />
                            <span>Allow copying text</span>
                        </label>
                        <label className="checkbox-option-inline">
                            <input
                                type="checkbox"
                                checked={permissions.modifying}
                                onChange={() => togglePermission('modifying')}
                            />
                            <span>Allow modifying</span>
                        </label>
                        <label className="checkbox-option-inline">
                            <input
                                type="checkbox"
                                checked={permissions.annotating}
                                onChange={() => togglePermission('annotating')}
                            />
                            <span>Allow annotating</span>
                        </label>
                        <label className="checkbox-option-inline">
                            <input
                                type="checkbox"
                                checked={permissions.formFilling}
                                onChange={() => togglePermission('formFilling')}
                            />
                            <span>Allow form filling</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Shield size={16} />
                    <span>RC4 128-bit Encryption</span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleProtect}
                    disabled={isProcessing || !userPassword}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Encrypting...</span>
                        </>
                    ) : (
                        <>
                            <Lock size={18} />
                            <span>Protect PDF</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
