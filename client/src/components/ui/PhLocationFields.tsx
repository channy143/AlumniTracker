import { useEffect, useMemo, useState } from 'react';
import {
  PsgcOption,
  fetchPhProvinces,
  fetchPhCitiesByProvince,
  fetchPhBarangaysByCity,
  normalizeCityForMatch,
} from '@/utils/phLocations';

export interface PhLocationValue {
  country: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
}

interface PhLocationFieldsProps {
  value: PhLocationValue;
  onChange: (next: PhLocationValue) => void;
  required?: boolean;
  inputClassName?: string;
  labelClassName?: string;
}

export function PhLocationFields({
  value,
  onChange,
  required = false,
  inputClassName = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 bg-white',
  labelClassName = 'block text-xs text-gray-500 mb-1',
}: PhLocationFieldsProps) {
  const [provinces, setProvinces] = useState<PsgcOption[]>([]);
  const [cities, setCities] = useState<PsgcOption[]>([]);
  const [barangays, setBarangays] = useState<PsgcOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  const isPhilippines = !value.country || value.country.toLowerCase() === 'philippines';

  useEffect(() => {
    fetchPhProvinces().then(setProvinces);
  }, []);

  const matchedProvince = useMemo(() => {
    const prov = String(value.province || '').trim().toLowerCase();
    if (!prov) return undefined;
    return provinces.find(
      (p) => p.name.toLowerCase() === prov || p.name.toLowerCase().includes(prov)
    );
  }, [provinces, value.province]);

  useEffect(() => {
    if (!isPhilippines || !matchedProvince) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    fetchPhCitiesByProvince(matchedProvince.code)
      .then((list) => {
        if (!cancelled) setCities(list);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPhilippines, matchedProvince]);

  const matchedCity = useMemo(() => {
    const city = String(value.city || '').trim();
    if (!city) return undefined;
    return cities.find(
      (c) =>
        c.name.toLowerCase() === city.toLowerCase() ||
        normalizeCityForMatch(c.name) === normalizeCityForMatch(city)
    );
  }, [cities, value.city]);

  useEffect(() => {
    if (!isPhilippines || !matchedCity) {
      setBarangays([]);
      return;
    }
    let cancelled = false;
    setLoadingBarangays(true);
    fetchPhBarangaysByCity(matchedCity.code)
      .then((list) => {
        if (!cancelled) setBarangays(list);
      })
      .finally(() => {
        if (!cancelled) setLoadingBarangays(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPhilippines, matchedCity]);

  const matchedBarangay = useMemo(() => {
    const brgy = String(value.barangay || '').trim().toLowerCase();
    if (!brgy) return undefined;
    return barangays.find((b) => b.name.toLowerCase() === brgy);
  }, [barangays, value.barangay]);

  const hasUnmatchedLegacyLocation =
    isPhilippines &&
    ((Boolean(value.province.trim()) && provinces.length > 0 && !matchedProvince) ||
      (Boolean(value.city.trim()) && cities.length > 0 && !matchedCity));

  return (
    <div className="space-y-3">
      {hasUnmatchedLegacyLocation && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          Your saved location does not match the standard PSGC list yet. Please re-select your Province, City / Municipality, and Barangay below to standardize it.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClassName}>
            Country {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
          </label>
          <select
            value={isPhilippines ? 'Philippines' : 'Other'}
            onChange={(e) => {
              const nextCountry = e.target.value === 'Philippines' ? 'Philippines' : '';
              onChange({
                ...value,
                country: nextCountry,
                province: '',
                city: '',
                barangay: '',
              });
            }}
            className={inputClassName}
          >
            <option value="Philippines">Philippines</option>
            <option value="Other">Abroad / Other Country</option>
          </select>
        </div>

        {!isPhilippines ? (
          <div>
            <label className={labelClassName}>
              Country Name {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
            </label>
            <input
              type="text"
              value={value.country}
              onChange={(e) => onChange({ ...value, country: e.target.value })}
              placeholder="e.g. Singapore, UAE, Japan"
              className={inputClassName}
            />
          </div>
        ) : (
          <div>
            <label className={labelClassName}>
              Province {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
            </label>
            <select
              value={matchedProvince ? matchedProvince.name : value.province}
              onChange={(e) =>
                onChange({
                  ...value,
                  province: e.target.value,
                  city: '',
                  barangay: '',
                })
              }
              className={inputClassName}
            >
              <option value="">Select province</option>
              {value.province && !matchedProvince && (
                <option value={value.province}>{value.province} (saved)</option>
              )}
              {provinces.map((p) => (
                <option key={p.code} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isPhilippines ? (
          <>
            <div>
              <label className={labelClassName}>
                City / Municipality {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
              </label>
              <select
                value={matchedCity ? matchedCity.name : value.city}
                disabled={!matchedProvince || loadingCities}
                onChange={(e) =>
                  onChange({
                    ...value,
                    city: e.target.value,
                    barangay: '',
                  })
                }
                className={`${inputClassName} disabled:bg-gray-100 disabled:text-gray-400`}
              >
                <option value="">
                  {loadingCities
                    ? 'Loading cities...'
                    : matchedProvince
                      ? 'Select city / municipality'
                      : 'Select province first'}
                </option>
                {value.city && !matchedCity && (
                  <option value={value.city}>{value.city} (saved)</option>
                )}
                {cities.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClassName}>
                Barangay {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
              </label>
              <select
                value={matchedBarangay ? matchedBarangay.name : value.barangay}
                disabled={!matchedCity || loadingBarangays}
                onChange={(e) =>
                  onChange({
                    ...value,
                    barangay: e.target.value,
                  })
                }
                className={`${inputClassName} disabled:bg-gray-100 disabled:text-gray-400`}
              >
                <option value="">
                  {loadingBarangays
                    ? 'Loading barangays...'
                    : matchedCity
                      ? 'Select barangay'
                      : 'Select city first'}
                </option>
                {value.barangay && !matchedBarangay && (
                  <option value={value.barangay}>{value.barangay} (saved)</option>
                )}
                {barangays.map((b) => (
                  <option key={b.code} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className={labelClassName}>City / State</label>
            <input
              type="text"
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              placeholder="Enter city or state"
              className={inputClassName}
            />
          </div>
        )}

        <div className={isPhilippines ? 'sm:col-span-2' : ''}>
          <label className={labelClassName}>
            Street / House No. / Sitio{' '}
            <span className="text-gray-400 font-normal text-[11px] ml-1">(Optional)</span>
          </label>
          <input
            type="text"
            value={value.street}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
            placeholder="e.g. 123 Rizal St., Purok 2, Lower Calajo-an"
            className={inputClassName}
          />
        </div>
      </div>
    </div>
  );
}

