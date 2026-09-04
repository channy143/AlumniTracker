import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { addActivity } from '../services/activityStore';

const router = Router();

// GET /api/feed - list all feed posts with like status
router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sort } = req.query;
    let orderColumn = 'created_at';
    let ascending = false;

    if (sort === 'top') { orderColumn = 'like_count'; ascending = false; }
    else if (sort === 'hot' || sort === 'best') { orderColumn = 'like_count'; ascending = false; }

    const { data: posts, error } = await supabase
      .from('feed_posts')
      .select('*')
      .order(orderColumn, { ascending });

    if (error) throw new AppError(error.message, 500);

    // Merge published announcements from the announcements table so new admin
    // announcements appear on the alumni dashboard feed, newest first.
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
      created_at: a.published_at || a.created_at,
      updated_at: a.updated_at || a.created_at,
      linked_survey_id: a.linked_survey_id,
      event_date: null,
      event_time: null,
      event_location: null,
      event_gallery: [],
    }));

    const seen = new Set<string>();
    const merged = [...(posts || []), ...announcementPosts].filter((p: any) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    if (orderColumn === 'like_count') {
      merged.sort((a: any, b: any) => (b.like_count || 0) - (a.like_count || 0));
    } else {
      merged.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Check which posts the current user has liked
    const { data: likes } = await supabase
      .from('feed_post_likes')
      .select('post_id')
      .eq('user_id', req.user!.userId);

    const likedPostIds = new Set((likes || []).map((l: any) => l.post_id));
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
      return { ...p, liked: likedPostIds.has(p.id), linked_survey: linkedSurvey };
    }));

    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/feed/:id - single post with comments
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: post, error } = await supabase
      .from('feed_posts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw new AppError('Post not found', 404);

    // Check if user liked
    const { data: like } = await supabase
      .from('feed_post_likes')
      .select('id')
      .eq('post_id', req.params.id)
      .eq('user_id', req.user!.userId)
      .maybeSingle();

    const { data: comments, error: commentsError } = await supabase
      .from('feed_post_comments')
      .select('*')
      .eq('post_id', req.params.id)
      .order('created_at', { ascending: true });

    if (commentsError) throw new AppError(commentsError.message, 500);

    res.json({ ...post, liked: !!like, comments: comments || [] });
  } catch (err) { next(err); }
});

// POST /api/feed/:id/comments - add a comment
router.post('/:id/comments', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) throw new AppError('Comment content is required', 400);

    // Get user profile for display
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', req.user!.userId)
      .single();

    const displayName = profile
      ? `${profile.first_name} ${profile.last_name[0]}.`
      : req.user!.email;
    const avatar = profile
      ? `${profile.first_name[0]}${profile.last_name[0]}`
      : req.user!.email[0].toUpperCase();

    const { data: comment, error } = await supabase
      .from('feed_post_comments')
      .insert({
        post_id: req.params.id,
        user_id: req.user!.userId,
        author: displayName,
        author_avatar: avatar,
        content: content.trim(),
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

    addActivity(displayName, 'commented on', (comment as any)?.post_id ? 'a post' : 'a post').catch(() => {});

    res.status(201).json(comment);
  } catch (err) { next(err); }
});

// GET /api/feed/comments/mine - get current user's comments
router.get('/comments/mine', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: comments, error } = await supabase
      .from('feed_post_comments')
      .select('*, post:feed_posts(title)')
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);
    res.json(comments || []);
  } catch (err) { next(err); }
});

// DELETE /api/feed/comments/:id - delete a comment
router.delete('/comments/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: comment, error: findError } = await supabase
      .from('feed_post_comments')
      .select('id, post_id')
      .eq('id', req.params.id)
      .single();

    if (findError || !comment) throw new AppError('Comment not found', 404);

    const { error } = await supabase
      .from('feed_post_comments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw new AppError(error.message, 500);

    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
});

// POST /api/feed/:id/like - toggle like
router.post('/:id/like', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user!.userId;

    // Check if already liked
    const { data: existing } = await supabase
      .from('feed_post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    const { data: curr } = await supabase
      .from('feed_posts')
      .select('like_count')
      .eq('id', postId)
      .single();
    const currentCount = curr?.like_count || 0;

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .single();
    const displayName = profile
      ? `${profile.first_name} ${profile.last_name[0]}.`
      : req.user!.email.split('@')[0];

    if (existing) {
      await supabase.from('feed_post_likes').delete().eq('id', existing.id);
      await supabase.from('feed_posts')
        .update({ like_count: Math.max(0, currentCount - 1) })
        .eq('id', postId);
      res.json({ liked: false });
    } else {
      await supabase.from('feed_post_likes').insert({ post_id: postId, user_id: userId });
      await supabase.from('feed_posts')
        .update({ like_count: currentCount + 1 })
        .eq('id', postId);
      addActivity(displayName, 'liked', 'a post').catch(() => {});
      res.json({ liked: true });
    }
  } catch (err) { next(err); }
});

export default router;
