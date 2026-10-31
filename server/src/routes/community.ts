import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

const DEFAULT_GROUPS = [
  {
    name: 'Career & Job Opportunities',
    description: 'Share job openings, referrals, hiring leads, and freelance opportunities for CTU-Naga alumni.',
    category: 'general',
    member_count: 1,
    post_count: 0,
  },
  {
    name: 'Tech & Engineering Network',
    description: 'Connect with fellow IT, Computer, and Engineering alumni on software, hardware, and tech trends.',
    category: 'tech',
    member_count: 1,
    post_count: 0,
  },
  {
    name: 'Business & Entrepreneurship',
    description: 'Showcase alumni businesses, startups, partnerships, and management insights.',
    category: 'entrepreneurship',
    member_count: 1,
    post_count: 0,
  },
  {
    name: 'Education & Research Hub',
    description: 'Discuss teaching opportunities, graduate studies, licensure exams, and academic collaborations.',
    category: 'education',
    member_count: 1,
    post_count: 0,
  },
  {
    name: 'General Alumni Lounge',
    description: 'Batch reunions, campus updates, mentorship questions, and casual networking.',
    category: 'business',
    member_count: 1,
    post_count: 0,
  },
];

async function getProfileForUser(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url, headline')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

function formatForumPost(post: any, myProfileId?: string | null) {
  const authorObj = Array.isArray(post.author) ? post.author[0] : post.author;
  const groupObj = Array.isArray(post.group) ? post.group[0] : post.group;
  const likedBy: string[] = Array.isArray(post.liked_by) ? post.liked_by : [];
  const comments: any[] = Array.isArray(post.comments) ? post.comments : [];

  return {
    ...post,
    author_id: post.author_id,
    author_name:
      `${authorObj?.first_name || ''} ${authorObj?.last_name || ''}`.trim() ||
      post.author_name ||
      'CTU-Naga Alumnus',
    author_avatar: authorObj?.avatar_url || post.author_avatar || null,
    author_headline: authorObj?.headline || null,
    group_name: groupObj?.name || post.group_name || 'Alumni Forum',
    group_category: groupObj?.category || 'general',
    tags: Array.isArray(post.tags) ? post.tags : [],
    like_count: typeof post.like_count === 'number' ? post.like_count : likedBy.length,
    likes_count: typeof post.like_count === 'number' ? post.like_count : likedBy.length,
    liked: Boolean(myProfileId && likedBy.includes(myProfileId)),
    comment_count: typeof post.comment_count === 'number' ? post.comment_count : comments.length,
    comments_count: typeof post.comment_count === 'number' ? post.comment_count : comments.length,
    comments,
  };
}

router.get('/groups', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const profile = await getProfileForUser(req.user!.userId);

    let { data: groups, error } = await supabase
      .from('community_groups')
      .select('*')
      .order('name');

    if (error) throw new AppError(error.message, 500);

    if (!groups || groups.length === 0) {
      const { data: seeded } = await supabase
        .from('community_groups')
        .insert(DEFAULT_GROUPS)
        .select('*');
      if (seeded) groups = seeded;
    }

    let joinedIds = new Set<string>();
    if (profile?.id) {
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('profile_id', profile.id);
      joinedIds = new Set((memberships || []).map((m: any) => m.group_id));
    }

    const groupsWithCounts = (groups || []).map((g: any) => ({
      ...g,
      member_count: g.member_count || 0,
      post_count: g.post_count || 0,
      is_member: joinedIds.has(g.id),
    }));

    res.json(groupsWithCounts);
  } catch (err) {
    next(err);
  }
});

router.post('/groups', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name, description, category } = req.body;
    if (!name || !name.trim()) throw new AppError('Group name is required', 400);

    const profile = await getProfileForUser(req.user!.userId);
    if (!profile) throw new AppError('Profile not found', 404);

    const allowedCategories = ['tech', 'business', 'education', 'entrepreneurship', 'general'];
    const safeCategory = allowedCategories.includes(category) ? category : 'general';

    const { data: group, error } = await supabase
      .from('community_groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        category: safeCategory,
        created_by: profile.id,
        member_count: 1,
        post_count: 0,
      })
      .select('*')
      .single();

    if (error || !group) throw new AppError(error?.message || 'Failed to create group', 500);

    await supabase
      .from('group_members')
      .insert({ group_id: group.id, profile_id: profile.id, role: 'admin' })
      .select()
      .maybeSingle();

    res.status(201).json({ ...group, is_member: true });
  } catch (err) {
    next(err);
  }
});

router.post('/groups/:id/join', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const groupId = req.params.id;
    const profile = await getProfileForUser(req.user!.userId);
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('profile_id', profile.id)
      .maybeSingle();

    let joined = false;
    if (existing) {
      await supabase.from('group_members').delete().eq('id', existing.id);
      joined = false;
    } else {
      await supabase
        .from('group_members')
        .insert({ group_id: groupId, profile_id: profile.id, role: 'member' });
      joined = true;
    }

    const { data: updatedGroup } = await supabase
      .from('community_groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle();

    res.json({
      joined,
      member_count: updatedGroup?.member_count ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/posts', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const profile = await getProfileForUser(req.user!.userId);
    const { data: posts, error } = await supabase
      .from('forum_posts')
      .select('*, author:profiles(id, first_name, last_name, avatar_url, headline), group:community_groups(id, name, category)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new AppError(error.message, 500);
    res.json((posts || []).map((p: any) => formatForumPost(p, profile?.id)));
  } catch (err) {
    next(err);
  }
});

router.get('/groups/:id/posts', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const profile = await getProfileForUser(req.user!.userId);
    let query = supabase
      .from('forum_posts')
      .select('*, author:profiles(id, first_name, last_name, avatar_url, headline), group:community_groups(id, name, category)')
      .order('created_at', { ascending: false });

    if (req.params.id && req.params.id !== 'all') {
      query = query.eq('group_id', req.params.id);
    }

    const { data: posts, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json((posts || []).map((p: any) => formatForumPost(p, profile?.id)));
  } catch (err) {
    next(err);
  }
});

router.post('/posts', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const profile = await getProfileForUser(req.user!.userId);
    if (!profile) throw new AppError('Profile not found', 404);

    const { group_id, title, content, tags } = req.body;
    if (!title || !title.trim() || !content || !content.trim()) {
      throw new AppError('Title and content are required', 400);
    }

    const safeTags = Array.isArray(tags)
      ? tags.map((t: any) => String(t).trim()).filter(Boolean)
      : [];

    if (group_id) {
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group_id)
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!existingMember) {
        await supabase
          .from('group_members')
          .insert({ group_id, profile_id: profile.id, role: 'member' });
      }
    }

    const { data: post, error } = await supabase
      .from('forum_posts')
      .insert({
        group_id: group_id || null,
        author_id: profile.id,
        title: title.trim(),
        content: content.trim(),
        tags: safeTags,
      })
      .select('*, author:profiles(id, first_name, last_name, avatar_url, headline), group:community_groups(id, name, category)')
      .single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json(formatForumPost(post, profile.id));
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:id/like', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = req.params.id;
    const profile = await getProfileForUser(req.user!.userId);
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: post, error: fetchErr } = await supabase
      .from('forum_posts')
      .select('id, like_count, liked_by')
      .eq('id', postId)
      .maybeSingle();

    if (fetchErr || !post) throw new AppError('Post not found', 404);

    const likedBy: string[] = Array.isArray(post.liked_by) ? [...post.liked_by] : [];
    const idx = likedBy.indexOf(profile.id);
    let liked = false;

    if (idx >= 0) {
      likedBy.splice(idx, 1);
      liked = false;
    } else {
      likedBy.push(profile.id);
      liked = true;
    }

    const newCount = likedBy.length;
    const { error: updateErr } = await supabase
      .from('forum_posts')
      .update({ liked_by: likedBy, like_count: newCount })
      .eq('id', postId);

    if (updateErr) throw new AppError(updateErr.message, 500);

    res.json({ id: postId, liked, like_count: newCount });
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:id/comments', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = req.params.id;
    const content = (req.body?.content || '').trim();
    if (!content) throw new AppError('Comment content is required', 400);

    const profile = await getProfileForUser(req.user!.userId);
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: post, error: fetchErr } = await supabase
      .from('forum_posts')
      .select('id, comments, comment_count')
      .eq('id', postId)
      .maybeSingle();

    if (fetchErr || !post) throw new AppError('Post not found', 404);

    const existingComments: any[] = Array.isArray(post.comments) ? [...post.comments] : [];
    const newComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      author_id: profile.id,
      author_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'CTU-Naga Alumnus',
      author_avatar: profile.avatar_url || null,
      author_headline: profile.headline || null,
      content,
      created_at: new Date().toISOString(),
    };

    const updatedComments = [...existingComments, newComment];
    const newCount = updatedComments.length;

    const { error: updateErr } = await supabase
      .from('forum_posts')
      .update({
        comments: updatedComments,
        comment_count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (updateErr) throw new AppError(updateErr.message, 500);

    res.status(201).json({
      comment: newComment,
      comments: updatedComments,
      comment_count: newCount,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/posts/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const postId = req.params.id;
    const profile = await getProfileForUser(req.user!.userId);
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: post } = await supabase
      .from('forum_posts')
      .select('id, author_id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) throw new AppError('Post not found', 404);
    if (post.author_id !== profile.id && req.user!.role !== 'admin') {
      throw new AppError('Not authorized to delete this post', 403);
    }

    const { error } = await supabase.from('forum_posts').delete().eq('id', postId);
    if (error) throw new AppError(error.message, 500);

    res.json({ success: true, id: postId });
  } catch (err) {
    next(err);
  }
});

export default router;
