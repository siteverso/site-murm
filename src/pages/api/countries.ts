import type { APIRoute } from 'astro';
import { errorResponse, json } from '../../lib/server/http';

type RestCountry = {
    name?: { common?: string };
    translations?: Record<string, { common?: string }>;
    cca2?: string;
    idd?: { root?: string; suffixes?: string[] };
    flag?: string;
};

type CountryOption = {
    code: string;
    name: string;
    callingCode: string;
    flag: string;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let cache: { expiresAt: number; countries: CountryOption[] } | null = null;

function callingCode(country: RestCountry): string {
    const root = String(country.idd?.root || '').trim();
    const suffixes = Array.isArray(country.idd?.suffixes) ? country.idd!.suffixes! : [];
    if (!root) return '';
    if (suffixes.length === 1) return `${root}${suffixes[0]}`;
    return root;
}

export const GET: APIRoute = async () => {
    try {
        if (cache && cache.expiresAt > Date.now()) {
            return json({ ok: true, countries: cache.countries });
        }

        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,translations,cca2,idd,flag', {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(7000),
        });
        if (!response.ok) throw new Error('PAISES_INDISPONIVEIS');

        const payload = await response.json() as RestCountry[];
        const countries = payload
            .map(country => ({
                code: String(country.cca2 || '').toUpperCase(),
                name: String(country.translations?.por?.common || country.name?.common || '').trim(),
                callingCode: callingCode(country),
                flag: String(country.flag || ''),
            }))
            .filter(country => country.code && country.name)
            .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));

        cache = { expiresAt: Date.now() + CACHE_TTL_MS, countries };
        return json({ ok: true, countries });
    } catch (error) {
        return errorResponse(error);
    }
};
