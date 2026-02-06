
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading Skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-[#1e2330] animate-pulse flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
        </div>
      )}
      
      {/* Actual Image */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-700 ${
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        {...props}
      />

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 bg-[#1a1f2e] flex items-center justify-center border border-white/10">
          <span className="text-[10px] text-red-400 uppercase tracking-widest">Img Error</span>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
