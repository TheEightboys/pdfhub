/**
 * Welcome Screen - Clean Minimal Design
 * Inspired by modern PDF editor landing pages
 * Adobe Red color palette, sharp solid colors
 */

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useApp } from '../../store/appStore';
import { Dropzone } from '../UI/Dropzone';
import { TOOLS, CATEGORIES } from '../Layout/Sidebar';
import { ToolId, ToolCategory } from '../../types';
import {
    Search, Shield, Zap, UserX,
    Combine, Scissors, RotateCw, Trash2, ArrowUpDown, Copy,
    FileOutput, Minimize2, Image, Camera, FileText, Table, Presentation, Code,
    Type, ImagePlus, Crop, Maximize2, Palette, Eraser, Highlighter, Underline,
    Strikethrough, Pencil, Shapes, PenLine, Stamp, StickyNote, MessageCircle,
    LockKeyhole, Unlock, EyeOff, ShieldCheck, Fingerprint, Droplets, Hash,
    FileStack, ScanText, FileSearch, Layers, Wrench, Bookmark, Link, Sparkles, Globe,
    ChevronRight
} from 'lucide-react';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
    onFileOpen: (files: File[]) => void;
}

// Tool icon mapping with solid colors
const TOOL_ICONS: Record<string, { bg: string; Icon: any }> = {
    'merge': { bg: '#dc2626', Icon: Combine },
    'split': { bg: '#dc2626', Icon: Scissors },
    'rotate': { bg: '#dc2626', Icon: RotateCw },
    'delete': { bg: '#dc2626', Icon: Trash2 },
    'reorder': { bg: '#dc2626', Icon: ArrowUpDown },
    'duplicate': { bg: '#dc2626', Icon: Copy },
    'extract': { bg: '#dc2626', Icon: FileOutput },
    'compress': { bg: '#16a34a', Icon: Minimize2 },
    'pdf-to-image': { bg: '#0891b2', Icon: Image },
    'image-to-pdf': { bg: '#0891b2', Icon: Camera },
    'pdf-to-word': { bg: '#2563eb', Icon: FileText },
    'pdf-to-excel': { bg: '#16a34a', Icon: Table },
    'pdf-to-ppt': { bg: '#ea580c', Icon: Presentation },
    'html-to-pdf': { bg: '#7c3aed', Icon: Code },
    'add-text': { bg: '#dc2626', Icon: Type },
    'add-image': { bg: '#dc2626', Icon: ImagePlus },
    'crop': { bg: '#dc2626', Icon: Crop },
    'resize': { bg: '#dc2626', Icon: Maximize2 },
    'background': { bg: '#dc2626', Icon: Palette },
    'erase': { bg: '#dc2626', Icon: Eraser },
    'highlight': { bg: '#eab308', Icon: Highlighter },
    'underline': { bg: '#eab308', Icon: Underline },
    'strikethrough': { bg: '#eab308', Icon: Strikethrough },
    'draw': { bg: '#7c3aed', Icon: Pencil },
    'shapes': { bg: '#7c3aed', Icon: Shapes },
    'signature': { bg: '#0891b2', Icon: PenLine },
    'stamp': { bg: '#dc2626', Icon: Stamp },
    'notes': { bg: '#eab308', Icon: StickyNote },
    'comments': { bg: '#2563eb', Icon: MessageCircle },
    'password-protect': { bg: '#1e40af', Icon: LockKeyhole },
    'unlock': { bg: '#16a34a', Icon: Unlock },
    'redact': { bg: '#374151', Icon: EyeOff },
    'sign': { bg: '#1e40af', Icon: Fingerprint },
    'permissions': { bg: '#16a34a', Icon: ShieldCheck },
    'watermark': { bg: '#0891b2', Icon: Droplets },
    'page-numbers': { bg: '#64748b', Icon: Hash },
    'header-footer': { bg: '#7c3aed', Icon: FileStack },
    'ocr': { bg: '#ea580c', Icon: ScanText },
    'metadata': { bg: '#7c3aed', Icon: FileSearch },
    'flatten': { bg: '#475569', Icon: Layers },
    'repair': { bg: '#f59e0b', Icon: Wrench },
    'bookmark': { bg: '#dc2626', Icon: Bookmark },
    'hyperlinks': { bg: '#2563eb', Icon: Link },
    'ai-summarize': { bg: '#8b5cf6', Icon: Sparkles },
    'ai-translate': { bg: '#0891b2', Icon: Globe },
};

// Popular tools for quick access
const POPULAR_TOOLS = [
    { id: 'merge', name: 'Merge PDF', desc: 'Combine multiple PDFs' },
    { id: 'split', name: 'Split PDF', desc: 'Extract pages from PDF' },
    { id: 'compress', name: 'Compress', desc: 'Reduce file size' },
    { id: 'pdf-to-word', name: 'PDF to Word', desc: 'Convert to DOCX' },
    { id: 'rotate', name: 'Rotate', desc: 'Rotate PDF pages' },
    { id: 'delete', name: 'Delete Pages', desc: 'Remove pages' },
    { id: 'add-text', name: 'Add Text', desc: 'Insert text to PDF' },
    { id: 'signature', name: 'Sign PDF', desc: 'Add your signature' },
];

export function WelcomeScreen({ onFileOpen }: WelcomeScreenProps) {
    const { setActiveTool } = useApp();
    const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter tools
    const filteredTools = TOOLS.filter(tool => {
        const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
        const matchesSearch = searchQuery === '' ||
            tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

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

            gsap.fromTo('.popular-tools',
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.4, delay: 0.35, ease: 'power2.out' }
            );

            gsap.fromTo('.all-tools-section',
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.4, delay: 0.45, ease: 'power2.out' }
            );
        }, containerRef);

        return () => ctx.revert();
    }, []);

    const handleToolClick = (toolId: ToolId) => {
        setActiveTool(toolId);
    };

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

            {/* Popular Tools / Seamless Workflows */}
            <section className="popular-tools">
                <h2 className="section-title">Seamless PDF workflows</h2>
                <p className="section-subtitle">
                    Our online editor in your browser offers a wide range of tools including merge, split, compress, and convert.
                </p>

                <div className="workflow-grid">
                    {POPULAR_TOOLS.map(tool => {
                        const iconData = TOOL_ICONS[tool.id] || { bg: '#dc2626', Icon: FileText };
                        return (
                            <button
                                key={tool.id}
                                className="workflow-card"
                                onClick={() => handleToolClick(tool.id as ToolId)}
                            >
                                <div className="workflow-icon" style={{ backgroundColor: iconData.bg }}>
                                    <iconData.Icon size={22} strokeWidth={1.8} color="#fff" />
                                </div>
                                <div className="workflow-info">
                                    <h3>{tool.name}</h3>
                                    <p>{tool.desc}</p>
                                </div>
                                <ChevronRight size={18} className="workflow-arrow" />
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* All Tools Section */}
            <section className="all-tools-section">
                <div className="tools-header">
                    <h2 className="tools-title">All PDF Tools</h2>

                    {/* Search Bar */}
                    <div className="tools-search">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search tools..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                {/* Category Filter */}
                <div className="category-filter">
                    <button
                        className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveCategory('all')}
                    >
                        All Tools
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            className={`filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Tools Grid */}
                <div className="tools-grid">
                    {filteredTools.map(tool => {
                        const iconData = TOOL_ICONS[tool.id] || { bg: '#dc2626', Icon: FileText };
                        return (
                            <button
                                key={tool.id}
                                className="tool-card"
                                onClick={() => handleToolClick(tool.id)}
                            >
                                <div className="tool-icon" style={{ backgroundColor: iconData.bg }}>
                                    <iconData.Icon size={24} strokeWidth={1.8} color="#fff" />
                                </div>
                                <h3 className="tool-name">{tool.name}</h3>
                                <p className="tool-desc">{tool.description}</p>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
