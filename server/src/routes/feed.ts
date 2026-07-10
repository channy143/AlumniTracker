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

    // Check which posts the current user has liked
    const { data: likes } = await supabase
      .from('feed_post_likes')
      .select('post_id')
      .eq('user_id', req.user!.userId);

    const likedPostIds = new Set((likes || []).map((l: any) => l.post_id));
    const result = (posts || []).map((p: any) => ({ ...p, liked: likedPostIds.has(p.id) }));

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

// POST /api/feed/seed - seed initial welcome posts (admin only)
router.post('/seed', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.user!.role !== 'admin') throw new AppError('Admin only', 403);

    // Check if posts already exist
    const { count } = await supabase
      .from('feed_posts')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      return res.json({ message: 'Feed posts already seeded', count });
    }

    const posts = [
      {
        type: 'announcement', title: 'Welcome to CTU-Naga Extension Campus Alumni Network',
        content: 'We are thrilled to welcome you to the official alumni network of CTU-Naga Extension Campus! This platform is designed to help you connect with fellow alumni, discover career opportunities, find mentors, and stay updated with campus events. Please take a moment to complete your profile and make the most of your alumni experience.',
        author: 'CTU-Naga Alumni Office', author_avatar: 'C',
        tag: 'Official Announcement', tag_color: 'bg-blue-50 text-blue-700',
        is_official: true, image_url: '/image/ChatGPT Image May 27, 2026, 04_38_30 AM.png',
        like_count: 156, comment_count: 3,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        type: 'guide', title: 'How to Complete Your Alumni Profile',
        content: 'Your alumni profile is your digital identity in this community. A complete profile helps you get discovered by employers, mentors, and fellow alumni. Here is how to get started: (1) Click your avatar in the top-right corner, (2) Select "My Profile", (3) Add your photo, education details, and employment information, (4) Write a brief bio about your career journey.',
        author: 'CTU-Naga Alumni Office', author_avatar: 'C',
        tag: 'Guide', tag_color: 'bg-green-50 text-green-700',
        is_official: true, like_count: 89, comment_count: 0,
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        type: 'job', title: 'Senior Software Engineer',
        content: 'Accenture is looking for a Senior Software Engineer with 3+ years of experience in full-stack development. Proficiency in React, Node.js, and cloud services (AWS/Azure) is required.',
        author: 'Career Services', author_avatar: 'CS',
        tag: 'Job Opportunity', tag_color: 'bg-purple-50 text-purple-700',
        company: 'Accenture', job_url: '/jobs',
        is_official: true, like_count: 45, comment_count: 0,
        created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
      },
      {
        type: 'guide', title: 'How to Update Your Employment Information',
        content: 'Keeping your employment information up to date is crucial for career networking. Visit your Profile page and navigate to the Employment Information section to add your current job and update your employment history.',
        author: 'CTU-Naga Alumni Office', author_avatar: 'C',
        tag: 'Guide', tag_color: 'bg-green-50 text-green-700',
        is_official: true, like_count: 67, comment_count: 0,
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        type: 'discussion', title: 'Career Growth in Tech: Tips from CTU-Naga Alumni',
        content: 'I wanted to start a discussion thread where we can share career growth tips. As a 2019 BSIT graduate working in the tech industry, I have found that continuous learning and networking are key.',
        author: 'Christian M.', author_avatar: 'CM',
        tag: 'Discussion', tag_color: 'bg-yellow-50 text-yellow-700',
        is_official: false, like_count: 34, comment_count: 0,
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        type: 'event', title: 'Upcoming Alumni Homecoming 2026',
        content: 'Mark your calendars! The annual CTU-Naga Extension Campus Alumni Homecoming is scheduled for December 15, 2026. This year\u2019s theme is \u201cBridging Education to Eternity\u201d. We will have networking sessions, career panels, and a grand alumni dinner.',
        author: 'CTU-Naga Alumni Office', author_avatar: 'C',
        tag: 'Event', tag_color: 'bg-pink-50 text-pink-700',
        is_official: true, like_count: 112, comment_count: 0,
        created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
      {
        type: 'guide', title: 'How to Find a Mentor',
        content: 'The Mentorship platform connects CTU-Naga alumni with experienced professionals in their field. To find a mentor, go to the Mentorship page, browse available mentors by industry, and send a mentorship request.',
        author: 'CTU-Naga Alumni Office', author_avatar: 'C',
        tag: 'Guide', tag_color: 'bg-green-50 text-green-700',
        is_official: true, like_count: 78, comment_count: 0,
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        type: 'job', title: 'Junior Web Developer',
        content: 'A local tech company is hiring a Junior Web Developer for their growing team. Ideal candidates are recent CTU-Naga graduates with knowledge of HTML, CSS, JavaScript, and basic PHP.',
        author: 'Career Services', author_avatar: 'CS',
        tag: 'Job Opportunity', tag_color: 'bg-purple-50 text-purple-700',
        company: 'TechStart Solutions', job_url: '/jobs',
        is_official: true, like_count: 52, comment_count: 0,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        type: 'announcement', title: 'CTU-Naga Extension Campus Recent Achievements',
        content: 'We are proud to announce that CTU-Naga Extension Campus has been recognized as one of the top-performing institutions in the region for graduate employment. Our alumni have secured positions at leading companies including Accenture, IBM, and local government agencies.',
        author: 'CTU-Naga Alumni Office', author_avatar: 'C',
        tag: 'Announcement', tag_color: 'bg-blue-50 text-blue-700',
        is_official: true, like_count: 201, comment_count: 0,
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        type: 'discussion', title: 'How Did CTU-Naga Prepare You for the Workforce?',
        content: 'I would love to hear from fellow alumni about how our time at CTU-Naga Extension Campus prepared us for our careers. For me, the hands-on projects and industry partnerships made a huge difference.',
        author: 'Maria L.', author_avatar: 'ML',
        tag: 'Discussion', tag_color: 'bg-yellow-50 text-yellow-700',
        is_official: false, like_count: 41, comment_count: 0,
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ];

    const { data, error } = await supabase.from('feed_posts').insert(posts).select();

    if (error) throw new AppError(error.message, 500);

    // Insert welcome sample comments for the first post
    const welcomeComments = [
      { post_id: data![0].id, author: 'Ana R.', author_avatar: 'AR', content: 'Welcome! So glad to be part of this community!', like_count: 12 },
      { post_id: data![0].id, author: 'Mark D.', author_avatar: 'MD', content: 'This is exactly what we needed. Looking forward to connecting with fellow alumni.', like_count: 8 },
      { post_id: data![0].id, author: 'Catherine L.', author_avatar: 'CL', content: 'Great initiative from the alumni office!', like_count: 5 },
    ];

    await supabase.from('feed_post_comments').insert(welcomeComments);
    await supabase.from('feed_posts').update({ comment_count: 3 }).eq('id', data![0].id);

    res.json({ message: 'Feed seeded successfully', count: posts.length });
  } catch (err) { next(err); }
});

export default router;
