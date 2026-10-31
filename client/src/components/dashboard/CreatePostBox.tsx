import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  PhotoIcon,
  TagIcon,
  XMarkIcon,
  GlobeAmericasIcon,
  UserGroupIcon,
  LockClosedIcon,
  SparklesIcon,
  MapPinIcon,
  UserPlusIcon,
  FaceSmileIcon as FaceSmileOutline,
  ChevronDownIcon,
  VideoCameraIcon as VideoCameraOutline,
  ArrowUpTrayIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  PhotoIcon as PhotoSolidIcon,
  FaceSmileIcon as FaceSmileSolid,
} from '@heroicons/react/24/solid';
import { feedApi, connectionsApi } from '@/services/api';
import EmojiPicker from '@/components/ui/EmojiPicker';

interface CreatePostBoxProps {
  onPostCreated: (newPost: any) => void;
  currentUser: any;
  currentProfile?: any;
}

const TAG_OPTIONS = [
  'Alumni Post',
  'Career Advice',
  'Discussion',
  'Question',
  'Opportunity',
  'Campus Memories',
];

const CAREER_STATUS_OPTIONS = [
  { emoji: '🎓', label: 'Graduated / Milestone' },
  { emoji: '💼', label: 'Started New Position' },
  { emoji: '🚀', label: 'Career Promotion' },
  { emoji: '🏆', label: 'Received Award / Recognition' },
  { emoji: '💡', label: 'Sharing Career Insights' },
  { emoji: '🤝', label: 'Open to Mentorship' },
  { emoji: '📢', label: 'Hiring / Job Opportunity' },
  { emoji: '🎉', label: 'Celebrating Achievement' },
  { emoji: '📚', label: 'Pursuing Advanced Studies' },
  { emoji: '🌟', label: 'Alumni Milestone' },
];

const LOCATION_SUGGESTIONS = [
  'CTU-Naga Campus',
  'City of Naga, Cebu',
  'Cebu City, Philippines',
  'Remote / Work from Home',
  'Information Technology Dept',
];

export default function CreatePostBox({ onPostCreated, currentUser, currentProfile }: CreatePostBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState('Alumni Post');
  const [audience, setAudience] = useState<'public' | 'friends' | 'only_me'>('public');
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);

  // Media state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [mediaFileName, setMediaFileName] = useState('');
  const [mediaFileSize, setMediaFileSize] = useState<number | null>(null);
  const [useManualUrl, setUseManualUrl] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Feeling / Activity
  const [feeling, setFeeling] = useState<{ emoji: string; label: string } | null>(null);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Location
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);

  // Tagging friends
  const [taggedFriends, setTaggedFriends] = useState<{ id: string; name: string }[]>([]);
  const [showTagFriendsModal, setShowTagFriendsModal] = useState(false);
  const [availableFriends, setAvailableFriends] = useState<any[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll only while composer modal is open, and safely restore natural scroll on close
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isExpanded]);

  const handleFileSelected = async (file: File) => {
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');

    if (!isImg && !isVid) {
      setError('Please select a valid image (JPG, PNG, GIF, WEBP) or video (MP4, WEBM, MOV) file.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum allowed size is 50MB.');
      return;
    }

    setError(null);
    setIsExpanded(true);
    setShowMediaInput(true);
    const chosenType = isVid ? 'video' : 'photo';
    setMediaType(chosenType);
    setMediaFileName(file.name);
    setMediaFileSize(file.size);

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    if (isVid) {
      setVideoUrl(localUrl);
      setImageUrl('');
    } else {
      setImageUrl(localUrl);
      setVideoUrl('');
    }

    setUploadingMedia(true);
    setUploadProgress(`Uploading ${chosenType === 'video' ? 'video' : 'photo'}...`);

    try {
      const res = await feedApi.uploadMedia(file);
      if (res.media_type === 'video') {
        setVideoUrl(res.url);
        setImageUrl('');
        setMediaType('video');
      } else {
        setImageUrl(res.url);
        setVideoUrl('');
        setMediaType('photo');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload media. Please try again.');
      setImageUrl('');
      setVideoUrl('');
      setMediaFileName('');
      setMediaFileSize(null);
    } finally {
      setUploadingMedia(false);
      setUploadProgress('');
    }
  };

  const handleRemoveMedia = () => {
    setImageUrl('');
    setVideoUrl('');
    setMediaFileName('');
    setMediaFileSize(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayName = currentProfile
    ? `${currentProfile.first_name} ${currentProfile.last_name}`
    : currentUser?.first_name
    ? `${currentUser.first_name} ${currentUser.last_name || ''}`
    : currentUser?.email?.split('@')[0] || 'Alumni Member';

  const firstName = currentProfile?.first_name || currentUser?.first_name || displayName.split(' ')[0] || 'Alumni';

  const avatar = currentProfile?.avatar_url || null;
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();


  // Load connections for tagging
  const loadFriends = async () => {
    if (availableFriends.length > 0) return;
    setLoadingFriends(true);
    try {
      const conns = await connectionsApi.list();
      const list = (conns || []).map((c: any) => {
        const partner = c.recipient_id === (currentProfile?.id || currentUser?.id) ? c.requester : c.recipient;
        return partner ? { id: partner.id, name: `${partner.first_name} ${partner.last_name}`, avatar: partner.avatar_url, headline: partner.headline } : null;
      }).filter(Boolean);
      setAvailableFriends(list);
    } catch {
      // fallback
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleOpenTagFriends = () => {
    setShowTagFriendsModal(true);
    loadFriends();
  };

  const toggleTagFriend = (friend: { id: string; name: string }) => {
    setTaggedFriends((prev) => {
      const exists = prev.some((f) => f.id === friend.id);
      if (exists) return prev.filter((f) => f.id !== friend.id);
      return [...prev, friend];
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (uploadingMedia) {
      setError('Please wait until your media upload is complete.');
      return;
    }
    if ((!content.trim() && !imageUrl.trim() && !videoUrl.trim()) || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const created = await feedApi.create({
        content: content.trim(),
        tag: selectedTag,
        audience,
        image_url: mediaType === 'photo' ? (imageUrl.trim() || null) : null,
        video_url: mediaType === 'video' ? (videoUrl.trim() || null) : null,
        media_type: mediaType,
        feeling: feeling ? `${feeling.emoji} ${feeling.label}` : null,
        location: location.trim() || null,
        tagged_friends: taggedFriends,
        type: 'post',
      });

      onPostCreated(created);
      // Reset form
      setContent('');
      setImageUrl('');
      setVideoUrl('');
      setFeeling(null);
      setLocation('');
      setTaggedFriends([]);
      setShowMediaInput(false);
      setShowFeelingPicker(false);
      setShowLocationInput(false);
      setShowEmojiPicker(false);
      setIsExpanded(false);
    } catch (err: any) {
      setError(err.message || 'Failed to publish post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const audienceLabel = audience === 'public' ? 'Public' : audience === 'friends' ? 'Connections' : 'Only me';
  const AudienceIcon = audience === 'public' ? GlobeAmericasIcon : audience === 'friends' ? UserGroupIcon : LockClosedIcon;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-3.5 mb-4 transition-all">
      {/* Hidden File Input for Direct Media Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
        }}
      />

      {/* Top Row: Avatar + Pill input + 2 colored icons (Photo, Feeling). Live video is removed as requested */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {initials}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex-1 text-left px-4 py-2.5 bg-[#f0f2f5] hover:bg-[#e4e6eb] text-gray-500 hover:text-gray-700 text-sm rounded-full transition-colors cursor-pointer font-normal truncate"
        >
          {`Share a career update, achievement, or question, ${firstName}...`}
        </button>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            title="Upload photo or video"
          >
            <PhotoSolidIcon className="w-6 h-6 text-[#45bd62]" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsExpanded(true);
              setShowFeelingPicker(true);
            }}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            title="Milestone / Status"
          >
            <FaceSmileSolid className="w-6 h-6 text-[#f7b125]" />
          </button>
        </div>
      </div>

      {/* Alumni Post Composer Modal rendered into document.body */}
      {isExpanded &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
            onClick={() => {
              if (!submitting) setIsExpanded(false);
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl sm:max-w-3xl w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 relative bg-white shrink-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mx-auto">Share Alumni Post</h3>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="absolute right-3 sm:right-4 top-3 sm:top-3.5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

            {/* Scrollable Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 scrollbar-hover">
              {/* Author & Audience */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden shadow-2xs">
                  {avatar ? (
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-1 text-sm font-semibold text-gray-900 leading-snug">
                    <span>{displayName}</span>
                    {feeling && (
                      <span className="font-normal text-gray-600 flex items-center gap-1">
                        &middot; <span className="font-medium text-gray-900">{feeling.emoji} {feeling.label}</span>
                      </span>
                    )}
                    {taggedFriends.length > 0 && (
                      <span className="font-normal text-gray-600">
                        with{' '}
                        <span className="font-medium text-gray-900">
                          {taggedFriends.map((f) => f.name).join(', ')}
                        </span>
                      </span>
                    )}
                    {location && (
                      <span className="font-normal text-gray-600">
                        at <span className="font-medium text-gray-900">{location}</span>
                      </span>
                    )}
                  </div>

                  {/* Audience Selector Dropdown */}
                  <div className="relative inline-block mt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowAudienceMenu((prev) => !prev)}
                      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200/80 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <AudienceIcon className="w-3.5 h-3.5 text-gray-600" />
                      <span>{audienceLabel}</span>
                      <ChevronDownIcon className="w-3 h-3 text-gray-500" />
                    </button>

                    {showAudienceMenu && (
                      <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setAudience('public');
                            setShowAudienceMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 ${audience === 'public' ? 'text-orange-600 font-semibold' : 'text-gray-700'}`}
                        >
                          <GlobeAmericasIcon className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="font-medium">Public</p>
                            <p className="text-[10px] text-gray-400">Anyone on alumni network</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAudience('friends');
                            setShowAudienceMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 ${audience === 'friends' ? 'text-orange-600 font-semibold' : 'text-gray-700'}`}
                        >
                          <UserGroupIcon className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="font-medium">Connections</p>
                            <p className="text-[10px] text-gray-400">Only your connections</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAudience('only_me');
                            setShowAudienceMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 ${audience === 'only_me' ? 'text-orange-600 font-semibold' : 'text-gray-700'}`}
                        >
                          <LockClosedIcon className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="font-medium">Only me</p>
                            <p className="text-[10px] text-gray-400">Private to you only</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs">
                  {error}
                </div>
              )}

              {/* Main Post Content Textarea */}
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Share an alumni post, project, job lead, or inquiry, ${firstName}...`}
                className="w-full text-base text-gray-900 placeholder-gray-400 outline-none resize-none border-none focus:ring-0 p-0"
                autoFocus
              />

              {/* Tag / Category Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 mr-1">
                  <TagIcon className="w-3.5 h-3.5 text-orange-500" />
                  Category:
                </span>
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                      selectedTag === tag
                        ? 'bg-orange-500 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Media input section */}
              {showMediaInput && (
                <div className="p-3 bg-gray-50/80 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                    <span className="flex items-center gap-1.5">
                      {mediaType === 'photo' ? (
                        <>
                          <PhotoIcon className="w-4 h-4 text-emerald-600" />
                          <span>Photo</span>
                        </>
                      ) : (
                        <>
                          <VideoCameraOutline className="w-4 h-4 text-blue-600" />
                          <span>Video</span>
                        </>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUseManualUrl(!useManualUrl)}
                        className="text-[11px] text-gray-500 hover:text-orange-600 underline cursor-pointer"
                      >
                        {useManualUrl ? 'Upload file' : 'Paste link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMediaInput(false);
                          handleRemoveMedia();
                        }}
                        className="text-gray-400 hover:text-gray-600 p-0.5 ml-1 cursor-pointer"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {useManualUrl ? (
                    <div className="space-y-2">
                      <div className="flex gap-1.5 mb-1">
                        <button
                          type="button"
                          onClick={() => setMediaType('photo')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${mediaType === 'photo' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                          Photo URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaType('video')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${mediaType === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                          Video URL
                        </button>
                      </div>
                      {mediaType === 'photo' ? (
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="Paste image link (e.g. https://...)"
                          className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-orange-500"
                        />
                      ) : (
                        <input
                          type="url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="Paste video or mp4 link (e.g. https://...)"
                          className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-orange-500"
                        />
                      )}
                    </div>
                  ) : !imageUrl && !videoUrl ? (
                    /* Dropzone / File Select Box */
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileSelected(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        dragOver
                          ? 'border-orange-500 bg-orange-50/50'
                          : 'border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-center items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <PhotoIcon className="w-5 h-5" />
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                          <VideoCameraOutline className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-xs font-bold text-gray-800">Add Photos or Videos</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Drag and drop here, or browse files from your computer</p>
                      <p className="text-[10px] text-gray-400 mt-1">Supports PNG, JPG, GIF, WEBP, MP4, MOV, WEBM (up to 50MB)</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                        <span>Select file</span>
                      </button>
                    </div>
                  ) : null}

                  {/* Photo Preview Card */}
                  {imageUrl && mediaType === 'photo' && (
                    <div className="relative rounded-xl overflow-hidden max-h-72 bg-black/5 border border-gray-200">
                      <img src={imageUrl} alt="" className="max-h-72 w-full object-cover rounded-xl" />

                      {/* Loading state overlay */}
                      {uploadingMedia && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex flex-col items-center justify-center text-white p-4">
                          <span className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin mb-2" />
                          <p className="text-xs font-semibold">{uploadProgress || 'Uploading photo...'}</p>
                        </div>
                      )}

                      {/* Top Action buttons */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-gray-900/70 hover:bg-gray-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-xs cursor-pointer shadow-xs"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveMedia}
                          className="bg-gray-900/70 hover:bg-gray-900 text-white p-1 rounded-full backdrop-blur-xs cursor-pointer shadow-xs"
                          title="Remove photo"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Uploaded Badge */}
                      {!uploadingMedia && (
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircleIcon className="w-3 h-3 text-emerald-400" />
                          <span className="truncate max-w-[200px]">{mediaFileName || 'Photo ready'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Video Preview Card */}
                  {videoUrl && mediaType === 'video' && (
                    <div className="relative rounded-xl overflow-hidden max-h-72 bg-black border border-gray-800">
                      <video src={videoUrl} controls playsInline className="max-h-72 w-full rounded-xl bg-black" />

                      {/* Loading state overlay */}
                      {uploadingMedia && (
                        <div className="absolute inset-0 bg-black/65 backdrop-blur-2xs flex flex-col items-center justify-center text-white p-4">
                          <span className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin mb-2" />
                          <p className="text-xs font-semibold">{uploadProgress || 'Uploading video (up to 50MB)...'}</p>
                        </div>
                      )}

                      {/* Top Action buttons */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-gray-900/80 hover:bg-gray-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-xs cursor-pointer shadow-xs"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveMedia}
                          className="bg-gray-900/80 hover:bg-gray-900 text-white p-1 rounded-full backdrop-blur-xs cursor-pointer shadow-xs"
                          title="Remove video"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Uploaded Badge */}
                      {!uploadingMedia && (
                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 z-10">
                          <CheckCircleIcon className="w-3 h-3 text-emerald-400" />
                          <span className="truncate max-w-[200px]">{mediaFileName || 'Video ready'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Location Input Section */}
              {showLocationInput && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <MapPinIcon className="w-4 h-4 text-red-500" />
                      <span>Where are you?</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLocationInput(false);
                        setLocation('');
                      }}
                      className="text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter location or choose below..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-orange-500"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {LOCATION_SUGGESTIONS.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setLocation(loc)}
                        className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full hover:bg-gray-100"
                      >
                        📍 {loc}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Career Milestone / Status Picker Section */}
              {showFeelingPicker && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <FaceSmileOutline className="w-4 h-4 text-amber-500" />
                      <span>Select Milestone or Status</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFeelingPicker(false);
                        setFeeling(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                    {CAREER_STATUS_OPTIONS.map((f) => (
                      <button
                        key={f.label}
                        type="button"
                        onClick={() => {
                          setFeeling(f);
                          setShowFeelingPicker(false);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-left transition-colors ${
                          feeling?.label === f.label
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-white border border-gray-200 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="text-base">{f.emoji}</span>
                        <span className="truncate">{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="p-2.5 sm:p-3 border border-gray-200 rounded-xl flex flex-wrap items-center justify-between gap-2 bg-white shadow-2xs">
                <span className="text-xs font-semibold text-gray-800">Attach to post</span>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {/* Photo / Video */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMediaInput(true);
                      fileInputRef.current?.click();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#45bd62] cursor-pointer"
                    title="Upload Photo / Video"
                  >
                    <PhotoSolidIcon className="w-5 h-5" />
                  </button>

                  {/* Tag Alumni */}
                  <button
                    type="button"
                    onClick={handleOpenTagFriends}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-blue-500 cursor-pointer"
                    title="Tag Alumni"
                  >
                    <UserPlusIcon className="w-5 h-5" />
                  </button>

                  {/* Milestone / Status */}
                  <button
                    type="button"
                    onClick={() => setShowFeelingPicker((prev) => !prev)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#f7b125] cursor-pointer"
                    title="Milestone / Status"
                  >
                    <FaceSmileSolid className="w-5 h-5" />
                  </button>

                  {/* Location */}
                  <button
                    type="button"
                    onClick={() => setShowLocationInput((prev) => !prev)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-red-500 cursor-pointer"
                    title="Add Location"
                  >
                    <MapPinIcon className="w-5 h-5" />
                  </button>

                  {/* Dynamic Emoji Picker */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      className={`p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-orange-500 ${
                        showEmojiPicker ? 'bg-orange-100' : ''
                      }`}
                      title="Insert dynamic emoji"
                    >
                      <span className="text-lg leading-none">😊</span>
                    </button>

                    {showEmojiPicker && (
                      <EmojiPicker
                        position="top"
                        className="right-0"
                        onSelect={(emoji) => {
                          setContent((prev) => prev + emoji);
                        }}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="w-1/3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={(!content.trim() && !imageUrl.trim() && !videoUrl.trim()) || submitting || uploadingMedia}
                className="flex-1 py-2.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : uploadingMedia ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading media...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Publish Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Tag Alumni Modal */}
      {showTagFriendsModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
            onClick={() => setShowTagFriendsModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 p-4 sm:p-5 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-900">Tag Alumni</h4>
              <button
                type="button"
                onClick={() => setShowTagFriendsModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="Search alumni or connections..."
              className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg mb-3 outline-none focus:border-orange-500"
            />

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {loadingFriends ? (
                <p className="text-xs text-gray-400 text-center py-4">Loading alumni connections...</p>
              ) : availableFriends.filter((f) => f.name.toLowerCase().includes(friendSearch.toLowerCase())).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No connections found.</p>
              ) : (
                availableFriends
                  .filter((f) => f.name.toLowerCase().includes(friendSearch.toLowerCase()))
                  .map((friend) => {
                    const isTagged = taggedFriends.some((f) => f.id === friend.id);
                    return (
                      <div
                        key={friend.id}
                        onClick={() => toggleTagFriend(friend)}
                        className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer ${
                          isTagged ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                            {friend.avatar ? (
                              <img src={friend.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              friend.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">{friend.name}</p>
                            {friend.headline && <p className="text-[10px] text-gray-400 truncate">{friend.headline}</p>}
                          </div>
                        </div>

                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isTagged ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-500'}`}>
                          {isTagged ? 'Tagged' : 'Tag'}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowTagFriendsModal(false)}
              className="mt-3 w-full py-2.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors cursor-pointer"
            >
              Done ({taggedFriends.length} tagged)
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
