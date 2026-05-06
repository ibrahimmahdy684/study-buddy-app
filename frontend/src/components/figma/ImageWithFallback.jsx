import { useState } from 'react'

export function ImageWithFallback({ src, alt, className, fallbackSrc, ...props }) {
  const [hasError, setHasError] = useState(false)

  const finalSrc = hasError ? fallbackSrc || src : src

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  )
}
