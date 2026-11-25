import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsPointingOutIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

interface PostPhotoGalleryProps {
  images: string[];
  onImageClick?: (index: number) => void;
  className?: string;
}

export function PostPhotoGallery({
  images,
  onImageClick,
  className = '',
}: PostPhotoGalleryProps) {
  const cleanImages = (images || []).filter(Boolean);
  if (cleanImages.length === 0) return null;

  const count = cleanImages.length;

  return (
    <div className={`relative mt-2 ${className}`}>
      {/* Photo count indicator for multiple photos */}
      {count > 1 && (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 text-white text-[11px] font-semibold rounded-full backdrop-blur-xs shadow-md pointer-events-none border border-white/20">
          <PhotoIcon className="w-3.5 h-3.5" />
          <span>{count} photos</span>
        </div>
      )}

      {/* 1 Photo */}
      {count === 1 && (
        <div className="relative group bg-gray-50 flex items-center justify-center overflow-hidden border-y border-gray-100 max-h-[500px]">
          <img
            src={cleanImages[0]}
            alt=""
            className="w-full h-auto max-h-[500px] object-cover md:object-contain hover:opacity-95 transition-opacity cursor-pointer"
            onClick={() => onImageClick?.(0)}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick?.(0);
            }}
            className="hidden md:flex absolute top-2.5 right-2.5 items-center gap-1.5 px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs shadow-md cursor-pointer border border-white/20"
            title="View full size image"
          >
            <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
            <span>Full Size</span>
          </button>
        </div>
      )}

      {/* 2 Photos */}
      {count === 2 && (
        <div className="grid grid-cols-2 gap-1 bg-gray-100 border-y border-gray-100 overflow-hidden">
          {cleanImages.slice(0, 2).map((img, idx) => (
            <div
              key={idx}
              className="relative group h-64 sm:h-80 bg-gray-50 overflow-hidden cursor-pointer"
              onClick={() => onImageClick?.(idx)}
            >
              <img
                src={img}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
              />
            </div>
          ))}
        </div>
      )}

      {/* 3 Photos */}
      {count === 3 && (
        <div className="grid grid-cols-3 gap-1 bg-gray-100 border-y border-gray-100 overflow-hidden h-72 sm:h-96">
          <div
            className="col-span-2 relative group bg-gray-50 overflow-hidden cursor-pointer h-full"
            onClick={() => onImageClick?.(0)}
          >
            <img
              src={cleanImages[0]}
              alt="Photo 1"
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
            />
          </div>
          <div className="col-span-1 grid grid-rows-2 gap-1 h-full">
            {cleanImages.slice(1, 3).map((img, idx) => (
              <div
                key={idx}
                className="relative group bg-gray-50 overflow-hidden cursor-pointer h-full"
                onClick={() => onImageClick?.(idx + 1)}
              >
                <img
                  src={img}
                  alt={`Photo ${idx + 2}`}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Photos (Classic 2x2 grid) */}
      {count === 4 && (
        <div className="grid grid-cols-2 gap-1 bg-gray-100 border-y border-gray-100 overflow-hidden">
          {cleanImages.slice(0, 4).map((img, idx) => (
            <div
              key={idx}
              className="relative group h-48 sm:h-64 bg-gray-50 overflow-hidden cursor-pointer"
              onClick={() => onImageClick?.(idx)}
            >
              <img
                src={img}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
              />
            </div>
          ))}
        </div>
      )}

      {/* 5 or More Photos */}
      {count >= 5 && (
        <div className="grid grid-cols-2 gap-1 bg-gray-100 border-y border-gray-100 overflow-hidden">
          {cleanImages.slice(0, 3).map((img, idx) => (
            <div
              key={idx}
              className="relative group h-48 sm:h-64 bg-gray-50 overflow-hidden cursor-pointer"
              onClick={() => onImageClick?.(idx)}
            >
              <img
                src={img}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
              />
            </div>
          ))}
          <div
            className="relative group h-48 sm:h-64 bg-gray-50 overflow-hidden cursor-pointer"
            onClick={() => onImageClick?.(3)}
          >
            <img
              src={cleanImages[3]}
              alt="Photo 4"
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
            />
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-[2px] group-hover:bg-black/50 transition-colors">
              <span className="text-2xl sm:text-3xl font-bold">+{count - 3}</span>
              <span className="text-xs font-medium text-white/90 mt-0.5">more photos</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PostPhotoLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onChangeIndex: (newIndex: number) => void;
}

export function PostPhotoLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onChangeIndex,
}: PostPhotoLightboxProps) {
  const cleanImages = (images || []).filter(Boolean);

  const handlePrev = useCallback(() => {
    if (cleanImages.length <= 1) return;
    onChangeIndex((currentIndex - 1 + cleanImages.length) % cleanImages.length);
  }, [cleanImages.length, currentIndex, onChangeIndex]);

  const handleNext = useCallback(() => {
    if (cleanImages.length <= 1) return;
    onChangeIndex((currentIndex + 1) % cleanImages.length);
  }, [cleanImages.length, currentIndex, onChangeIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || cleanImages.length === 0) return null;

  const currentImage = cleanImages[currentIndex] || cleanImages[0];

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-xs z-[10000] flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="w-full max-w-6xl flex items-center justify-between py-2 px-3 text-white z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {cleanImages.length > 1 && (
            <span className="text-xs sm:text-sm font-medium bg-white/10 px-3 py-1 rounded-full border border-white/15">
              Photo {currentIndex + 1} of {cleanImages.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20 shadow-md backdrop-blur-xs"
          >
            Open original ↗
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20 shadow-md cursor-pointer"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="relative flex-1 w-full max-w-6xl flex items-center justify-center overflow-hidden my-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Button */}
        {cleanImages.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-20 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Previous photo"
          >
            <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* The Photo */}
        <img
          key={currentImage}
          src={currentImage}
          alt={`Photo ${currentIndex + 1}`}
          className="max-h-[78vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-150"
        />

        {/* Next Button */}
        {cleanImages.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-20 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Next photo"
          >
            <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (if multiple photos) */}
      {cleanImages.length > 1 && (
        <div
          className="w-full max-w-2xl flex items-center justify-center gap-2 py-2 px-4 overflow-x-auto z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {cleanImages.map((thumb, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChangeIndex(idx)}
              className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'border-white scale-105 shadow-md shadow-white/20'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img src={thumb} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
