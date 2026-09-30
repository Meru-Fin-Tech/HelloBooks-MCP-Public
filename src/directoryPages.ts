import type { Accountant, queryAccountants } from './accountants.js';
import { DIRECTORY_URL } from './accountants.js';

export const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function safeUrl(value: string | undefined): string | null {
  try { const url = new URL(value ?? ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
export function renderPage(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} | HelloBooks Agents</title><style>
  *{box-sizing:border-box}body{font:16px/1.6 system-ui,sans-serif;margin:0;background:#f7f9fc;color:#15213b}
  header,main,footer{max-width:1120px;margin:auto;padding:24px}header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:1px solid #d8e1ef}
  nav,.actions,.filters,.pagination{display:flex;gap:12px;align-items:center;flex-wrap:wrap}a{color:#1d4bc4;overflow-wrap:anywhere}nav a,.button,button{min-height:48px;padding:10px 14px;display:inline-flex;align-items:center;border-radius:8px;font-weight:600}
  .brand{color:#15213b;font-weight:750;text-decoration:none}h1{font-size:clamp(1.8rem,4vw,2.6rem);line-height:1.2}h1,h2,p{overflow-wrap:anywhere}h2{line-height:1.35}p{max-width:80ch}.muted{color:#526179}.eyebrow{font-size:13px;text-transform:uppercase;letter-spacing:.1em;font-weight:700;color:#385b90}
  .card,form,.notice{background:white;border:1px solid #d8e1ef;border-radius:12px;padding:22px;margin:18px 0}.notice{background:#fff8e8;border-color:#e0c480}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:16px}.grid .card{margin:0}.badge{display:inline-block;font-size:13px;padding:3px 9px;background:#edf2fa;border-radius:20px;margin:3px 4px 3px 0}
  label{display:flex;flex-direction:column;gap:5px;font-weight:600}input,select{font:inherit;padding:10px;min-height:48px;border:1px solid #8b9bb2;border-radius:7px;max-width:100%;background:white}input{width:260px}button,.primary{background:#1d4bc4;color:white;border:0;text-decoration:none;cursor:pointer}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #1d4bc4;outline-offset:3px}
  dl{display:grid;grid-template-columns:minmax(140px,1fr) 3fr;gap:12px}dt{font-weight:650}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:16px;background:#eff3f9;border-radius:8px;font-size:13px}code{overflow-wrap:anywhere}summary{cursor:pointer;padding:10px 0;font-weight:650;min-height:48px}.profile-photo{width:96px;height:96px;object-fit:cover;border-radius:12px}.pagination{margin:24px 0}.button{border:1px solid #aebdd2;text-decoration:none}footer{color:#526179;border-top:1px solid #d8e1ef;margin-top:32px}@media(max-width:600px){header,main,footer{padding:16px}dl{grid-template-columns:1fr;gap:6px}dd{margin-bottom:14px}.filters label,input,select{width:100%}.card{padding:18px}nav{gap:2px}nav a{padding:10px}}
  </style></head><body><header><a class="brand" href="/">HelloBooks <span class="muted">/ Agents</span></a><nav aria-label="Main navigation"><a href="/apis">API catalog</a><a href="/accountants">Accountants</a><a href="/#quick-start">Connect MCP</a><a href="https://developer.hellobooks.ai/">Developers</a></nav></header><main>${body}</main><footer>Public HelloBooks resources · <a href="/llms.txt">Agent guide</a> · <a href="/openapi.json">OpenAPI</a> · <a href="/api/catalog.json">API catalog JSON</a></footer></body></html>`;
}

function valueHtml(value: unknown): string {
  if (Array.isArray(value)) return value.map(v => {
    if (v && typeof v === 'object') return Object.entries(v).map(([key, text]) => `<strong>${escapeHtml(key.replaceAll('_', ' '))}:</strong> ${escapeHtml(text)}`).join('<br>');
    return escapeHtml(v);
  }).join('<br><br>');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return escapeHtml(value);
}
export function renderAccountant(firm: Accountant, notice?: string): string {
  const image = safeUrl(firm.photo_url_absolute ?? firm.photo_url);
  const links = [['Website', firm.website], ['LinkedIn', firm.linkedin], ['Source profile', `${DIRECTORY_URL}/firms/${firm.slug}`]];
  const fields = Object.entries(firm).filter(([key, value]) => !['firm_name', 'photo_url', 'photo_url_absolute'].includes(key) && value !== undefined && value !== null && value !== '');
  return renderPage(firm.firm_name, `<p><a href="/accountants">← All accountants</a></p>${notice ? `<div class="notice" role="status">${escapeHtml(notice)}</div>` : ''}<article>
    ${image ? `<img class="profile-photo" src="${escapeHtml(image)}" alt="${escapeHtml(firm.firm_name)}" referrerpolicy="no-referrer">` : ''}
    <h1>${escapeHtml(firm.firm_name)}</h1><p class="muted">${escapeHtml([firm.principal_name, firm.city, firm.state, firm.country].filter(Boolean).join(' · '))}</p>
    <div class="actions">${links.filter(([, url]) => safeUrl(url)).map(([label, url]) => `<a class="button" href="${escapeHtml(safeUrl(url))}">${label}</a>`).join('')}
    ${firm.email_public && !/[\r\n]/.test(firm.email_public) ? `<a class="button" href="mailto:${escapeHtml(encodeURIComponent(firm.email_public))}">Email firm</a>` : ''}
    ${firm.phone_public && /^\+?[\d\s().-]+$/.test(firm.phone_public) ? `<a class="button" href="tel:${escapeHtml(firm.phone_public.replace(/[^+\d]/g, ''))}">Call firm</a>` : ''}
    <a class="button" href="/api/accountants/${encodeURIComponent(firm.slug)}.json">Full profile JSON</a></div>
    <section class="card"><h2>Full published profile</h2><dl>${fields.map(([key,value]) => `<dt>${escapeHtml(key.replaceAll('_',' '))}</dt><dd>${valueHtml(value)}</dd>`).join('')}</dl></section></article>`);
}

export function renderAccountants(result: ReturnType<typeof queryAccountants>, params: URLSearchParams): string {
  const pageUrl = (page: number) => { const copy = new URLSearchParams(params); copy.set('page', String(page)); return `/accountants?${copy}`; };
  return renderPage('Accountant directory', `<p class="eyebrow">Find professional help</p><h1>Every published accountant. All the details.</h1>
  <p class="muted">Search HelloBooks directory profiles by name, location, services or language. Contact firms directly and check whether they are accepting clients.</p>
  <div class="actions"><a class="button" href="/api/accountants.json">Browse JSON API</a><a class="button" href="${DIRECTORY_URL}">Source directory</a><a class="button" href="/#quick-start">Use with your agent</a></div>
  <form method="get" action="/accountants"><div class="filters"><label>Search<input name="query" value="${escapeHtml(params.get('query') ?? '')}" placeholder="Firm, city, specialty…"></label>
  <label>Country<select name="country"><option value="">All countries</option>${result.countries.map(country => `<option value="${escapeHtml(country)}" ${params.get('country') === country ? 'selected' : ''}>${escapeHtml(country.replaceAll('-', ' '))}</option>`).join('')}</select></label>
  <label>Availability<select name="acceptingClients"><option value="">All published firms</option><option value="true" ${params.get('acceptingClients') === 'true' ? 'selected' : ''}>Accepting clients</option><option value="false" ${params.get('acceptingClients') === 'false' ? 'selected' : ''}>Not accepting clients</option></select></label><button type="submit">Search directory</button><a href="/accountants">Clear filters</a></div></form>
  ${result.error ? `<div class="notice" role="status">${escapeHtml(result.error)}${result.fetchedAt ? ` Last fetched ${escapeHtml(result.fetchedAt)}.` : ''}</div>` : ''}
  <p role="status">${result.status === 'unavailable' ? 'Directory currently unavailable' : `${result.total} matching firms · ${result.directoryTotal} published profiles`}</p>
  <div class="grid">${result.firms.map(f => `<article class="card"><h2><a href="/accountants/${encodeURIComponent(f.slug)}">${escapeHtml(f.firm_name)}</a></h2><p class="muted">${escapeHtml([f.principal_name,f.city,f.country].filter(Boolean).join(' · '))}</p><p>${escapeHtml(f.bio_short)}</p><p>${(f.specialties ?? []).map(s => `<span class="badge">${escapeHtml(s)}</span>`).join('')}</p><p>${f.accepting_clients === true ? 'Accepting clients' : f.accepting_clients === false ? 'Not accepting new clients' : 'Contact for availability'}</p><a class="button" href="/accountants/${encodeURIComponent(f.slug)}">View full profile</a></article>`).join('')}</div>
  ${result.status !== 'unavailable' && !result.firms.length ? '<p>No profiles match these filters. Try a broader search or clear the filters.</p>' : ''}
  <nav class="pagination" aria-label="Directory pages">${result.page > 1 ? `<a class="button" href="${escapeHtml(pageUrl(result.page - 1))}">Previous</a>` : ''}${result.totalPages ? `<span>Page ${result.page} of ${result.totalPages}</span>` : ''}${result.nextPage ? `<a class="button" href="${escapeHtml(pageUrl(result.nextPage))}">Next</a>` : ''}</nav>
  <details><summary>MCP examples</summary><pre>list_accountants {"query":"bookkeeping","page":1,"pageSize":25}
get_accountant {"slug":"a-firm-slug-from-the-list"}</pre><p>Follow nextPage until it is null to retrieve all matches. Each result contains the full published profile.</p></details>`);
}
