/**
 * Header Component
 * Top navigation bar with branding, file actions, and theme toggle
 * Clean, humanized design
 */

import { useState } from 'react';
import { useApp, useToast } from '../../store/appStore';
import {
    FileText,
    Upload,
    Sun,
    Moon,
    Menu,
    X,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Undo2,
    Redo2,
    Save,
    HelpCircle,
    Grid3x3,
} from 'lucide-react';
import { downloadPDF, savePDFWithAnnotations } from '../../utils/pdfHelpers';
import { PDFSecurityScanner } from '../../utils/securityScanner';
import { ProductNavPopup } from '../UI/ProductNavPopup';

import './Header.css';

interface HeaderProps {
    onOpenFile: () => void;
}

export function Header({ onOpenFile }: HeaderProps) {
    const { state, toggleTheme, toggleSidebar, closeDocument } = useApp();
    const { addToast } = useToast();
    const { theme, activeDocument, sidebarCollapsed } = state;
    const [isProductNavOpen, setIsProductNavOpen] = useState(false);

    const handleCloseDocument = () => {
        if (activeDocument) {
            closeDocument(activeDocument.id);
            addToast({
                type: 'info',
                title: 'Document closed',
                message: 'Ready for a new file',
            });
        }
    };

    const handleDownload = async () => {
        if (!activeDocument) {
            addToast({
                type: 'warning',
                title: 'No document',
                message: 'Please open a PDF file first.',
            });
            return;
        }
        try {
            const bytes = await savePDFWithAnnotations(activeDocument);
            const newName = activeDocument.name.replace('.pdf', '_edited.pdf');
            downloadPDF(bytes, newName);
            addToast({
                type: 'success',
                title: 'Content Saved',
                duration: 1000
            });
        } catch (error) {
            addToast({
                type: 'error',
                title: 'Download failed',
                message: 'Could not download the document.',
            });
        }
    };
    
    // Get security status
    const securityRisk = activeDocument
        ? PDFSecurityScanner.getOverallRisk(activeDocument.securityStatus.threats)
        : 'safe';

    const getSecurityIcon = () => {
        switch (securityRisk) {
            case 'safe':
                return <ShieldCheck className="security-icon security-safe" />;
            case 'low':
                return <Shield className="security-icon security-low" />;
            case 'medium':
            case 'high':
            case 'critical':
                return <ShieldAlert className="security-icon security-warning" />;
            default:
                return <Shield className="security-icon" />;
        }
    };

    return (
        <header className="header">
            <div className="header-left">
                <button
                    className="header-menu-btn"
                    onClick={toggleSidebar}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
                </button>

                <div className="header-brand">
                    <div className="header-logo">
                        <img src="/logo-white.svg" alt="PDF Editor Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                    </div>
                    <div className="header-brand-text">
                        <span className="header-title">PDF Editor</span>
                        <span className="header-subtitle">Free & Secure</span>
                    </div>
                </div>
            </div>

            <div className="header-center">
                {activeDocument && (
                    <div className="header-document-info">
                        <FileText size={16} className="doc-icon" />
                        <span className="header-document-name" title={activeDocument.name}>
                            {activeDocument.name}
                        </span>
                        <div className="header-save-status">
                             {state.saveStatus === 'saving' && <span className="status-saving">Saving...</span>}
                             {state.saveStatus === 'saved' && <span className="status-saved">Saved</span>}
                             {state.saveStatus === 'unsaved' && <span className="status-unsaved">Unsaved changes</span>}
                        </div>
                        <span className="header-document-pages">
                            {activeDocument.pageCount} page{activeDocument.pageCount !== 1 ? 's' : ''}
                        </span>
                        <div className="header-security-badge" title={PDFSecurityScanner.getRiskMessage(securityRisk)}>
                            {getSecurityIcon()}
                        </div>
                        <button
                            className="header-close-btn"
                            onClick={handleCloseDocument}
                            title="Close document"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>

            <div className="header-right">
                <div className="header-actions">
                    <button className="header-action-btn" onClick={onOpenFile} title="Open PDF (Ctrl+O)">
                        <Upload size={18} />
                        <span>Open</span>
                    </button>

                    <button
                        className="header-action-btn primary"
                        onClick={handleDownload}
                        disabled={!activeDocument}
                        title="Save Changes (Burn Annotations)"
                    >
                        <Save size={18} />
                        <span>Save</span>
                    </button>


                </div>

                <div className="header-divider" />

                <div className="header-tools">
                    <button className="header-icon-btn" disabled title="Undo (Ctrl+Z)">
                        <Undo2 size={18} />
                    </button>
                    <button className="header-icon-btn" disabled title="Redo (Ctrl+Y)">
                        <Redo2 size={18} />
                    </button>
                </div>

                <div className="header-divider" />

                <div className="header-utilities">
                    <button 
                        className="header-icon-btn" 
                        onClick={() => setIsProductNavOpen(true)}
                        title="Famral Products"
                    >
                        <Grid3x3 size={18} />
                    </button>
                    <button className="header-icon-btn" title="Help">
                        <HelpCircle size={18} />
                    </button>
                    <button
                        className="header-theme-btn"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                </div>
            </div>

            {/* Product Navigation Popup */}
            <ProductNavPopup isOpen={isProductNavOpen} onClose={() => setIsProductNavOpen(false)} />
        </header>
    );
}
