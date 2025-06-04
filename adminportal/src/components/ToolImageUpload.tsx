import React, { useState, useEffect } from 'react';
import { uploadToolImageAndInsert, fetchToolImages, deleteToolImageRecord } from '../lib/uploadImage';

interface ToolImageUploadProps {
  toolId: string;
  images: Array<{ id: string; image_url: string }>;
  setImages: (images: Array<{ id: string; image_url: string }>) => void;
  disabled?: boolean;
  onRemoveImage?: (img: { id: string; image_url: string }) => void;
  onAddImage?: (img: { id: string; image_url: string }) => void;
}

export function ToolImageUpload({ toolId, images, setImages, disabled, onRemoveImage, onAddImage }: ToolImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (toolId) {
      fetchToolImages(toolId).then(setImages);
    }
    // eslint-disable-next-line
  }, [toolId]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!toolId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await uploadToolImageAndInsert(file, toolId);
      if (result) {
        setImages([...images, result]);
        if (onAddImage) onAddImage(result);
        setSuccess('Image uploaded successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to upload image');
      }
    } catch (err) {
      setError('Error uploading image');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (img: { id: string; image_url: string }) => {
    if (onRemoveImage) {
      onRemoveImage(img);
    } else {
      await deleteToolImageRecord(img.id, img.image_url);
      setImages(images.filter(i => i.id !== img.id));
    }
  };

  const isUploadDisabled = isUploading || disabled || !toolId;

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4">
        {/* Upload Button */}
        <div>
          <label className={`inline-block cursor-pointer px-4 py-2 rounded-lg transition-colors ${
            isUploadDisabled
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}>
            {isUploading ? 'Uploading...' : 'Upload Image'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploadDisabled}
            />
          </label>
          {!toolId && (
            <div className="text-xs text-red-500 mt-1">Enter a tool number before uploading an image.</div>
          )}
        </div>
        {/* Images Gallery */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {images.map(img => (
              <div key={img.id} className="relative w-32 h-32 border rounded-lg overflow-hidden group">
                <img
                  src={img.image_url}
                  alt="Tool"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => { setPreviewImage(img.image_url); setImgError(false); }}
                  onError={() => setImgError(true)}
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 group-hover:opacity-100"
                  onClick={() => handleRemoveImage(img)}
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      {success && (
        <p className="text-green-500 text-sm">{success}</p>
      )}
      {isUploading && (
        <div className="text-sm text-gray-500">Please wait while we upload your image...</div>
      )}
      {/* Preview Modal */}
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
    </div>
  );
} 