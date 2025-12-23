import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { Globe } from 'lucide-react';

export function AITranslateTool() {
    const { state } = useApp();
    const { activeDocument } = state;
    const [language, setLanguage] = useState('es');
    const [isTranslating, setIsTranslating] = useState(false);
    const [result, setResult] = useState('');

    const handleTranslate = () => {
        setIsTranslating(true);
        setTimeout(() => {
            setResult(`[Translated content to ${language.toUpperCase()}]\n\nLorem ipsum dolor sit amet...`);
            setIsTranslating(false);
        }, 2000);
    };

    if (!activeDocument) return null;

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">AI Translate</h2>
                <p className="tool-description">Translate document content to another language.</p>
            </div>

            <div className="tool-content">
                <div className="tool-section">
                    <label className="section-title">Target Language</label>
                    <select
                        className="form-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    >
                        <option value="es">Spanish (Español)</option>
                        <option value="fr">French (Français)</option>
                        <option value="de">German (Deutsch)</option>
                        <option value="it">Italian (Italiano)</option>
                        <option value="pt">Portuguese (Português)</option>
                        <option value="zh">Chinese (中文)</option>
                        <option value="ja">Japanese (日本語)</option>
                        <option value="ko">Korean (한국어)</option>
                        <option value="ru">Russian (Русский)</option>
                        <option value="hi">Hindi (हिन्दी)</option>
                    </select>
                </div>

                {result && (
                    <div className="tool-section">
                        <label className="section-title">Preview</label>
                        <div className="translation-preview">
                            <pre>{result}</pre>
                        </div>
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleTranslate}
                    disabled={isTranslating}
                >
                    {isTranslating ? (
                        <>Translating...</>
                    ) : (
                        <>
                            <Globe size={18} />
                            Translate Document
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
