/**
 * Public country hub catalog mirrored from Web-Fire-hellobooks.ai/src/data/supportedCountries.ts.
 *
 * Keep this list aligned with the website country hubs. The website source
 * uses `UK` for the United Kingdom route; the MCP normalizes it to ISO `GB`
 * to preserve the existing public MCP contract.
 */

export type CountryTier = 'full' | 'vocab';

export interface SupportedCountry {
  iso: string;
  name: string;
  currency: string;
  tier: CountryTier;
  flag: string;
  hubPath?: string;
}

const FLAG = (code: string) =>
  `https://catamphetamine.gitlab.io/country-flag-icons/3x2/${code}.svg`;

export const SUPPORTED_COUNTRIES = [
  { iso: 'IN', name: 'India', currency: 'INR', tier: 'full', flag: FLAG('IN'), hubPath: '/in' },
  { iso: 'US', name: 'United States', currency: 'USD', tier: 'full', flag: FLAG('US'), hubPath: '/us' },
  { iso: 'GB', name: 'United Kingdom', currency: 'GBP', tier: 'full', flag: FLAG('GB'), hubPath: '/uk' },
  { iso: 'AU', name: 'Australia', currency: 'AUD', tier: 'full', flag: FLAG('AU'), hubPath: '/au' },
  { iso: 'AE', name: 'United Arab Emirates', currency: 'AED', tier: 'full', flag: FLAG('AE'), hubPath: '/uae' },
  { iso: 'CA', name: 'Canada', currency: 'CAD', tier: 'full', flag: FLAG('CA'), hubPath: '/ca' },
  { iso: 'SG', name: 'Singapore', currency: 'SGD', tier: 'full', flag: FLAG('SG'), hubPath: '/sg' },
  { iso: 'NZ', name: 'New Zealand', currency: 'NZD', tier: 'full', flag: FLAG('NZ'), hubPath: '/nz' },
  { iso: 'HK', name: 'Hong Kong', currency: 'HKD', tier: 'full', flag: FLAG('HK'), hubPath: '/hk' },
  { iso: 'DE', name: 'Germany', currency: 'EUR', tier: 'vocab', flag: FLAG('DE'), hubPath: '/de' },
  { iso: 'FR', name: 'France', currency: 'EUR', tier: 'vocab', flag: FLAG('FR'), hubPath: '/fr' },
  { iso: 'NL', name: 'Netherlands', currency: 'EUR', tier: 'vocab', flag: FLAG('NL'), hubPath: '/nl' },
  { iso: 'ES', name: 'Spain', currency: 'EUR', tier: 'vocab', flag: FLAG('ES'), hubPath: '/es' },
  { iso: 'IT', name: 'Italy', currency: 'EUR', tier: 'vocab', flag: FLAG('IT'), hubPath: '/it' },
  { iso: 'JP', name: 'Japan', currency: 'JPY', tier: 'vocab', flag: FLAG('JP'), hubPath: '/jp' },
  { iso: 'KR', name: 'South Korea', currency: 'KRW', tier: 'vocab', flag: FLAG('KR'), hubPath: '/kr' },
  { iso: 'SA', name: 'Saudi Arabia', currency: 'SAR', tier: 'vocab', flag: FLAG('SA'), hubPath: '/sa' },
  { iso: 'IE', name: 'Ireland', currency: 'EUR', tier: 'vocab', flag: FLAG('IE'), hubPath: '/ie' },
  { iso: 'ZA', name: 'South Africa', currency: 'ZAR', tier: 'vocab', flag: FLAG('ZA'), hubPath: '/za' },
  { iso: 'MY', name: 'Malaysia', currency: 'MYR', tier: 'vocab', flag: FLAG('MY'), hubPath: '/my' },
  { iso: 'PH', name: 'Philippines', currency: 'PHP', tier: 'vocab', flag: FLAG('PH'), hubPath: '/ph' },
  { iso: 'NG', name: 'Nigeria', currency: 'NGN', tier: 'vocab', flag: FLAG('NG'), hubPath: '/ng' },
  { iso: 'KE', name: 'Kenya', currency: 'KES', tier: 'vocab', flag: FLAG('KE'), hubPath: '/ke' },
  { iso: 'ID', name: 'Indonesia', currency: 'IDR', tier: 'vocab', flag: FLAG('ID'), hubPath: '/id' },
  { iso: 'TH', name: 'Thailand', currency: 'THB', tier: 'vocab', flag: FLAG('TH'), hubPath: '/th' },
  { iso: 'VN', name: 'Vietnam', currency: 'VND', tier: 'vocab', flag: FLAG('VN'), hubPath: '/vn' },
  { iso: 'PK', name: 'Pakistan', currency: 'PKR', tier: 'vocab', flag: FLAG('PK'), hubPath: '/pk' },
  { iso: 'BD', name: 'Bangladesh', currency: 'BDT', tier: 'vocab', flag: FLAG('BD'), hubPath: '/bd' },
  { iso: 'BR', name: 'Brazil', currency: 'BRL', tier: 'vocab', flag: FLAG('BR'), hubPath: '/br' },
  { iso: 'MX', name: 'Mexico', currency: 'MXN', tier: 'vocab', flag: FLAG('MX'), hubPath: '/mx' },
  { iso: 'AR', name: 'Argentina', currency: 'ARS', tier: 'vocab', flag: FLAG('AR'), hubPath: '/ar' },
  { iso: 'CL', name: 'Chile', currency: 'CLP', tier: 'vocab', flag: FLAG('CL'), hubPath: '/cl' },
  { iso: 'CO', name: 'Colombia', currency: 'COP', tier: 'vocab', flag: FLAG('CO'), hubPath: '/co' },
  { iso: 'SE', name: 'Sweden', currency: 'SEK', tier: 'vocab', flag: FLAG('SE'), hubPath: '/se' },
  { iso: 'NO', name: 'Norway', currency: 'NOK', tier: 'vocab', flag: FLAG('NO'), hubPath: '/no' },
  { iso: 'DK', name: 'Denmark', currency: 'DKK', tier: 'vocab', flag: FLAG('DK'), hubPath: '/dk' },
  { iso: 'FI', name: 'Finland', currency: 'EUR', tier: 'vocab', flag: FLAG('FI'), hubPath: '/fi' },
  { iso: 'BE', name: 'Belgium', currency: 'EUR', tier: 'vocab', flag: FLAG('BE'), hubPath: '/be' },
  { iso: 'AT', name: 'Austria', currency: 'EUR', tier: 'vocab', flag: FLAG('AT'), hubPath: '/at' },
  { iso: 'CH', name: 'Switzerland', currency: 'CHF', tier: 'vocab', flag: FLAG('CH'), hubPath: '/ch' },
  { iso: 'PL', name: 'Poland', currency: 'PLN', tier: 'vocab', flag: FLAG('PL'), hubPath: '/pl' },
  { iso: 'PT', name: 'Portugal', currency: 'EUR', tier: 'vocab', flag: FLAG('PT'), hubPath: '/pt' },
  { iso: 'CZ', name: 'Czech Republic', currency: 'CZK', tier: 'vocab', flag: FLAG('CZ'), hubPath: '/cz' },
  { iso: 'RO', name: 'Romania', currency: 'RON', tier: 'vocab', flag: FLAG('RO'), hubPath: '/ro' },
  { iso: 'HU', name: 'Hungary', currency: 'HUF', tier: 'vocab', flag: FLAG('HU'), hubPath: '/hu' },
  { iso: 'GR', name: 'Greece', currency: 'EUR', tier: 'vocab', flag: FLAG('GR'), hubPath: '/gr' },
  { iso: 'TR', name: 'Turkey', currency: 'TRY', tier: 'vocab', flag: FLAG('TR'), hubPath: '/tr' },
  { iso: 'UA', name: 'Ukraine', currency: 'UAH', tier: 'vocab', flag: FLAG('UA'), hubPath: '/ua' },
  { iso: 'IL', name: 'Israel', currency: 'ILS', tier: 'vocab', flag: FLAG('IL'), hubPath: '/il' },
  { iso: 'EG', name: 'Egypt', currency: 'EGP', tier: 'vocab', flag: FLAG('EG'), hubPath: '/eg' },
  { iso: 'BG', name: 'Bulgaria', currency: 'BGN', tier: 'vocab', flag: FLAG('BG'), hubPath: '/bg' },
  { iso: 'HR', name: 'Croatia', currency: 'EUR', tier: 'vocab', flag: FLAG('HR'), hubPath: '/hr' },
  { iso: 'SI', name: 'Slovenia', currency: 'EUR', tier: 'vocab', flag: FLAG('SI'), hubPath: '/si' },
  { iso: 'SK', name: 'Slovakia', currency: 'EUR', tier: 'vocab', flag: FLAG('SK'), hubPath: '/sk' },
  { iso: 'LT', name: 'Lithuania', currency: 'EUR', tier: 'vocab', flag: FLAG('LT'), hubPath: '/lt' },
  { iso: 'LV', name: 'Latvia', currency: 'EUR', tier: 'vocab', flag: FLAG('LV'), hubPath: '/lv' },
  { iso: 'EE', name: 'Estonia', currency: 'EUR', tier: 'vocab', flag: FLAG('EE'), hubPath: '/ee' },
  { iso: 'RS', name: 'Serbia', currency: 'RSD', tier: 'vocab', flag: FLAG('RS'), hubPath: '/rs' },
  { iso: 'MA', name: 'Morocco', currency: 'MAD', tier: 'vocab', flag: FLAG('MA'), hubPath: '/ma' },
  { iso: 'QA', name: 'Qatar', currency: 'QAR', tier: 'vocab', flag: FLAG('QA'), hubPath: '/qa' },
  { iso: 'KW', name: 'Kuwait', currency: 'KWD', tier: 'vocab', flag: FLAG('KW'), hubPath: '/kw' },
  { iso: 'JO', name: 'Jordan', currency: 'JOD', tier: 'vocab', flag: FLAG('JO'), hubPath: '/jo' },
  { iso: 'OM', name: 'Oman', currency: 'OMR', tier: 'vocab', flag: FLAG('OM'), hubPath: '/om' },
  { iso: 'BH', name: 'Bahrain', currency: 'BHD', tier: 'vocab', flag: FLAG('BH'), hubPath: '/bh' },
  { iso: 'TN', name: 'Tunisia', currency: 'TND', tier: 'vocab', flag: FLAG('TN'), hubPath: '/tn' },
  { iso: 'DZ', name: 'Algeria', currency: 'DZD', tier: 'vocab', flag: FLAG('DZ'), hubPath: '/dz' },
  { iso: 'GH', name: 'Ghana', currency: 'GHS', tier: 'vocab', flag: FLAG('GH'), hubPath: '/gh' },
  { iso: 'TZ', name: 'Tanzania', currency: 'TZS', tier: 'vocab', flag: FLAG('TZ'), hubPath: '/tz' },
  { iso: 'UG', name: 'Uganda', currency: 'UGX', tier: 'vocab', flag: FLAG('UG'), hubPath: '/ug' },
  { iso: 'ET', name: 'Ethiopia', currency: 'ETB', tier: 'vocab', flag: FLAG('ET'), hubPath: '/et' },
  { iso: 'ZM', name: 'Zambia', currency: 'ZMW', tier: 'vocab', flag: FLAG('ZM'), hubPath: '/zm' },
  { iso: 'ZW', name: 'Zimbabwe', currency: 'ZWL', tier: 'vocab', flag: FLAG('ZW'), hubPath: '/zw' },
  { iso: 'RW', name: 'Rwanda', currency: 'RWF', tier: 'vocab', flag: FLAG('RW'), hubPath: '/rw' },
  { iso: 'SN', name: 'Senegal', currency: 'XOF', tier: 'vocab', flag: FLAG('SN'), hubPath: '/sn' },
  { iso: 'LK', name: 'Sri Lanka', currency: 'LKR', tier: 'vocab', flag: FLAG('LK'), hubPath: '/lk' },
  { iso: 'NP', name: 'Nepal', currency: 'NPR', tier: 'vocab', flag: FLAG('NP'), hubPath: '/np' },
  { iso: 'MM', name: 'Myanmar', currency: 'MMK', tier: 'vocab', flag: FLAG('MM'), hubPath: '/mm' },
  { iso: 'KH', name: 'Cambodia', currency: 'KHR', tier: 'vocab', flag: FLAG('KH'), hubPath: '/kh' },
  { iso: 'LA', name: 'Laos', currency: 'LAK', tier: 'vocab', flag: FLAG('LA'), hubPath: '/la' },
  { iso: 'PE', name: 'Peru', currency: 'PEN', tier: 'vocab', flag: FLAG('PE'), hubPath: '/pe' },
  { iso: 'EC', name: 'Ecuador', currency: 'USD', tier: 'vocab', flag: FLAG('EC'), hubPath: '/ec' },
  { iso: 'BO', name: 'Bolivia', currency: 'BOB', tier: 'vocab', flag: FLAG('BO'), hubPath: '/bo' },
  { iso: 'PY', name: 'Paraguay', currency: 'PYG', tier: 'vocab', flag: FLAG('PY'), hubPath: '/py' },
  { iso: 'UY', name: 'Uruguay', currency: 'UYU', tier: 'vocab', flag: FLAG('UY'), hubPath: '/uy' },
  { iso: 'CR', name: 'Costa Rica', currency: 'CRC', tier: 'vocab', flag: FLAG('CR'), hubPath: '/cr' },
  { iso: 'PA', name: 'Panama', currency: 'PAB', tier: 'vocab', flag: FLAG('PA'), hubPath: '/pa' },
  { iso: 'GT', name: 'Guatemala', currency: 'GTQ', tier: 'vocab', flag: FLAG('GT'), hubPath: '/gt' },
  { iso: 'DO', name: 'Dominican Republic', currency: 'DOP', tier: 'vocab', flag: FLAG('DO'), hubPath: '/do' },
  { iso: 'KZ', name: 'Kazakhstan', currency: 'KZT', tier: 'vocab', flag: FLAG('KZ'), hubPath: '/kz' },
  { iso: 'UZ', name: 'Uzbekistan', currency: 'UZS', tier: 'vocab', flag: FLAG('UZ'), hubPath: '/uz' },
  { iso: 'BY', name: 'Belarus', currency: 'BYR', tier: 'vocab', flag: FLAG('BY'), hubPath: '/by' },
  { iso: 'MD', name: 'Moldova', currency: 'MDL', tier: 'vocab', flag: FLAG('MD'), hubPath: '/md' },
  { iso: 'BA', name: 'Bosnia and Herzegovina', currency: 'BAM', tier: 'vocab', flag: FLAG('BA'), hubPath: '/ba' },
  { iso: 'MK', name: 'North Macedonia', currency: 'MKD', tier: 'vocab', flag: FLAG('MK'), hubPath: '/mk' },
  { iso: 'AL', name: 'Albania', currency: 'ALL', tier: 'vocab', flag: FLAG('AL'), hubPath: '/al' },
  { iso: 'LB', name: 'Lebanon', currency: 'LBP', tier: 'vocab', flag: FLAG('LB'), hubPath: '/lb' },
  { iso: 'IQ', name: 'Iraq', currency: 'IQD', tier: 'vocab', flag: FLAG('IQ'), hubPath: '/iq' },
  { iso: 'TT', name: 'Trinidad and Tobago', currency: 'TTD', tier: 'vocab', flag: FLAG('TT'), hubPath: '/tt' },
  { iso: 'MO', name: 'Macau', currency: 'MOP', tier: 'vocab', flag: FLAG('MO'), hubPath: '/mo' },
  { iso: 'BN', name: 'Brunei', currency: 'BND', tier: 'vocab', flag: FLAG('BN'), hubPath: '/bn' },
  { iso: 'CY', name: 'Cyprus', currency: 'EUR', tier: 'vocab', flag: FLAG('CY'), hubPath: '/cy' },
  { iso: 'MT', name: 'Malta', currency: 'EUR', tier: 'vocab', flag: FLAG('MT'), hubPath: '/mt' },
  { iso: 'LU', name: 'Luxembourg', currency: 'EUR', tier: 'vocab', flag: FLAG('LU'), hubPath: '/lu' },
  { iso: 'IS', name: 'Iceland', currency: 'ISK', tier: 'vocab', flag: FLAG('IS'), hubPath: '/is' },
  { iso: 'ME', name: 'Montenegro', currency: 'EUR', tier: 'vocab', flag: FLAG('ME'), hubPath: '/me' },
  { iso: 'GE', name: 'Georgia', currency: 'GEL', tier: 'vocab', flag: FLAG('GE'), hubPath: '/ge' },
  { iso: 'AM', name: 'Armenia', currency: 'AMD', tier: 'vocab', flag: FLAG('AM'), hubPath: '/am' },
  { iso: 'AZ', name: 'Azerbaijan', currency: 'AZN', tier: 'vocab', flag: FLAG('AZ'), hubPath: '/az' },
  { iso: 'TM', name: 'Turkmenistan', currency: 'TMT', tier: 'vocab', flag: FLAG('TM'), hubPath: '/tm' },
  { iso: 'TJ', name: 'Tajikistan', currency: 'TJS', tier: 'vocab', flag: FLAG('TJ'), hubPath: '/tj' },
  { iso: 'KG', name: 'Kyrgyzstan', currency: 'KGS', tier: 'vocab', flag: FLAG('KG'), hubPath: '/kg' },
  { iso: 'MN', name: 'Mongolia', currency: 'MNT', tier: 'vocab', flag: FLAG('MN'), hubPath: '/mn' },
  { iso: 'CI', name: 'Côte d\'Ivoire', currency: 'XOF', tier: 'vocab', flag: FLAG('CI'), hubPath: '/ci' },
  { iso: 'CM', name: 'Cameroon', currency: 'XAF', tier: 'vocab', flag: FLAG('CM'), hubPath: '/cm' },
  { iso: 'TG', name: 'Togo', currency: 'XOF', tier: 'vocab', flag: FLAG('TG'), hubPath: '/tg' },
  { iso: 'BJ', name: 'Benin', currency: 'XOF', tier: 'vocab', flag: FLAG('BJ'), hubPath: '/bj' },
  { iso: 'BF', name: 'Burkina Faso', currency: 'XOF', tier: 'vocab', flag: FLAG('BF'), hubPath: '/bf' },
  { iso: 'ML', name: 'Mali', currency: 'XOF', tier: 'vocab', flag: FLAG('ML'), hubPath: '/ml' },
  { iso: 'SL', name: 'Sierra Leone', currency: 'SLL', tier: 'vocab', flag: FLAG('SL'), hubPath: '/sl' },
  { iso: 'LR', name: 'Liberia', currency: 'LRD', tier: 'vocab', flag: FLAG('LR'), hubPath: '/lr' },
  { iso: 'GN', name: 'Guinea', currency: 'GNF', tier: 'vocab', flag: FLAG('GN'), hubPath: '/gn' },
  { iso: 'MR', name: 'Mauritania', currency: 'MRU', tier: 'vocab', flag: FLAG('MR'), hubPath: '/mr' },
  { iso: 'NE', name: 'Niger', currency: 'XOF', tier: 'vocab', flag: FLAG('NE'), hubPath: '/ne' },
  { iso: 'TD', name: 'Chad', currency: 'XAF', tier: 'vocab', flag: FLAG('TD'), hubPath: '/td' },
  { iso: 'CD', name: 'DR Congo', currency: 'CDF', tier: 'vocab', flag: FLAG('CD'), hubPath: '/cd' },
  { iso: 'CG', name: 'Republic of Congo', currency: 'XAF', tier: 'vocab', flag: FLAG('CG'), hubPath: '/cg' },
  { iso: 'GA', name: 'Gabon', currency: 'XAF', tier: 'vocab', flag: FLAG('GA'), hubPath: '/ga' },
  { iso: 'MW', name: 'Malawi', currency: 'MWK', tier: 'vocab', flag: FLAG('MW'), hubPath: '/mw' },
  { iso: 'MZ', name: 'Mozambique', currency: 'MZN', tier: 'vocab', flag: FLAG('MZ'), hubPath: '/mz' },
  { iso: 'NA', name: 'Namibia', currency: 'NAD', tier: 'vocab', flag: FLAG('NA'), hubPath: '/na' },
  { iso: 'BW', name: 'Botswana', currency: 'BWP', tier: 'vocab', flag: FLAG('BW'), hubPath: '/bw' },
  { iso: 'LS', name: 'Lesotho', currency: 'LSL', tier: 'vocab', flag: FLAG('LS'), hubPath: '/ls' },
  { iso: 'SZ', name: 'Eswatini', currency: 'SZL', tier: 'vocab', flag: FLAG('SZ'), hubPath: '/sz' },
  { iso: 'MG', name: 'Madagascar', currency: 'MGA', tier: 'vocab', flag: FLAG('MG'), hubPath: '/mg' },
  { iso: 'AO', name: 'Angola', currency: 'AOA', tier: 'vocab', flag: FLAG('AO'), hubPath: '/ao' },
  { iso: 'MU', name: 'Mauritius', currency: 'MUR', tier: 'vocab', flag: FLAG('MU'), hubPath: '/mu' },
  { iso: 'SC', name: 'Seychelles', currency: 'SCR', tier: 'vocab', flag: FLAG('SC'), hubPath: '/sc' },
  { iso: 'CV', name: 'Cape Verde', currency: 'CVE', tier: 'vocab', flag: FLAG('CV'), hubPath: '/cv' },
  { iso: 'HN', name: 'Honduras', currency: 'HNL', tier: 'vocab', flag: FLAG('HN'), hubPath: '/hn' },
  { iso: 'SV', name: 'El Salvador', currency: 'USD', tier: 'vocab', flag: FLAG('SV'), hubPath: '/sv' },
  { iso: 'NI', name: 'Nicaragua', currency: 'NIO', tier: 'vocab', flag: FLAG('NI'), hubPath: '/ni' },
  { iso: 'JM', name: 'Jamaica', currency: 'JMD', tier: 'vocab', flag: FLAG('JM'), hubPath: '/jm' },
  { iso: 'BB', name: 'Barbados', currency: 'BBD', tier: 'vocab', flag: FLAG('BB'), hubPath: '/bb' },
  { iso: 'GY', name: 'Guyana', currency: 'GYD', tier: 'vocab', flag: FLAG('GY'), hubPath: '/gy' },
  { iso: 'SR', name: 'Suriname', currency: 'SRD', tier: 'vocab', flag: FLAG('SR'), hubPath: '/sr' },
  { iso: 'FJ', name: 'Fiji', currency: 'FJD', tier: 'vocab', flag: FLAG('FJ'), hubPath: '/fj' },
  { iso: 'PG', name: 'Papua New Guinea', currency: 'PGK', tier: 'vocab', flag: FLAG('PG'), hubPath: '/pg' },
  { iso: 'HT', name: 'Haiti', currency: 'HTG', tier: 'vocab', flag: FLAG('HT'), hubPath: '/ht' },
  { iso: 'BS', name: 'Bahamas', currency: 'BSD', tier: 'vocab', flag: FLAG('BS'), hubPath: '/bs' },
  { iso: 'VE', name: 'Venezuela', currency: 'VES', tier: 'vocab', flag: FLAG('VE'), hubPath: '/ve' },
  { iso: 'IR', name: 'Iran', currency: 'IRR', tier: 'vocab', flag: FLAG('IR') },
  { iso: 'AF', name: 'Afghanistan', currency: 'AFN', tier: 'vocab', flag: FLAG('AF') },
  { iso: 'SY', name: 'Syria', currency: 'SYP', tier: 'vocab', flag: FLAG('SY') },
  { iso: 'YE', name: 'Yemen', currency: 'YER', tier: 'vocab', flag: FLAG('YE') },
  { iso: 'LY', name: 'Libya', currency: 'LYD', tier: 'vocab', flag: FLAG('LY') },
  { iso: 'SD', name: 'Sudan', currency: 'SDG', tier: 'vocab', flag: FLAG('SD') },
  { iso: 'SO', name: 'Somalia', currency: 'SOS', tier: 'vocab', flag: FLAG('SO'), hubPath: '/so' },
  { iso: 'CU', name: 'Cuba', currency: 'CUP', tier: 'vocab', flag: FLAG('CU'), hubPath: '/cu' },
  { iso: 'KP', name: 'North Korea', currency: 'KPW', tier: 'vocab', flag: FLAG('KP') },
  { iso: 'TW', name: 'Taiwan', currency: 'TWD', tier: 'vocab', flag: FLAG('TW'), hubPath: '/tw' },
  { iso: 'PS', name: 'Palestine', currency: 'ILS', tier: 'vocab', flag: FLAG('PS'), hubPath: '/ps' },
  { iso: 'ER', name: 'Eritrea', currency: 'ERN', tier: 'vocab', flag: FLAG('ER'), hubPath: '/er' },
  { iso: 'DJ', name: 'Djibouti', currency: 'DJF', tier: 'vocab', flag: FLAG('DJ'), hubPath: '/dj' },
  { iso: 'SS', name: 'South Sudan', currency: 'SSP', tier: 'vocab', flag: FLAG('SS'), hubPath: '/ss' },
  { iso: 'CF', name: 'Central African Republic', currency: 'XAF', tier: 'vocab', flag: FLAG('CF'), hubPath: '/cf' },
  { iso: 'GQ', name: 'Equatorial Guinea', currency: 'XAF', tier: 'vocab', flag: FLAG('GQ'), hubPath: '/gq' },
  { iso: 'BI', name: 'Burundi', currency: 'BIF', tier: 'vocab', flag: FLAG('BI'), hubPath: '/bi' },
  { iso: 'KM', name: 'Comoros', currency: 'KMF', tier: 'vocab', flag: FLAG('KM'), hubPath: '/km' },
  { iso: 'ST', name: 'São Tomé and Príncipe', currency: 'STN', tier: 'vocab', flag: FLAG('ST'), hubPath: '/st' },
  { iso: 'GW', name: 'Guinea-Bissau', currency: 'XOF', tier: 'vocab', flag: FLAG('GW'), hubPath: '/gw' },
  { iso: 'EH', name: 'Western Sahara', currency: 'MAD', tier: 'vocab', flag: FLAG('EH') },
  { iso: 'WS', name: 'Samoa', currency: 'WST', tier: 'vocab', flag: FLAG('WS'), hubPath: '/ws' },
  { iso: 'TO', name: 'Tonga', currency: 'TOP', tier: 'vocab', flag: FLAG('TO'), hubPath: '/to' },
  { iso: 'VU', name: 'Vanuatu', currency: 'VUV', tier: 'vocab', flag: FLAG('VU'), hubPath: '/vu' },
  { iso: 'SB', name: 'Solomon Islands', currency: 'SBD', tier: 'vocab', flag: FLAG('SB'), hubPath: '/sb' },
  { iso: 'KI', name: 'Kiribati', currency: 'AUD', tier: 'vocab', flag: FLAG('KI') },
  { iso: 'TV', name: 'Tuvalu', currency: 'AUD', tier: 'vocab', flag: FLAG('TV') },
  { iso: 'NR', name: 'Nauru', currency: 'AUD', tier: 'vocab', flag: FLAG('NR') },
  { iso: 'PW', name: 'Palau', currency: 'USD', tier: 'vocab', flag: FLAG('PW') },
  { iso: 'FM', name: 'Micronesia', currency: 'USD', tier: 'vocab', flag: FLAG('FM') },
  { iso: 'MH', name: 'Marshall Islands', currency: 'USD', tier: 'vocab', flag: FLAG('MH') },
  { iso: 'AG', name: 'Antigua and Barbuda', currency: 'XCD', tier: 'vocab', flag: FLAG('AG'), hubPath: '/ag' },
  { iso: 'LC', name: 'Saint Lucia', currency: 'XCD', tier: 'vocab', flag: FLAG('LC'), hubPath: '/lc' },
  { iso: 'VC', name: 'Saint Vincent and the Grenadines', currency: 'XCD', tier: 'vocab', flag: FLAG('VC'), hubPath: '/vc' },
  { iso: 'KN', name: 'Saint Kitts and Nevis', currency: 'XCD', tier: 'vocab', flag: FLAG('KN'), hubPath: '/kn' },
  { iso: 'DM', name: 'Dominica', currency: 'XCD', tier: 'vocab', flag: FLAG('DM'), hubPath: '/dm' },
  { iso: 'GD', name: 'Grenada', currency: 'XCD', tier: 'vocab', flag: FLAG('GD'), hubPath: '/gd' },
] as const satisfies readonly SupportedCountry[];

export type SupportedCountryCode = typeof SUPPORTED_COUNTRIES[number]['iso'];
export type SupportedCountryEntry = typeof SUPPORTED_COUNTRIES[number];

export const SUPPORTED_COUNTRY_CODES = SUPPORTED_COUNTRIES.map((c) => c.iso) as [
  SupportedCountryCode,
  ...SupportedCountryCode[],
];

export const PRICED_COUNTRY_CODES = ['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ'] as const;
export type PricedCountryCode = typeof PRICED_COUNTRY_CODES[number];

const SUPPORTED_COUNTRY_BY_CODE = new Map<string, SupportedCountryEntry>(
  SUPPORTED_COUNTRIES.map((country) => [country.iso, country] as const),
);

function hubPathFor(country: SupportedCountryEntry): string | undefined {
  return 'hubPath' in country ? country.hubPath : undefined;
}

export function isSupportedCountryCode(code: string): code is SupportedCountryCode {
  return SUPPORTED_COUNTRY_BY_CODE.has(code);
}

export function getSupportedCountry(code: string): SupportedCountryEntry | undefined {
  return isSupportedCountryCode(code) ? SUPPORTED_COUNTRY_BY_CODE.get(code) : undefined;
}

export function countryMarketingUrl(country: SupportedCountryEntry): string {
  const hubPath = hubPathFor(country);
  return hubPath ? `https://hellobooks.ai${hubPath}` : 'https://hellobooks.ai/global';
}
