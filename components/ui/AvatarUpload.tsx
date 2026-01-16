'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { createClient } from '@/lib/supabase/client';

interface Point {
  x: number;
  y: number;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userInitial: string;
  userId: string;
  onAvatarUpdate: (avatarUrl: string | null) => void;
}

export function AvatarUpload({
  currentAvatarUrl,
  userInitial,
  userId,
  onAvatarUpdate,
}: AvatarUploadProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEnlargedView, setShowEnlargedView] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  // Scroll to top when enlarged view opens
  useEffect(() => {
    if (showEnlargedView) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showEnlargedView]);

  // Scroll to top when crop modal opens
  useEffect(() => {
    if (imageSrc) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [imageSrc]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file type
      if (!file.type.match(/image\/jpeg/)) {
        alert('Please upload a JPG image');
        return;
      }

      // Validate file size (1MB = 1048576 bytes)
      if (file.size > 1048576) {
        alert('File size must be less than 1MB');
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
      });
      reader.readAsDataURL(file);
    }
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to the cropped area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/jpeg');
    });
  };

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setIsUploading(true);

      // Get cropped image
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);

      // Upload to Supabase Storage
      const fileName = `${userId}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedImage, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Call callback to update UI
      onAvatarUpdate(publicUrl);

      // Reset state
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentAvatarUrl) return;

    try {
      setIsUploading(true);

      // Remove from database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Optionally delete from storage (if you want to clean up)
      // Extract filename from URL and delete
      // const fileName = currentAvatarUrl.split('/').pop();
      // await supabase.storage.from('avatars').remove([fileName]);

      onAvatarUpdate(null);
      setShowEnlargedView(false); // Close the enlarged view
    } catch (error) {
      console.error('Error removing avatar:', error);
      alert('Failed to remove avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div
        className="relative inline-block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar Display */}
        <div 
          className={`w-20 h-20 rounded-full overflow-hidden relative ${currentAvatarUrl ? 'cursor-pointer' : ''}`}
          onClick={() => currentAvatarUrl && setShowEnlargedView(true)}
        >
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-orange flex items-center justify-center">
              <span className="text-white text-3xl font-bold">
                {userInitial}
              </span>
            </div>
          )}
        </div>

        {/* Upload Button (only if no avatar) */}
        {!currentAvatarUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute bottom-0 right-0 w-8 h-8 bg-orange rounded-full flex items-center justify-center border-2 border-white hover:bg-orange-dark transition-colors"
            disabled={isUploading}
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </button>
        )}

        {/* Upload Button (if avatar exists, show on hover) */}
        {currentAvatarUrl && isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute bottom-0 right-0 w-8 h-8 bg-orange rounded-full flex items-center justify-center border-2 border-white hover:bg-orange-dark transition-colors"
            disabled={isUploading}
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </button>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Enlarged View Modal */}
      {showEnlargedView && currentAvatarUrl && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-start justify-center z-50 overflow-y-auto pt-8 pb-8"
          onClick={() => setShowEnlargedView(false)}
        >
          <div 
            className="relative max-w-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowEnlargedView(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Enlarged Avatar */}
            <img
              src={currentAvatarUrl}
              alt="Profile picture"
              className="max-w-full max-h-[80vh] rounded-lg object-contain"
            />

            {/* Remove Button */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleRemove}
                disabled={isUploading}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Removing...' : 'Remove Profile Picture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {imageSrc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center overflow-y-auto p-4" style={{ zIndex: 10001 }}>
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-2xl mx-auto my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-orange-dark mb-4">
              Crop Your Photo
            </h3>

            {/* Cropper - Responsive height for better small screen support */}
            <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-100 rounded-lg mb-4">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            {/* Zoom Slider */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-slate mb-2">
                Zoom
              </label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setImageSrc(null)}
                className="px-4 py-2 border border-gray-light rounded-md text-gray-slate hover:bg-gray-light/30 transition-colors"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                className="px-4 py-2 bg-orange text-white rounded-md hover:bg-orange-dark transition-colors"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

