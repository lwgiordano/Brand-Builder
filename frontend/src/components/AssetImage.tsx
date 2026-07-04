import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import type { SyntheticEvent } from "react";

type AssetImageProps = {
  src: string;
  alt: string;
  className?: string;
};

export function AssetImage({ src, alt, className = "" }: AssetImageProps) {
  const [failed, setFailed] = useState(false);

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      setFailed(true);
    }
  }

  if (failed) {
    return (
      <span className={`${className} asset-image-fallback`} aria-label={alt || "Image preview unavailable"}>
        <ImageIcon size={16} />
      </span>
    );
  }

  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} onLoad={handleLoad} />;
}
