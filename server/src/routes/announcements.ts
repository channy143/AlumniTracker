import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req, res, next) => {
  try {
    // 1. Fetch published announcements from announcements table
    const { data: announcements, error: annError } = await supabase
      .from('announcements')
      .select('*')
      .eq('status', 'published')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    // 2. Fetch announcements from feed_posts table
    const { data: feedPosts, error: feedError } = await supabase
      .from('feed_posts')
      .select('*')
      .eq('type', 'announcement')
      .order('created_at', { ascending: false });

    const rawAnnouncements = announcements || [];
    const rawFeedPosts = feedPosts || [];

    // Batch resolve creator emails
    const creatorIds = rawAnnouncements.map((a: any) => a.created_by).filter(Boolean);
    const creatorMap = new Map<string, string>();
    if (creatorIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', creatorIds);
      if (users) {
        users.forEach((u: any) => creatorMap.set(u.id, u.email));
      }
    }

    // Batch resolve linked surveys
    const surveyIds = rawAnnouncements.map((a: any) => a.linked_survey_id).filter(Boolean);
    const surveyMap = new Map<string, any>();
    if (surveyIds.length > 0) {
      const { data: surveys } = await supabase
        .from('surveys')
        .select('id, title, academic_year, status, is_active, expires_at')
        .in('id', surveyIds);
      if (surveys) {
        surveys.forEach((s: any) => surveyMap.set(s.id, s));
      }
    }

    const itemsFromAnnouncements = rawAnnouncements.map((a: any) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      image_url: a.image_url || null,
      document_url: a.document_url || null,
      is_pinned: !!a.is_pinned,
      created_at: a.created_at,
      created_by: creatorMap.get(a.created_by) || 'Admin',
      linked_survey: surveyMap.get(a.linked_survey_id) || null,
    }));

    // Seen IDs and Titles to prevent duplicates
    const seenIds = new Set(itemsFromAnnouncements.map((a: any) => a.id));
    const seenTitles = new Set(itemsFromAnnouncements.map((a: any) => a.title.toLowerCase().trim()));

    const itemsFromFeed = rawFeedPosts
      .filter((p: any) => !seenIds.has(p.id) && !seenTitles.has((p.title || '').toLowerCase().trim()))
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        image_url: p.image_url || null,
        document_url: null,
        is_pinned: (p.tag || '').toLowerCase().includes('pinned') || false,
        created_at: p.created_at,
        created_by: p.author || 'CTU-Naga Alumni Office',
        linked_survey: null,
      }));

    const combined = [...itemsFromAnnouncements, ...itemsFromFeed];

    // Sort: pinned first, then newest created_at first
    combined.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const dateA = new Date(a.created_at).getTime() || 0;
      const dateB = new Date(b.created_at).getTime() || 0;
      return dateB - dateA;
    });

    res.json(combined);
  } catch (err) { next(err); }
});

export default router;
