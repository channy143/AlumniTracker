import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { getPesoEventsAndAnnouncements, PESO_FB_PAGE_URL } from '../services/pesoFacebookService';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    let result: any[] = [];

    const { data: events, error } = await supabase
      .from('feed_posts')
      .select('id, title, content, created_at, image_url, company, job_url, event_date, event_time, event_location, event_gallery')
      .eq('type', 'event')
      .order('created_at', { ascending: false });

    if (error) {
      // Fall back when the event_* columns do not exist yet (migration not applied)
      const { data: eventsFallback } = await supabase
        .from('feed_posts')
        .select('id, title, content, created_at, image_url, company, job_url')
        .eq('type', 'event')
        .order('created_at', { ascending: false });
      result = eventsFallback || [];
    } else {
      result = events || [];
    }

    const dbEvents = result.map((e: any) => ({
      id: e.id,
      name: e.title,
      description: e.content || '',
      date: e.event_date
        ? new Date(e.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : (e.created_at ? new Date(e.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''),
      event_date: e.event_date || null,
      time: e.event_time || '',
      location: e.event_location || '',
      organizer: e.company || '',
      banner: e.image_url || '',
      registration_link: e.job_url || '',
      gallery: e.event_gallery || [],
      created_at: e.created_at,
    }));

    // Fetch official PESO Facebook events (e.g. City of Naga Year-End Job Fair)
    let pesoEvents: any[] = [];
    try {
      const pesoItems = await getPesoEventsAndAnnouncements();
      pesoEvents = (pesoItems || [])
        .filter((p) => /job fair|event|gymnasium/i.test(`${p.position} ${p.job_type}`))
        .map((p) => {
          const venueMatch = p.description.match(/(?:Venue\s*:|📍\s*(?:Venue\s*:)?)\s*([^\n\r]+)/i);
          const dateMatch = p.description.match(/(?:Date\s*:|🗓\s*(?:Date\s*:)?)\s*([^\n\r]+)/i);
          const timeMatch = p.description.match(/(?:Time\s*:|⏰\s*(?:Time\s*:)?)\s*([^\n\r]+)/i);
          return {
            id: p.id,
            name: p.position,
            description: p.description,
            date: dateMatch ? dateMatch[1].trim() : 'November 27, 2026',
            event_date: '2026-11-27',
            time: timeMatch ? timeMatch[1].trim() : '9:00 A.M. - 4:00 P.M.',
            location: venueMatch ? venueMatch[1].trim() : p.location || 'Brgy. Colon Gymnasium, City of Naga, Cebu',
            organizer: 'PESO - City of Naga, Cebu',
            banner: p.poster_url || (p.gallery_images && p.gallery_images[0]) || '',
            registration_link: p.application_url || PESO_FB_PAGE_URL,
            gallery: p.gallery_images || [],
            created_at: p.created_at,
          };
        });
    } catch {}

    const combinedEvents = [...pesoEvents, ...dbEvents];
    res.json(combinedEvents);
  } catch (err) { next(err); }
});

export default router;
