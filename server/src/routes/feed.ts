import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { addActivity } from '../services/activityStore';
import { createPostSchema, updatePostSchema } from '../middleware/validationSchemas';
import { createNotification } from './notifications';

const router = Router();

const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new AppError('Only image and video files are permitted for feed posts.', 400));
    }
  },
});

// GET /api/feed - list all feed posts with audience filter and reaction status
router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sort } = req.query;
    let orderColumn = 'created_at';
    let ascending = false;

    if (sort === 'top' || sort === 'hot' || sort === 'best') {
      orderColumn = 'like_count';
      ascending = false;
    }

    const { data: posts, error } = await supabase
      .from('feed_posts')
      .select('*')
      .order(orderColumn, { ascending });

    if (error) throw new AppError(error.message, 500);

    // Get current user profile ID and accepted connections to filter 'friends' posts
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .maybeSingle();

    const friendUserIds = new Set<string>();
    if (myProfile?.id) {
      const { data: myConns } = await supabase
        .from('connections')
        .select('requester_id, recipient_id, requester:profiles!connections_requester_id_fkey(user_id), recipient:profiles!connections_recipient_id_fkey(user_id)')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${myProfile.id},recipient_id.eq.${myProfile.id}`);

      (myConns || []).forEach((c: any) => {
        if (c.requester?.user_id) friendUserIds.add(c.requester.user_id);
        if (c.recipient?.user_id) friendUserIds.add(c.recipient.user_id);
      });
    }

    // Merge published announcements
    const { data: announcements, error: annError } = await supabase
      .from('announcements')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (annError) throw new AppError(annError.message, 500);

    const announcementPosts = (announcements || []).map((a: any) => ({
      id: a.id,
      type: 'announcement',
      title: a.title,
      content: a.content,
      author: 'CTU-Naga Alumni Office',
      author_avatar: 'C',
      image_url: a.image_url,
      company: null,
      job_url: null,
      tag: a.is_pinned ? 'Pinned Announcement' : 'Announcement',
      tag_color: a.is_pinned ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700',
      is_official: true,
      like_count: 0,
      comment_count: 0,
      share_count: 0,
      created_at: a.published_at || a.created_at,
      updated_at: a.updated_at || a.created_at,
      linked_survey_id: a.linked_survey_id,
      audience: 'public',
      feeling: null,
      location: null,
      tagged_friends: [],
      media_type: 'photo',
      video_url: null,
      comments_disabled: false,
      reactions_summary: {},
    }));

    // Filter posts by audience
    const visiblePosts = (posts || []).filter((p: any) => {
      if (p.is_official || p.type === 'announcement') return true;
      const aud = p.audience || 'public';
      if (aud === 'public') return true;
      if (p.user_id === req.user!.userId || req.user!.role === 'admin') return true;
      if (aud === 'friends') {
        return p.user_id && friendUserIds.has(p.user_id);
      }
      if (aud === 'only_me') {
        return false;
      }
      return true;
    });

    const seen = new Set<string>();
    const merged = [...visiblePosts, ...announcementPosts].filter((p: any) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    if (orderColumn === 'like_count') {
      merged.sort((a: any, b: any) => (b.like_count || 0) - (a.like_count || 0));
    } else {
      merged.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Check which posts the current user has reacted to
    const { data: userLikes } = await supabase
      .from('feed_post_likes')
      .select('post_id, reaction_type')
      .eq('user_id', req.user!.userId);

    const userReactionMap = new Map<string, string>();
    (userLikes || []).forEach((l: any) => {
      userReactionMap.set(l.post_id, l.reaction_type || '👍');
    });

    const result = await Promise.all(merged.map(async (p: any) => {
      let linkedSurvey = null;
      if (p.linked_survey_id) {
        const { data: survey } = await supabase
          .from('surveys')
          .select('id, title, status')
          .eq('id', p.linked_survey_id)
          .single();
        if (survey) linkedSurvey = survey;
      }

      const myReaction = userReactionMap.get(p.id) || null;
      const reactionsSummary = p.reactions_summary || (p.like_count > 0 ? { '👍': p.like_count } : {});
      const topReactions = Object.entries(reactionsSummary)
        .filter(([_, count]: any) => count > 0)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([emoji]) => emoji);

      return {
        ...p,
        audience: p.audience || 'public',
        feeling: p.feeling || null,
        location: p.location || null,
        tagged_friends: p.tagged_friends || [],
        media_type: p.media_type || 'photo',
        video_url: p.video_url || null,
        comments_disabled: !!p.comments_disabled,
        liked: !!myReaction,
        user_reaction: myReaction,
        reactions_summary: reactionsSummary,
        top_reactions: topReactions.length > 0 ? topReactions : (p.like_count > 0 ? ['👍'] : []),
        linked_survey: linkedSurvey,
      };
    }));

    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/feed/mine - get current user's posts
router.get('/mine', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: posts, error } = await supabase
      .from('feed_posts')
      .select('*')
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    const { data: userLikes } = await supabase
      .from('feed_post_likes')
      .select('post_id, reaction_type')
      .eq('user_id', req.user!.userId);

    const userReactionMap = new Map<string, string>();
    (userLikes || []).forEach((l: any) => {
      userReactionMap.set(l.post_id, l.reaction_type || '👍');
    });

    const formatted = (posts || []).map((p: any) => {
      const myReaction = userReactionMap.get(p.id) || null;
      const reactionsSummary = p.reactions_summary || (p.like_count > 0 ? { '👍': p.like_count } : {});
      const topReactions = Object.entries(reactionsSummary)
        .filter(([_, count]: any) => count > 0)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([emoji]) => emoji);

      return {
        ...p,
        audience: p.audience || 'public',
        feeling: p.feeling || null,
        location: p.location || null,
        tagged_friends: p.tagged_friends || [],
        media_type: p.media_type || 'photo',
        video_url: p.video_url || null,
        comments_disabled: !!p.comments_disabled,
        liked: !!myReaction,
        user_reaction: myReaction,
        reactions_summary: reactionsSummary,
        top_reactions: topReactions.length > 0 ? topReactions : (p.like_count > 0 ? ['👍'] : []),
      };
    });

    res.json(formatted);
  } catch (err) { next(err); }
});

// GET /api/feed/user/:userId - get posts by a specific user (with audience checks)
router.get('/user/:userId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    let targetUserId = req.params.userId;
    if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') {
      return res.json([]);
    }

    // Support looking up by profile id or user id
    const { data: profileCheck } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', targetUserId)
      .maybeSingle();

    if (profileCheck?.user_id) {
      targetUserId = profileCheck.user_id;
    }

    const isMe = targetUserId === req.user!.userId;

    let query = supabase
      .from('feed_posts')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (!isMe && req.user!.role !== 'admin') {
      const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', req.user!.userId).maybeSingle();
      const { data: targetProfile } = await supabase.from('profiles').select('id').eq('user_id', targetUserId).maybeSingle();

      let isFriend = false;
      if (myProfile && targetProfile) {
        const { data: conn } = await supabase
          .from('connections')
          .select('id')
          .eq('status', 'accepted')
          .or(`and(requester_id.eq.${myProfile.id},recipient_id.eq.${targetProfile.id}),and(requester_id.eq.${targetProfile.id},recipient_id.eq.${myProfile.id})`)
          .maybeSingle();
        if (conn) isFriend = true;
      }

      if (isFriend) {
        query = query.in('audience', ['public', 'friends']);
      } else {
        query = query.eq('audience', 'public');
      }
    }

    const { data: posts, error } = await query;
    if (error) throw new AppError(error.message, 500);

    const { data: userLikes } = await supabase
      .from('feed_post_likes')
      .select('post_id, reaction_type')
      .eq('user_id', req.user!.userId);

    const userReactionMap = new Map<string, string>();
    (userLikes || []).forEach((l: any) => {
      userReactionMap.set(l.post_id, l.reaction_type || '👍');
    });

    const formatted = (posts || []).map((p: any) => {
      const myReaction = userReactionMap.get(p.id) || null;
      const reactionsSummary = p.reactions_summary || (p.like_count > 0 ? { '👍': p.like_count } : {});
      const topReactions = Object.entries(reactionsSummary)
        .filter(([_, count]: any) => count > 0)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([emoji]) => emoji);

      return {
        ...p,
        audience: p.audience || 'public',
        feeling: p.feeling || null,
        location: p.location || null,
        tagged_friends: p.tagged_friends || [],
        media_type: p.media_type || 'photo',
        video_url: p.video_url || null,
        comments_disabled: !!p.comments_disabled,
        liked: !!myReaction,
        user_reaction: myReaction,
        reactions_summary: reactionsSummary,
        top_reactions: topReactions.length > 0 ? topReactions : (p.like_count > 0 ? ['👍'] : []),
      };
    });

    res.json(formatted);
  } catch (err) { next(err); }
});

// GET /api/feed/:id - single post with comments and nested replies
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: post, error } = await supabase
      .from('feed_posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw new AppError('Post not found', 404);

    // Check user reaction
    const { data: like } = await supabase
      .from('feed_post_likes')
      .select('id, reaction_type')
      .eq('post_id', req.params.id)
      .eq('user_id', req.user!.userId)
      .maybeSingle();

    const { data: comments, error: commentsError } = await supabase
      .from('feed_post_comments')
      .select('*')
      .eq('post_id', req.params.id)
      .order('created_at', { ascending: true });

    if (commentsError) throw new AppError(commentsError.message, 500);

    // Check user's reactions on comments
    const { data: commentReactions } = await supabase
      .from('feed_comment_reactions')
      .select('comment_id, reaction_type')
      .eq('user_id', req.user!.userId);

    const commentReactionMap = new Map<string, string>();
    (commentReactions || []).forEach((r: any) => {
      commentReactionMap.set(r.comment_id, r.reaction_type || '👍');
    });

    // Structure comments into parent and replies
    const commentList: any[] = [];
    const replyMap = new Map<string, any[]>();
    (comments || []).forEach((c: any) => {
      const enriched = {
        ...c,
        like_count: c.like_count || 0,
        liked: commentReactionMap.has(c.id),
        user_reaction: commentReactionMap.get(c.id) || null,
      };
      if (c.parent_id) {
        if (!replyMap.has(c.parent_id)) replyMap.set(c.parent_id, []);
        replyMap.get(c.parent_id)!.push(enriched);
      } else {
        commentList.push(enriched);
      }
    });

    const finalComments = commentList.map((c: any) => ({
      ...c,
      replies: replyMap.get(c.id) || [],
    }));

    const reactionsSummary = post.reactions_summary || (post.like_count > 0 ? { '👍': post.like_count } : {});
    const topReactions = Object.entries(reactionsSummary)
      .filter(([_, count]: any) => count > 0)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([emoji]) => emoji);

    res.json({
      ...post,
      audience: post.audience || 'public',
      feeling: post.feeling || null,
      location: post.location || null,
      tagged_friends: post.tagged_friends || [],
      media_type: post.media_type || 'photo',
      video_url: post.video_url || null,
      comments_disabled: !!post.comments_disabled,
      liked: !!like,
      user_reaction: like?.reaction_type || (like ? '👍' : null),
      reactions_summary: reactionsSummary,
      top_reactions: topReactions.length > 0 ? topReactions : (post.like_count > 0 ? ['👍'] : []),
      comments: finalComments,
    });
  } catch (err) { next(err); }
});

// GET /api/feed/:id/reactions - list of users who reacted to a post
router.get('/:id/reactions', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: likes, error } = await supabase
      .from('feed_post_likes')
      .select('id, reaction_type, user_id, created_at')
      .eq('post_id', req.params.id);

    if (error) throw new AppError(error.message, 500);

    const userIds = (likes || []).map((l: any) => l.user_id);
    const profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, avatar_url, headline')
        .in('user_id', userIds);
      (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));
    }

    const result = (likes || []).map((l: any) => {
      const p = profileMap.get(l.user_id);
      return {
        id: l.id,
        user_id: l.user_id,
        reaction_type: l.reaction_type || '👍',
        name: p ? `${p.first_name} ${p.last_name}` : 'Alumnus',
        avatar: p?.avatar_url || null,
        headline: p?.headline || '',
        created_at: l.created_at,
      };
    });

    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/feed/upload - upload photo or video file for feed post
router.post('/upload', authenticate, uploadMedia.single('file'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'photo';
    const originalExt = req.file.originalname.split('.').pop()?.toLowerCase();
    const ext = originalExt ? originalExt.replace(/[^a-z0-9]/gi, '') : (isVideo ? 'mp4' : 'jpg');
    const randomHex = crypto.randomBytes(8).toString('hex');
    const fileName = `${mediaType}s/${req.user!.userId}_${Date.now()}_${randomHex}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('feed-media')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Feed Media Upload] Error:', uploadError);
      throw new AppError(`Media upload failed: ${uploadError.message}`, 500);
    }

    const { data: urlData } = supabase.storage
      .from('feed-media')
      .getPublicUrl(fileName);

    return res.json({
      url: urlData.publicUrl,
      media_type: mediaType,
      file_name: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/feed - create a new post
router.post('/', authenticate, validate(createPostSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      content,
      title,
      image_url,
      type = 'post',
      tag,
      audience = 'public',
      feeling,
      location,
      tagged_friends,
      media_type = 'photo',
      video_url,
    } = req.body;
    const userId = req.user!.userId;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .eq('user_id', userId)
      .single();

    const authorName = profile
      ? `${profile.first_name} ${profile.last_name}`
      : req.user!.email.split('@')[0];

    const authorAvatar = profile?.avatar_url || (profile
      ? `${profile.first_name[0]}${profile.last_name[0]}`
      : req.user!.email[0].toUpperCase());

    const { data: post, error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: userId,
        type: type || 'post',
        title: title || '',
        content: content.trim(),
        author: authorName,
        author_avatar: authorAvatar,
        image_url: image_url || null,
        tag: tag || 'Alumni Post',
        tag_color: 'bg-emerald-50 text-emerald-700',
        is_official: req.user!.role === 'admin' || req.user!.role === 'staff',
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        audience: audience || 'public',
        feeling: feeling || null,
        location: location || null,
        tagged_friends: Array.isArray(tagged_friends) ? tagged_friends : [],
        media_type: media_type || 'photo',
        video_url: video_url || null,
        comments_disabled: false,
        reactions_summary: {},
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    addActivity(authorName, 'created', 'a new post').catch(() => {});
    res.status(201).json({
      ...post,
      liked: false,
      user_reaction: null,
      top_reactions: [],
      reactions_summary: {},
      comments: [],
    });
  } catch (err) { next(err); }
});

// PUT /api/feed/:id - edit post
router.put('/:id', authenticate, validate(updatePostSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = req.params.id;
    const { data: post, error: findError } = await supabase
      .from('feed_posts')
      .select('id, user_id')
      .eq('id', postId)
      .single();

    if (findError || !post) throw new AppError('Post not found', 404);

    if (post.user_id !== req.user!.userId && req.user!.role !== 'admin') {
      throw new AppError('Unauthorized: You can only edit your own posts.', 403);
    }

    const { content, title, image_url, audience, feeling, location, tagged_friends, comments_disabled } = req.body;
    const updateData: any = { updated_at: new Date().toISOString() };
    if (content !== undefined) updateData.content = content.trim();
    if (title !== undefined) updateData.title = title;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (audience !== undefined) updateData.audience = audience;
    if (feeling !== undefined) updateData.feeling = feeling;
    if (location !== undefined) updateData.location = location;
    if (tagged_friends !== undefined) updateData.tagged_friends = tagged_friends;
    if (comments_disabled !== undefined) updateData.comments_disabled = comments_disabled;

    const { data: updated, error } = await supabase
      .from('feed_posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/feed/:id/reaction - react to post with real emoji
router.post('/:id/reaction', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user!.userId;
    const reaction = req.body.reaction || '👍';

    const { data: existing } = await supabase
      .from('feed_post_likes')
      .select('id, reaction_type')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    let userReaction: string | null = null;
    let liked = false;

    if (existing && existing.reaction_type === reaction) {
      // Toggle off
      await supabase.from('feed_post_likes').delete().eq('id', existing.id);
      liked = false;
      userReaction = null;
    } else if (existing) {
      // Switch reaction
      await supabase
        .from('feed_post_likes')
        .update({ reaction_type: reaction })
        .eq('id', existing.id);
      liked = true;
      userReaction = reaction;
    } else {
      // Insert new reaction
      await supabase
        .from('feed_post_likes')
        .insert({ post_id: postId, user_id: userId, reaction_type: reaction });
      liked = true;
      userReaction = reaction;

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', userId)
        .single();
      const displayName = profile ? `${profile.first_name} ${profile.last_name[0]}.` : 'An alumnus';
      addActivity(displayName, 'reacted to', 'a post').catch(() => {});
    }

    // Recompute total count and summary
    const { data: allLikes } = await supabase
      .from('feed_post_likes')
      .select('reaction_type')
      .eq('post_id', postId);

    const summary: Record<string, number> = {};
    (allLikes || []).forEach((l: any) => {
      const r = l.reaction_type || '👍';
      summary[r] = (summary[r] || 0) + 1;
    });
    const totalCount = (allLikes || []).length;

    await supabase
      .from('feed_posts')
      .update({ like_count: totalCount, reactions_summary: summary })
      .eq('id', postId);

    if (liked) {
      const { data: postData } = await supabase
        .from('feed_posts')
        .select('id, user_id, title, content')
        .eq('id', postId)
        .maybeSingle();

      if (postData && postData.user_id && postData.user_id !== userId) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', userId)
          .maybeSingle();

        const senderName = senderProfile
          ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim()
          : 'An alumnus';

        createNotification({
          userId: postData.user_id,
          type: 'post',
          title: 'New Reaction on Your Post',
          message: `${senderName} reacted ${userReaction || '👍'} to your post.`,
          link: '/?post=' + postId,
        }).catch(() => {});
      }
    }

    const topReactions = Object.entries(summary)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emoji]) => emoji);

    res.json({
      liked,
      user_reaction: userReaction,
      like_count: totalCount,
      reactions_summary: summary,
      top_reactions: topReactions.length > 0 ? topReactions : (totalCount > 0 ? ['👍'] : []),
    });
  } catch (err) { next(err); }
});

// POST /api/feed/:id/like - backward compatibility alias
router.post('/:id/like', authenticate, async (req: AuthenticatedRequest, res, next) => {
  req.body.reaction = req.body.reaction || '👍';
  const postId = req.params.id;
  const userId = req.user!.userId;
  const reaction = req.body.reaction;

  try {
    const { data: existing } = await supabase
      .from('feed_post_likes')
      .select('id, reaction_type')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    let userReaction: string | null = null;
    let liked = false;

    if (existing && existing.reaction_type === reaction) {
      await supabase.from('feed_post_likes').delete().eq('id', existing.id);
      liked = false;
      userReaction = null;
    } else if (existing) {
      await supabase
        .from('feed_post_likes')
        .update({ reaction_type: reaction })
        .eq('id', existing.id);
      liked = true;
      userReaction = reaction;
    } else {
      await supabase
        .from('feed_post_likes')
        .insert({ post_id: postId, user_id: userId, reaction_type: reaction });
      liked = true;
      userReaction = reaction;
    }

    const { data: allLikes } = await supabase
      .from('feed_post_likes')
      .select('reaction_type')
      .eq('post_id', postId);

    const summary: Record<string, number> = {};
    (allLikes || []).forEach((l: any) => {
      const r = l.reaction_type || '👍';
      summary[r] = (summary[r] || 0) + 1;
    });
    const totalCount = (allLikes || []).length;

    await supabase
      .from('feed_posts')
      .update({ like_count: totalCount, reactions_summary: summary })
      .eq('id', postId);

    if (liked) {
      const { data: postData } = await supabase
        .from('feed_posts')
        .select('id, user_id')
        .eq('id', postId)
        .maybeSingle();

      if (postData && postData.user_id && postData.user_id !== userId) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', userId)
          .maybeSingle();

        const senderName = senderProfile
          ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim()
          : 'An alumnus';

        createNotification({
          userId: postData.user_id,
          type: 'post',
          title: 'New Reaction on Your Post',
          message: `${senderName} reacted ${userReaction || '👍'} to your post.`,
          link: '/?post=' + postId,
        }).catch(() => {});
      }
    }

    const topReactions = Object.entries(summary)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emoji]) => emoji);

    res.json({
      liked,
      user_reaction: userReaction,
      like_count: totalCount,
      reactions_summary: summary,
      top_reactions: topReactions.length > 0 ? topReactions : (totalCount > 0 ? ['👍'] : []),
    });
  } catch (err) { next(err); }
});

// POST /api/feed/:id/comments - add a comment or reply
router.post('/:id/comments', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { content, parent_id } = req.body;
    if (!content || !content.trim()) throw new AppError('Comment content is required', 400);

    // Check if comments disabled
    const { data: post } = await supabase
      .from('feed_posts')
      .select('id, user_id, comments_disabled')
      .eq('id', req.params.id)
      .single();

    if (post?.comments_disabled) {
      throw new AppError('Comments are turned off for this post.', 400);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('user_id', req.user!.userId)
      .single();

    const displayName = profile
      ? `${profile.first_name} ${profile.last_name}`
      : req.user!.email;
    const avatar = profile?.avatar_url || (profile
      ? `${profile.first_name[0]}${profile.last_name[0]}`
      : req.user!.email[0].toUpperCase());

    const { data: comment, error } = await supabase
      .from('feed_post_comments')
      .insert({
        post_id: req.params.id,
        user_id: req.user!.userId,
        author: displayName,
        author_avatar: avatar,
        content: content.trim(),
        parent_id: parent_id || null,
        like_count: 0,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    // Increment comment count on the post
    const { data: curr } = await supabase
      .from('feed_posts')
      .select('comment_count')
      .eq('id', req.params.id)
      .single();
    await supabase.from('feed_posts')
      .update({ comment_count: (curr?.comment_count || 0) + 1 })
      .eq('id', req.params.id);

    addActivity(displayName, parent_id ? 'replied to a comment on' : 'commented on', 'a post').catch(() => {});

    // Notify post author if not self
    if (post && post.user_id && post.user_id !== req.user!.userId) {
      const snippet = content.trim().length > 60 ? content.trim().slice(0, 60) + '...' : content.trim();
      createNotification({
        userId: post.user_id,
        type: 'post',
        title: 'New Comment on Your Post',
        message: `${displayName} commented: "${snippet}"`,
        link: '/?post=' + req.params.id,
      }).catch(() => {});
    }

    // If this is a reply to another comment, notify the parent comment author
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('feed_post_comments')
        .select('user_id')
        .eq('id', parent_id)
        .maybeSingle();

      if (
        parentComment &&
        parentComment.user_id &&
        parentComment.user_id !== req.user!.userId &&
        parentComment.user_id !== post?.user_id
      ) {
        const snippet = content.trim().length > 60 ? content.trim().slice(0, 60) + '...' : content.trim();
        createNotification({
          userId: parentComment.user_id,
          type: 'post',
          title: 'New Reply to Your Comment',
          message: `${displayName} replied: "${snippet}"`,
          link: '/?post=' + req.params.id,
        }).catch(() => {});
      }
    }

    res.status(201).json({ ...comment, replies: [], liked: false, user_reaction: null });
  } catch (err) { next(err); }
});

// POST /api/feed/comments/:id/reaction - react to a comment with real emoji
router.post('/comments/:id/reaction', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const commentId = req.params.id;
    const userId = req.user!.userId;
    const reaction = req.body.reaction || '👍';

    const { data: existing } = await supabase
      .from('feed_comment_reactions')
      .select('id, reaction_type')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    let liked = false;
    let userReaction: string | null = null;

    if (existing && existing.reaction_type === reaction) {
      await supabase.from('feed_comment_reactions').delete().eq('id', existing.id);
      liked = false;
      userReaction = null;
    } else if (existing) {
      await supabase.from('feed_comment_reactions').update({ reaction_type: reaction }).eq('id', existing.id);
      liked = true;
      userReaction = reaction;
    } else {
      await supabase.from('feed_comment_reactions').insert({ comment_id: commentId, user_id: userId, reaction_type: reaction });
      liked = true;
      userReaction = reaction;
    }

    const { count } = await supabase
      .from('feed_comment_reactions')
      .select('id', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    await supabase.from('feed_post_comments').update({ like_count: count || 0 }).eq('id', commentId);

    if (liked) {
      const { data: c } = await supabase
        .from('feed_post_comments')
        .select('id, user_id, post_id, content')
        .eq('id', commentId)
        .maybeSingle();

      if (c && c.user_id && c.user_id !== userId) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', userId)
          .maybeSingle();

        const senderName = senderProfile
          ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim()
          : 'An alumnus';

        createNotification({
          userId: c.user_id,
          type: 'post',
          title: 'Reaction to Your Comment',
          message: `${senderName} reacted ${userReaction || '👍'} to your comment.`,
          link: '/?post=' + c.post_id,
        }).catch(() => {});
      }
    }

    res.json({ liked, user_reaction: userReaction, like_count: count || 0 });
  } catch (err) { next(err); }
});

// DELETE /api/feed/comments/:id - delete a comment
router.delete('/comments/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: comment, error: findError } = await supabase
      .from('feed_post_comments')
      .select('id, post_id, user_id')
      .eq('id', req.params.id)
      .single();

    if (findError || !comment) throw new AppError('Comment not found', 404);

    if (comment.user_id !== req.user!.userId && req.user!.role !== 'admin') {
      throw new AppError('Unauthorized: You can only delete your own comments.', 403);
    }

    const { error } = await supabase
      .from('feed_post_comments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw new AppError(error.message, 500);

    if (comment.post_id) {
      const { data: curr } = await supabase
        .from('feed_posts')
        .select('comment_count')
        .eq('id', comment.post_id)
        .single();
      await supabase.from('feed_posts')
        .update({ comment_count: Math.max(0, (curr?.comment_count || 1) - 1) })
        .eq('id', comment.post_id);
    }

    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
});

// POST /api/feed/:id/report - report inappropriate content
router.post('/:id/report', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user!.userId;
    const { reason, details } = req.body;

    if (!reason || !reason.trim()) throw new AppError('Report reason is required', 400);

    const { error } = await supabase
      .from('feed_post_reports')
      .insert({
        post_id: postId,
        user_id: userId,
        reason: reason.trim(),
        details: details ? details.trim() : null,
      });

    if (error) throw new AppError(error.message, 500);

    res.status(201).json({ message: 'Report submitted. Our moderation team will review this post.' });
  } catch (err) { next(err); }
});

// POST /api/feed/:id/share - increment share count
router.post('/:id/share', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = req.params.id;
    const { data: curr } = await supabase
      .from('feed_posts')
      .select('share_count')
      .eq('id', postId)
      .single();

    const newCount = (curr?.share_count || 0) + 1;
    await supabase
      .from('feed_posts')
      .update({ share_count: newCount })
      .eq('id', postId);

    res.json({ share_count: newCount });
  } catch (err) { next(err); }
});

// DELETE /api/feed/:id - delete a post
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = req.params.id;
    const { data: post, error: findError } = await supabase
      .from('feed_posts')
      .select('id, user_id')
      .eq('id', postId)
      .single();

    if (findError || !post) throw new AppError('Post not found', 404);

    if (post.user_id !== req.user!.userId && req.user!.role !== 'admin') {
      throw new AppError('Unauthorized: You can only delete your own posts.', 403);
    }

    const { error } = await supabase.from('feed_posts').delete().eq('id', postId);
    if (error) throw new AppError(error.message, 500);

    res.json({ message: 'Post deleted successfully' });
  } catch (err) { next(err); }
});

export default router;
