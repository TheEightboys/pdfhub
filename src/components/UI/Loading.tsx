import React from 'react';
import './Loading.css';

interface LoadingProps {
    size?: 'small' | 'medium' | 'large';
    text?: string;
    progress?: number;
    variant?: 'spinner' | 'dots' | 'progress' | 'pulse';
}

const Loading: React.FC<LoadingProps> = ({ 
    size = 'medium', 
    text, 
    progress,
    variant = 'spinner'
}) => {
    const sizeMap = {
        small: 24,
        medium: 48,
        large: 72
    };

    const spinnerSize = sizeMap[size];
    const strokeWidth = size === 'small' ? 3 : size === 'medium' ? 4 : 5;
    const radius = (spinnerSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const renderSpinner = () => (
        <div className="loading-spinner" style={{ width: spinnerSize, height: spinnerSize }}>
            <svg viewBox={`0 0 ${spinnerSize} ${spinnerSize}`}>
                <circle
                    className="spinner-track"
                    cx={spinnerSize / 2}
                    cy={spinnerSize / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                />
                <circle
                    className="spinner-fill"
                    cx={spinnerSize / 2}
                    cy={spinnerSize / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * 0.75}
                />
            </svg>
        </div>
    );

    const renderDots = () => (
        <div className={`loading-dots loading-dots-${size}`}>
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
        </div>
    );

    const renderProgress = () => {
        const progressValue = progress ?? 0;
        const offset = circumference - (progressValue / 100) * circumference;
        
        return (
            <div className="loading-progress-ring" style={{ width: spinnerSize, height: spinnerSize }}>
                <svg viewBox={`0 0 ${spinnerSize} ${spinnerSize}`}>
                    <circle
                        className="progress-track"
                        cx={spinnerSize / 2}
                        cy={spinnerSize / 2}
                        r={radius}
                        strokeWidth={strokeWidth}
                    />
                    <circle
                        className="progress-fill"
                        cx={spinnerSize / 2}
                        cy={spinnerSize / 2}
                        r={radius}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                <span className="progress-value">{Math.round(progressValue)}%</span>
            </div>
        );
    };

    const renderPulse = () => (
        <div className={`loading-pulse loading-pulse-${size}`}>
            <span className="pulse-ring"></span>
            <span className="pulse-ring"></span>
            <span className="pulse-core"></span>
        </div>
    );

    const renderVariant = () => {
        switch (variant) {
            case 'dots':
                return renderDots();
            case 'progress':
                return renderProgress();
            case 'pulse':
                return renderPulse();
            default:
                return renderSpinner();
        }
    };

    return (
        <div className={`loading-container loading-${size}`}>
            {renderVariant()}
            {text && <p className="loading-text">{text}</p>}
        </div>
    );
};

export default Loading;
