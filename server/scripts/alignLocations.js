require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const { normalizeCityName, normalizeProvinceName } = require('../dist/utils/formatLocation');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const EMBEDDED_PATTERNS = [
  { regex: /^cansimundong,\s*inoburan\s+city of naga/i, street: 'Cansimundong', barangay: 'Inoburan', city: 'City of Naga', province: 'Cebu' },
  { regex: /^cogon\s*,\s*city of nag[ae]/i, street: '', barangay: 'Cogon', city: 'City of Naga', province: 'Cebu' },
  { regex: /^mainit\s*,\s*city of naga/i, street: '', barangay: 'Mainit', city: 'City of Naga', province: 'Cebu' },
  { regex: /^tungkil\s+minglanilla/i, street: '', barangay: 'Tungkil', city: 'Minglanilla', province: 'Cebu' },
  { regex: /^tunghaan\s+minglanilla/i, street: '', barangay: 'Tunghaan', city: 'Minglanilla', province: 'Cebu' },
  { regex: /^pitalo[\s,]+san fernando/i, street: '', barangay: 'Pitalo', city: 'San Fernando', province: 'Cebu' },
  { regex: /^sorsogon\s*,\s*malabuyoc/i, street: '', barangay: 'Sorsogon', city: 'Malabuyoc', province: 'Cebu' },
  { regex: /^lamac\s*,\s*pinamungajan/i, street: '', barangay: 'Lamac', city: 'Pinamungajan', province: 'Cebu' },
];

function cleanLocation(rawCity, rawProvince, rawBarangay, rawStreet, rawAddress, rawResLoc, rawCountry) {
  let city = String(rawCity || '').trim();
  let province = String(rawProvince || '').trim();
  let barangay = String(rawBarangay || '').trim();
  let street = String(rawStreet || '').trim();
  let address = String(rawAddress || '').trim();
  let country = String(rawCountry || '').trim() || 'Philippines';
  let currentResidenceLocation = String(rawResLoc || '').trim();

  for (const pat of EMBEDDED_PATTERNS) {
    if (pat.regex.test(city)) {
      if (!street && pat.street) street = pat.street;
      if (!barangay && pat.barangay) barangay = pat.barangay;
      city = pat.city;
      if (!province) province = pat.province;
      break;
    }
  }

  province = normalizeProvinceName(province || 'Cebu');
  city = normalizeCityName(city, province);

  if (!address && (street || barangay)) {
    address = [street, barangay ? `Brgy. ${barangay.replace(/^brgy\.?\s*/i, '')}` : ''].filter(Boolean).join(', ');
  }

  if (currentResidenceLocation === 'Within Cebu / Naga City') {
    currentResidenceLocation = 'Same as address above';
  } else if (currentResidenceLocation === 'Overseas / OFW') {
    currentResidenceLocation = 'Abroad';
  }

  return { city, province, barangay, street, address, country, currentResidenceLocation };
}

(async () => {
  const apply = process.argv.includes('--apply');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);

  const { data: resps, error: rErr } = await sb.from('survey_responses').select('id, survey_id, user_id, responses');
  if (rErr) throw rErr;

  let respUpdated = 0;
  const userLocationMap = new Map();

  for (const r of resps || []) {
    const o = { ...(r.responses || {}) };
    const cleaned = cleanLocation(
      o.city,
      o.province,
      o.barangay,
      o.street,
      o.address,
      o.currentResidenceLocation,
      o.country
    );

    const changed =
      cleaned.city !== (o.city || '') ||
      cleaned.province !== (o.province || '') ||
      (cleaned.barangay && cleaned.barangay !== (o.barangay || '')) ||
      (cleaned.street && cleaned.street !== (o.street || '')) ||
      (cleaned.address && cleaned.address !== (o.address || '')) ||
      cleaned.country !== (o.country || '') ||
      (cleaned.currentResidenceLocation && cleaned.currentResidenceLocation !== (o.currentResidenceLocation || ''));

    if (r.user_id && (cleaned.city || cleaned.province || cleaned.address)) {
      userLocationMap.set(r.user_id, cleaned);
    }

    if (changed) {
      respUpdated++;
      const updatedResponses = {
        ...o,
        city: cleaned.city,
        province: cleaned.province,
        country: cleaned.country,
        ...(cleaned.barangay ? { barangay: cleaned.barangay } : {}),
        ...(cleaned.street ? { street: cleaned.street } : {}),
        ...(cleaned.address ? { address: cleaned.address } : {}),
        ...(cleaned.currentResidenceLocation ? { currentResidenceLocation: cleaned.currentResidenceLocation } : {}),
      };
      if (apply) {
        const { error: uErr } = await sb
          .from('survey_responses')
          .update({ responses: updatedResponses })
          .eq('id', r.id);
        if (uErr) console.error('Failed updating survey_response', r.id, uErr.message);
      }
    }
  }

  const { data: profs, error: pErr } = await sb
    .from('profiles')
    .select('id, user_id, address, city, province, country');
  if (pErr) throw pErr;

  let profUpdated = 0;
  for (const p of profs || []) {
    const fromSurvey = userLocationMap.get(p.user_id);
    const nextProv = normalizeProvinceName(p.province || fromSurvey?.province || '');
    const nextCity = normalizeCityName(p.city || fromSurvey?.city || '', nextProv);
    const nextAddr = String(p.address || '').trim() || fromSurvey?.address || '';
    const nextCountry = String(p.country || '').trim() || fromSurvey?.country || 'Philippines';

    const updates = {};
    if (nextProv && nextProv !== (p.province || '')) updates.province = nextProv;
    if (nextCity && nextCity !== (p.city || '')) updates.city = nextCity;
    if (nextAddr && nextAddr !== (p.address || '')) updates.address = nextAddr;
    if (nextCountry && nextCountry !== (p.country || '')) updates.country = nextCountry;

    if (Object.keys(updates).length > 0) {
      profUpdated++;
      if (apply) {
        updates.updated_at = new Date().toISOString();
        const { error: puErr } = await sb.from('profiles').update(updates).eq('id', p.id);
        if (puErr) console.error('Failed updating profile', p.id, puErr.message);
      }
    }
  }

  console.log(`Survey responses to update: ${respUpdated} / ${(resps || []).length}`);
  console.log(`Profiles to update: ${profUpdated} / ${(profs || []).length}`);
})();

