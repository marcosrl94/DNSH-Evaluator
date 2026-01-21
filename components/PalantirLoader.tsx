import React from 'react';

interface PalantirLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'default' | 'minimal';
}

const PalantirLoader: React.FC<PalantirLoaderProps> = ({ 
  size = 'md', 
  text,
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (variant === 'minimal') {
    return (
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className={`${sizeClasses[size]} relative`}>
          {/* Outer ring */}
          <div className={`absolute inset-0 ${sizeClasses[size]} border-2 border-[#00ff88]/20 rounded-full`}></div>
          {/* Rotating ring */}
          <div className={`absolute inset-0 ${sizeClasses[size]} border-2 border-transparent border-t-[#00ff88] rounded-full animate-spin`} style={{ animationDuration: '0.8s' }}></div>
          {/* Inner pulse */}
          <div className={`absolute inset-1 ${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-4 h-4' : 'w-6 h-6'} bg-[#00ff88]/30 rounded-full animate-pulse`}></div>
        </div>
        {text && (
          <p className={`${textSizeClasses[size]} font-mono uppercase tracking-wider text-[#00ff88] animate-pulse`}>
            {text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Main loader */}
      <div className={`${sizeClasses[size]} relative`}>
        {/* Grid background effect */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full border border-[#00ff88]/30" style={{
            backgroundImage: `
              linear-gradient(#00ff88 1px, transparent 1px),
              linear-gradient(90deg, #00ff88 1px, transparent 1px)
            `,
            backgroundSize: '4px 4px'
          }}></div>
        </div>
        
        {/* Outer rotating ring */}
        <div className={`absolute inset-0 ${sizeClasses[size]} border-2 border-[#00ff88]/20 rounded-full`}></div>
        <div 
          className={`absolute inset-0 ${sizeClasses[size]} border-2 border-transparent border-t-[#00ff88] rounded-full animate-spin`}
          style={{ animationDuration: '1s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
        ></div>
        
        {/* Middle ring (counter-rotate) */}
        <div 
          className={`absolute inset-1 ${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-4 h-4' : 'w-6 h-6'} border-2 border-transparent border-r-[#00a8ff] rounded-full animate-spin`}
          style={{ animationDuration: '0.6s', animationDirection: 'reverse', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
        ></div>
        
        {/* Inner pulse */}
        <div 
          className={`absolute inset-2 ${size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'} bg-[#00ff88] rounded-full animate-pulse`}
          style={{ animationDuration: '1.5s' }}
        ></div>
      </div>

      {/* Text */}
      {text && (
        <div className="text-center">
          <p className={`${textSizeClasses[size]} font-mono uppercase tracking-wider text-[#00ff88]`}>
            {text.split('').map((char, idx) => (
              <span
                key={idx}
                className="inline-block animate-pulse"
                style={{
                  animationDelay: `${idx * 0.1}s`,
                  animationDuration: '1.5s'
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </p>
          {/* Progress dots */}
          <div className="flex items-center justify-center space-x-1 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 bg-[#00ff88] rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s'
                }}
              ></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PalantirLoader;
