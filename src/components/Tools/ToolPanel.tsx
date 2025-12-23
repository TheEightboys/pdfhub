/**
 * Tool Panel Container
 * Renders the active tool based on selection
 */

import { useApp } from '../../store/appStore';
import { MergePDFTool } from './MergePDF';
import { SplitPDFTool } from './SplitPDF';
import { RotatePagesTool } from './RotatePages';
import { DeletePagesTool } from './DeletePages';
import { CompressPDFTool } from './CompressPDF';
import { PDFToImagesTool } from './PDFToImages';
import { ImagesToPDFTool } from './ImagesToPDF';
import { WatermarkTool } from './WatermarkTool';
import { PageNumbersTool } from './PageNumbersTool';
import { PasswordProtectTool } from './PasswordProtect';
import { ExtractPagesTool } from './ExtractPages';
import { DuplicatePagesTool } from './DuplicatePages';
import { UnlockPDFTool } from './UnlockPDF';
import { SignatureTool } from './SignatureTool';
import { ReorderPagesTool } from './ReorderPages';
import { AddTextTool } from './AddTextTool';
import { RedactTool } from './RedactTool';
// Annotation tools
import { AddImageTool } from './AddImageTool';
import { HighlightTool } from './HighlightTool';
import { DrawTool } from './DrawTool';
import { ShapesTool } from './ShapesTool';
import { StampTool } from './StampTool';
import { StickyNotesTool } from './StickyNotesTool';
// Conversion tools
import { PDFToWordTool } from './PDFToWord';
import { PDFToExcelTool } from './PDFToExcel';
// Edit tools
import { CropPagesTool } from './CropPagesTool';
import { ResizePagesTool } from './ResizePagesTool';
import { PageBackgroundTool } from './PageBackgroundTool';
// Advanced tools
import { HeaderFooterTool } from './HeaderFooterTool';
import { EditMetadataTool } from './EditMetadataTool';
import { FlattenPDFTool } from './FlattenPDFTool';
import { RepairPDFTool } from './RepairPDFTool';
import { BookmarksTool } from './BookmarksTool';
import { HyperlinksTool } from './HyperlinksTool';
import { OCRTool } from './OCRTool';
import { AISummarizeTool } from './AISummarizeTool';
import { AITranslateTool } from './AITranslateTool';
import {
    X,
    Wrench,
} from 'lucide-react';
import './ToolPanel.css';


export function ToolPanel() {
    const { state, setActiveTool } = useApp();
    const { activeTool } = state;

    if (!activeTool) return null;

    const renderTool = () => {
        switch (activeTool) {
            // Organize Tools
            case 'merge':
                return <MergePDFTool />;
            case 'split':
                return <SplitPDFTool />;
            case 'rotate':
                return <RotatePagesTool />;
            case 'delete':
                return <DeletePagesTool />;
            case 'extract':
                return <ExtractPagesTool />;
            case 'reorder':
                return <ReorderPagesTool />;
            case 'duplicate':
                return <DuplicatePagesTool />;

            // Convert Tools
            case 'compress':
                return <CompressPDFTool />;
            case 'pdf-to-image':
                return <PDFToImagesTool />;
            case 'image-to-pdf':
                return <ImagesToPDFTool />;
            case 'pdf-to-word':
                return <PDFToWordTool />;
            case 'pdf-to-excel':
                return <PDFToExcelTool />;

            // Edit Tools
            case 'add-text':
                return <AddTextTool />;
            case 'add-image':
                return <AddImageTool />;
            case 'crop':
                return <CropPagesTool />;
            case 'resize':
                return <ResizePagesTool />;
            case 'background':
                return <PageBackgroundTool />;

            // Annotate Tools
            case 'highlight':
                return <HighlightTool />;
            case 'draw':
                return <DrawTool />;
            case 'shapes':
                return <ShapesTool />;
            case 'signature':
                return <SignatureTool />;
            case 'stamp':
                return <StampTool />;
            case 'notes':
                return <StickyNotesTool />;

            // Security Tools
            case 'password-protect':
                return <PasswordProtectTool />;
            case 'unlock':
                return <UnlockPDFTool />;
            case 'redact':
                return <RedactTool />;

            // Advanced Tools
            case 'watermark':
                return <WatermarkTool />;
            case 'page-numbers':
                return <PageNumbersTool />;
            case 'header-footer':
                return <HeaderFooterTool />;
            case 'metadata':
                return <EditMetadataTool />;
            case 'flatten':
                return <FlattenPDFTool />;
            case 'repair':
                return <RepairPDFTool />;
            case 'bookmark':
                return <BookmarksTool />;
            case 'hyperlinks':
                return <HyperlinksTool />;
            case 'ocr':
                return <OCRTool />;

            // AI Tools
            case 'ai-summarize':
                return <AISummarizeTool />;
            case 'ai-translate':
                return <AITranslateTool />;

            // Default - Coming Soon
            default:
                return (
                    <div className="tool-coming-soon">
                        <div className="tool-empty-icon">
                            <Wrench size={36} />
                        </div>
                        <h3>Coming Soon</h3>
                        <p>This tool is under development and will be available soon.</p>
                    </div>
                );
        }
    };

    return (
        <div className="tool-panel-container">
            <button
                className="tool-panel-close"
                onClick={() => setActiveTool(null)}
                title="Close tool"
            >
                <X size={20} />
            </button>
            {renderTool()}
        </div>
    );
}

// Coming Soon Component for tools not yet implemented
interface ComingSoonToolProps {
    title: string;
    icon: React.ReactNode;
    description: string;
}

function ComingSoonTool({ title, icon, description }: ComingSoonToolProps) {
    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">{title}</h2>
                <p className="tool-description">{description}</p>
            </div>
            <div className="tool-content">
                <div className="coming-soon-container">
                    <div className="tool-empty-icon">
                        {icon}
                    </div>
                    <h3>Coming Soon</h3>
                    <p>This powerful feature is currently in development.</p>
                    <div className="coming-soon-features">
                        <div className="feature-tag">Fast Processing</div>
                        <div className="feature-tag">High Quality</div>
                        <div className="feature-tag">100% Secure</div>
                    </div>
                </div>
            </div>
            <div className="tool-footer">
                <div className="tool-summary">
                    <Wrench size={16} />
                    <span>In Development</span>
                </div>
                <button className="btn btn-primary" disabled>
                    <Wrench size={18} />
                    <span>Coming Soon</span>
                </button>
            </div>
        </div>
    );
}
