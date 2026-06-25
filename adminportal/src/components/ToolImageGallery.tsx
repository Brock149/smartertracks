import { useEffect, useState } from 'react';
import { fetchToolImages } from '../lib/uploadImage';

export function ToolImageGallery({ toolId }: { toolId: string }) {
  const [images, setImages] = useState<Array<{ id: string; image_url: string; thumb_url?: string | null }>>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (toolId) {
      fetchToolImages(toolId).then(setImages);
    }
  }, [toolId]);

  if (!toolId) return <span className="text-gray-500">No image uploaded</span>;
  if (images.length === 0) return <span className="text-gray-500">No image uploaded</span>;

  const closePreview = () => setSelectedIdx(null);
  const nextImg = () => setSelectedIdx((prev) => (prev! + 1) % images.length);
  const prevImg = () => setSelectedIdx((prev) => (prev! - 1 + images.length) % images.length);

  const getThumbSrc = (img: { image_url: string; thumb_url?: string | null }) => {
    const base = img.thumb_url || img.image_url;
    if (!base) return '';
    const joiner = base.includes('?') ? '&' : '?';
    return `${base}${joiner}width=64&quality=50&format=webp`;
  };

  const MAX_THUMBS = 3;
  const visibleImages = images.slice(0, MAX_THUMBS);
  const remainingCount = images.length - visibleImages.length;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {visibleImages.map((img, idx) => (
          <img
            key={img.id}
            src={getThumbSrc(img)}
            alt="Tool"
            className="w-12 h-12 object-cover rounded cursor-pointer border"
            onClick={() => { setSelectedIdx(idx); setImgError(false); }}
            onError={() => setImgError(true)}
          />
        ))}
        {remainingCount > 0 && (
          <button
            type="button"
            onClick={() => { setSelectedIdx(0); setImgError(false); }}
            className="text-xs text-gray-600 border rounded px-2 py-1 hover:bg-gray-50"
          >
            +{remainingCount} more
          </button>
        )}
      </div>

      {selectedIdx !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-2xl w-full relative flex items-center">
            {/* Close Button */}
            <button
              onClick={closePreview}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              aria-label="Close"
            >
              ×
            </button>

            {/* Prev Arrow */}
            {images.length > 1 && (
              <button
                onClick={prevImg}
                className="text-6xl font-bold text-white bg-gray-800 bg-opacity-70 hover:bg-opacity-90 rounded-full p-2 mx-4 select-none"
                aria-label="Previous"
              >
                ‹
              </button>
            )}

            {/* Image */}
            <div className="mx-auto max-h-[80vh] overflow-hidden flex flex-col items-center">
              {!imgError ? (
                <img
                  src={images[selectedIdx].image_url}
                  alt="Tool Preview"
                  className="max-h-[72vh] w-auto rounded-lg"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                  <span className="text-red-500 text-lg">Image failed to load.</span>
                </div>
              )}
              <a
                href={images[selectedIdx].image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5m0 0v5m0-5L10 14M9 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-3" />
                </svg>
                View fullscreen (new tab)
              </a>
            </div>

            {/* Next Arrow */}
            {images.length > 1 && (
              <button
                onClick={nextImg}
                className="text-6xl font-bold text-white bg-gray-800 bg-opacity-70 hover:bg-opacity-90 rounded-full p-2 mx-4 select-none"
                aria-label="Next"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
} 