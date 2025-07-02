'use client';

import Image from 'next/image';
import { useState } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fallbackSrc?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  className?: string;
  onError?: (e: any) => void;
  onClick?: () => void;
}

const SafeImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  fallbackSrc = '/logo.png',
  style,
  priority = false,
  className,
  onError,
  onClick
}: SafeImageProps) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = (e: any) => {
    if (!hasError) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
    onError?.(e);
  };

  // 检查是否是static-file路径，需要unoptimized
  const isStaticFile = imgSrc.includes('/static-file/');

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      style={style}
      priority={priority}
      className={className}
      unoptimized={isStaticFile}
      onError={handleError}
      onClick={onClick}
    />
  );
};

export default SafeImage; 