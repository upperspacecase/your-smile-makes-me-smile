import { useState, useRef, useCallback } from "react";
import { Camera, Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Cropper from "react-easy-crop";
import type { Area, MediaSize } from "react-easy-crop";

interface AvatarUploaderProps {
  currentAvatar?: string | null;
  displayName?: string | null;
  onAvatarUpdated: (newAvatarUrl: string) => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

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

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      },
      "image/jpeg",
      0.9
    );
  });
}

export function AvatarUploader({ currentAvatar, displayName, onAvatarUpdated }: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onMediaLoaded = useCallback((mediaSize: MediaSize) => {
    const size = Math.min(mediaSize.naturalWidth, mediaSize.naturalHeight);
    const x = (mediaSize.naturalWidth - size) / 2;
    const y = (mediaSize.naturalHeight - size) / 2;
    setCroppedAreaPixels({ x, y, width: size, height: size });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setIsCropping(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    setImageSrc(null);
    setCroppedAreaPixels(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropDone = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      const formData = new FormData();
      formData.append("avatar", croppedBlob, "avatar.jpg");

      const uploadRes = await fetch("/api/user/avatar/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || "Failed to upload avatar");
      }

      const { avatarPath } = await uploadRes.json();
      onAvatarUpdated(avatarPath);

      toast({
        title: "Avatar updated!",
        description: "Your profile photo has been updated.",
      });

      setIsCropping(false);
      setImageSrc(null);
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload your photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (isCropping && imageSrc) {
    return (
      <div className="mb-4 mx-auto w-full max-w-xs">
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            onMediaLoaded={onMediaLoaded}
          />
        </div>
        
        <div className="mt-4 px-2">
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-hot-orange"
            data-testid="slider-zoom"
          />
          <p className="text-center text-sm text-gray-500 mt-1">Pinch or slide to zoom</p>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleCropCancel}
            disabled={isUploading}
            className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
            data-testid="button-crop-cancel"
          >
            <X className="h-5 w-5" />
            Cancel
          </button>
          <button
            onClick={handleCropDone}
            disabled={isUploading}
            className="flex-1 py-3 rounded-xl bg-hot-orange text-white font-semibold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
            data-testid="button-crop-done"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            {isUploading ? "Saving..." : "Done"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-4 mx-auto w-fit">
      {currentAvatar ? (
        <img 
          src={currentAvatar} 
          alt="Profile" 
          className="h-28 w-28 rounded-full object-cover ring-4 ring-hot-orange mx-auto shadow-xl"
        />
      ) : (
        <div className="h-28 w-28 rounded-full bg-hot-orange ring-4 ring-white mx-auto shadow-xl flex items-center justify-center font-display text-4xl text-white font-bold">
          {(displayName)?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="absolute bottom-0 right-0 rounded-full bg-white p-2.5 ring-4 ring-club-blue shadow-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        data-testid="button-upload-avatar"
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 text-club-blue animate-spin" />
        ) : (
          <Camera className="h-5 w-5 text-club-blue" />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-avatar-file"
      />
    </div>
  );
}
