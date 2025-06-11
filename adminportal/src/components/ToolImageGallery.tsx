import { useEffect, useState } from 'react';
import { fetchToolImages } from '../lib/uploadImage';

export function ToolImageGallery({ toolId }: { toolId: string }) {
  const [images, setImages] = useState<Array<{ id: string; image_url: string }>>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (toolId) {
      fetchToolImages(toolId).then(setImages);
    }
  }, [toolId]);

  if (!toolId) return <span className="text-gray-500">No image uploaded</span>;
  if (images.length === 0) return <span className="text-gray-500">No image uploaded</span>;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {images.map(img => (
          <img
            key={img.id}
            src={img.image_url}
            alt="Tool"
            className="w-12 h-12 object-cover rounded cursor-pointer border"
            onClick={() => { setPreviewImage(img.image_url); setImgError(false); }}
            onError={() => setImgError(true)}
          />
        ))}
      </div>
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-2xl w-full relative">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
            <div className="mt-4">
              {!imgError ? (
                <img
                  src={previewImage}
                  alt="Tool Preview"
                  className="w-full h-auto rounded-lg"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                  <span className="text-red-500 text-lg">Image failed to load.</span>
                </div>
              )}
              <div className="mt-4 text-sm text-gray-600 break-all">
                <p className="font-semibold">Image URL:</p>
                <p>{previewImage}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 