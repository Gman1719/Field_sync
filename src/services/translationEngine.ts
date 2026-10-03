import { translationDictionary } from './translationDictionary';

// Track original text of DOM nodes so switching languages never degrades text quality
const origTextMap = new WeakMap<Node, string>();
const origPlaceholderMap = new WeakMap<Element, string>();
const origTitleMap = new WeakMap<Element, string>();

let currentObserver: MutationObserver | null = null;
let currentLanguage = 'en';
let isTranslatingDOM = false;
let rafId: number | null = null;

// Case-insensitive lookup map built for instant retrieval
const lowercaseLookup = new Map<string, { am: string; om: string; ti: string }>();
Object.entries(translationDictionary).forEach(([key, val]) => {
  lowercaseLookup.set(key.toLowerCase().trim(), val);
});

// All phrases and terms sorted by length descending so longest phrases match first
const sortedPhraseKeys = Object.keys(translationDictionary)
  .filter(k => k.length >= 3)
  .sort((a, b) => b.length - a.length);

/**
 * Translates a single string into the target language.
 */
export function translateText(rawText: string, lang: string): string {
  if (!rawText || lang === 'en') return rawText;
  const trimmed = rawText.trim();
  if (!trimmed) return rawText;

  // 1. Direct exact match
  if (translationDictionary[trimmed] && (translationDictionary[trimmed] as any)[lang]) {
    const translated = (translationDictionary[trimmed] as any)[lang];
    // Preserve leading and trailing whitespace
    const leading = rawText.match(/^\s*/)?.[0] || '';
    const trailing = rawText.match(/\s*$/)?.[0] || '';
    return `${leading}${translated}${trailing}`;
  }

  // 2. Case-insensitive exact match
  const lower = trimmed.toLowerCase();
  if (lowercaseLookup.has(lower)) {
    const item = lowercaseLookup.get(lower)!;
    if ((item as any)[lang]) {
      const translated = (item as any)[lang];
      const leading = rawText.match(/^\s*/)?.[0] || '';
      const trailing = rawText.match(/\s*$/)?.[0] || '';
      return `${leading}${translated}${trailing}`;
    }
  }

  // 3. Dynamic patterns with numbers / variables
  // Pattern: "Started at 08:01 PM"
  if (/^started at\s+/i.test(trimmed)) {
    const timePart = trimmed.replace(/^started at\s+/i, '');
    const prefix = lang === 'am' ? 'የተጀመረበት ሰዓት' : lang === 'om' ? 'Yeroo itti jalqabame' : 'ዝተጀመረሉ ግዜ';
    return `${prefix} ${timePart}`;
  }

  // Pattern: "Xm total active usage"
  if (/\btotal active usage\b/i.test(trimmed)) {
    const minutes = trimmed.replace(/total active usage/i, '').trim();
    if (lang === 'am') return `${minutes} ጠቅላላ ንቁ አጠቃቀም`;
    if (lang === 'om') return `${minutes} itti fayyadama socho'aa waliigalaa`;
    if (lang === 'ti') return `${minutes} ጠቕላላ ንጡፍ ኣጠቓቕማ`;
  }

  // Pattern: "Total: X users" or "Total X users"
  if (/^total:\s*\d+\s*users/i.test(trimmed)) {
    const num = trimmed.replace(/[^0-9]/g, '');
    if (lang === 'am') return `ጠቅላላ፡ ${num} ተጠቃሚዎች`;
    if (lang === 'om') return `Waliigala: Fayyadamtoota ${num}`;
    if (lang === 'ti') return `ጠቕላላ፡ ${num} ተጠቀምቲ`;
  }

  // Pattern: "Date: 2026-..."
  if (/^date:\s*/i.test(trimmed)) {
    const rest = trimmed.replace(/^date:\s*/i, '');
    const prefix = lang === 'am' ? 'ቀን፡' : lang === 'om' ? 'Guyyaa:' : 'ዕለት፡';
    return `${prefix} ${rest}`;
  }

  // Pattern: "Status: ..."
  if (/^status:\s*/i.test(trimmed)) {
    const rest = trimmed.replace(/^status:\s*/i, '');
    const prefix = lang === 'am' ? 'ሁኔታ፡' : lang === 'om' ? 'Haala:' : 'ኩነታት፡';
    return `${prefix} ${translateText(rest, lang)}`;
  }

  // Pattern: "Showing X reports submitted by field teams"
  if (/^showing\s+\d+\s+reports?\s+submitted\s+by\s+field\s+teams/i.test(trimmed)) {
    const num = trimmed.replace(/[^0-9]/g, '');
    if (lang === 'am') return `በመስክ ቡድኖች የገቡ ${num} ሪፖርቶችን በማሳየት ላይ`;
    if (lang === 'om') return `Gabaasaalee ${num} garee dirreetiin ergaman agarsiisaa jira`;
    if (lang === 'ti') return `ብጉጅለታት ግዳም ዝኣተዉ ${num} ጸብጻባት የርኢ ኣሎ`;
  }

  // Pattern: "Showing X of Y ..."
  if (/^showing\s+\d+\s+of\s+\d+/i.test(trimmed)) {
    const nums = trimmed.match(/\d+/g) || ['0', '0'];
    const isEnrolled = /enrolled by you/i.test(trimmed);
    if (lang === 'am') return `ከ${nums[1] || '0'} ውስጥ ${nums[0] || '0'} ${isEnrolled ? 'በእርስዎ የተመዘገቡ' : 'ጠቅላላ'} በማሳየት ላይ`;
    if (lang === 'om') return `${nums[1] || '0'} keessaa ${nums[0] || '0'} ${isEnrolled ? 'isiniin galmaa\'an' : 'waliigala'} agarsiisaa jira`;
    if (lang === 'ti') return `ካብ ${nums[1] || '0'} ውሽጢ ${nums[0] || '0'} ${isEnrolled ? 'ብኣኻትኩም ዝተመዝገቡ' : 'ጠቕላላ'} የርኢ ኣሎ`;
  }

  // Pattern: "Staff Directory (X records)" etc.
  if (/^(staff directory|registered citizens|my registered citizens)\s*\(\d+\s*records?\)/i.test(trimmed)) {
    const num = trimmed.replace(/[^0-9]/g, '');
    const prefix = /staff/i.test(trimmed)
      ? (lang === 'am' ? 'የሰራተኞች ማውጫ' : lang === 'om' ? 'Galmee Hojjattootaa' : 'መዝገብ ሰራሕተኛታት')
      : /my/i.test(trimmed)
      ? (lang === 'am' ? 'የኔ የተመዘገቡ ዜጎች' : lang === 'om' ? 'Lammiilee Galmeesse' : 'ናተይ ዝተመዝገቡ ዜጋታት')
      : (lang === 'am' ? 'የተመዘገቡ ዜጎች' : lang === 'om' ? 'Lammiilee Galmaa\'an' : 'ዝተመዝገቡ ዜጋታት');
    const recordsWord = lang === 'am' ? 'መረጃዎች' : lang === 'om' ? 'galmeewwan' : 'መዛግብቲ';
    return `${prefix} (${num} ${recordsWord})`;
  }

  // Pattern: "Today's Report — ..."
  if (/^today's report\s*—\s*/i.test(trimmed)) {
    const rest = trimmed.replace(/^today's report\s*—\s*/i, '');
    const prefix = lang === 'am' ? 'የዛሬ ሪፖርት —' : lang === 'om' ? 'Gabaasa Har\'aa —' : 'ናይ ሎሚ ጸብጻብ —';
    return `${prefix} ${rest}`;
  }

  // Pattern: "Reset password for {name}? A new temporary password will be generated..."
  if (/^reset password for\s+/i.test(trimmed) && /new temporary password/i.test(trimmed)) {
    const match = trimmed.match(/^reset password for\s+(.+?)\?\s*(.+)$/i);
    const name = match ? match[1] : '';
    if (lang === 'am') return `ለ${name} የይለፍ ቃል ይቀየር? አዲስ ጊዜያዊ የይለፍ ቃል ይፈጠራል እንዲሁም በሚቀጥለው መግቢያ ላይ መቀየር ግዴታ ይሆናል።`;
    if (lang === 'om') return `Jecha icciitii ${name}-f jijjiiruu? Jechi icciitii yeroo haaraan ni uumama, akkasumas seensa itti aanu irratti jijjiiruun dirqama ta'a.`;
    if (lang === 'ti') return `ን${name} መሕለፊ ቃል ይቐየር? ሓድሽ ግዝያዊ መሕለፊ ቃል ክፍጠር እዩ ከምኡ'ውን ኣብ ዝቕጽል መእተዊ ምቕያር ግዴታ ይኸውን።`;
  }

  // Pattern: "Are you sure you want to activate/deactivate {name}'s account?"
  if (/^are you sure you want to\s+(activate|deactivate)\s+(.+?)'s account\?/i.test(trimmed)) {
    const match = trimmed.match(/^are you sure you want to\s+(activate|deactivate)\s+(.+?)'s account\?/i);
    const act = match ? match[1].toLowerCase() : '';
    const name = match ? match[2] : '';
    if (lang === 'am') {
      const actAm = act === 'activate' ? 'ለማንቃት' : 'ለማሰናከል';
      return `እርግጠኛ ነዎት የ${name}ን መለያ ${actAm} ይፈልጋሉ?`;
    }
    if (lang === 'om') {
      const actOm = act === 'activate' ? 'hojjechiisuu' : 'cufuu';
      return `Dhuguma herrega ${name} ${actOm} barbaadduu?`;
    }
    if (lang === 'ti') {
      const actTi = act === 'activate' ? 'ምንጣፍ' : 'ምዕጻው';
      return `ብርግጽ ናይ ${name} ሕሳብ ${actTi} ትደልዩ ዲኹም?`;
    }
  }

  // Pattern: "User activated/deactivated successfully"
  if (/^user\s+(activated|deactivated)\s+successfully$/i.test(trimmed)) {
    const isAct = /activated/i.test(trimmed);
    if (lang === 'am') return isAct ? 'ተጠቃሚው በተሳካ ሁኔታ ነቅቷል' : 'ተጠቃሚው በተሳካ ሁኔታ ተሰናክሏል';
    if (lang === 'om') return isAct ? 'Fayyadamaan milkaa\'inaan hojjetameera' : 'Fayyadamaan milkaa\'inaan cufameera';
    if (lang === 'ti') return isAct ? 'ተጠቃሚ ብዓወት ንጡፍ ኮይኑ' : 'ተጠቃሚ ብዓወት ተዓጽዩ';
  }

  // Pattern: "Role updated to ... successfully"
  if (/^role updated to\s+(.+?)\s+successfully$/i.test(trimmed)) {
    const rolePart = trimmed.replace(/^role updated to\s+/i, '').replace(/\s+successfully$/i, '');
    const translatedRole = translateText(rolePart, lang);
    if (lang === 'am') return `የስራ ድርሻው በተሳካ ሁኔታ ወደ ${translatedRole} ተቀይሯል`;
    if (lang === 'om') return `Gaheen hojii milkaa\'inaan gara ${translatedRole}-tti jijjiirameera`;
    if (lang === 'ti') return `ተራ ስራሕ ብዓወት ናብ ${translatedRole} ተቐይሩ`;
  }

  // Pattern: "Workstation location reassigned for ..."
  if (/^workstation location reassigned for\s+(.+)$/i.test(trimmed)) {
    const name = trimmed.replace(/^workstation location reassigned for\s+/i, '');
    if (lang === 'am') return `የስራ ቦታ ምደባ ተቀይሯል ለ ${name}`;
    if (lang === 'om') return `Iddoon hojii deebisamee ramadameeraaf ${name}`;
    if (lang === 'ti') return `ቦታ ስራሕ ዳግማይ ተመዲቡ ን ${name}`;
  }

  // Pattern: "Role & workstation updated to ..."
  if (/^role & workstation updated to\s+(.+)$/i.test(trimmed)) {
    const rest = trimmed.replace(/^role & workstation updated to\s+/i, '');
    const translated = translateText(rest, lang);
    if (lang === 'am') return `የስራ ድርሻ እና የስራ ጣቢያ ተሻሽሏል ወደ ${translated}`;
    if (lang === 'om') return `Gaheen fi iddoon hojii haaromfameera gara ${translated}`;
    if (lang === 'ti') return `ተራን ቦታ ስራሕን ተመሓይሹ ናብ ${translated}`;
  }

  // Pattern: "Copied ..."
  if (/^copied\s+(.+)$/i.test(trimmed)) {
    const item = trimmed.replace(/^copied\s+/i, '');
    const transItem = translateText(item, lang);
    if (lang === 'am') return `${transItem} ተቀድቷል`;
    if (lang === 'om') return `${transItem} koppii ta'eera`;
    if (lang === 'ti') return `${transItem} ተቐዲሑ`;
  }

  // Pattern: "This temporary password was generated for ..."
  if (/^this temporary password was generated for\s+(.+)$/i.test(trimmed)) {
    const name = trimmed.replace(/^this temporary password was generated for\s+/i, '');
    if (lang === 'am') return `ይህ ጊዜያዊ የይለፍ ቃል የተፈጠረው ለ ${name}`;
    if (lang === 'om') return `Jechi icciitii yeroo kun kan uumameef ${name}`;
    if (lang === 'ti') return `እዚ ግዝያዊ መሕለፊ ቃል ዝተፈጥረ ን ${name}`;
  }

  // Pattern: "All (2)", "Online (0)", "Active (2)", "Officers (4)" -> Term + (Count)
  const countInParensMatch = trimmed.match(/^([a-zA-Z\s\&\/\-]+)\s*\(([\d,]+)\)$/);
  if (countInParensMatch) {
    const term = countInParensMatch[1].trim();
    const count = countInParensMatch[2];
    const transTerm = translateText(term, lang);
    if (transTerm && transTerm !== term) {
      return `${transTerm} (${count})`;
    }
  }

  // Pattern: "X Personnel", "X online", "X Active Personnel", "X Assigned Officers"
  const leadingCountMatch = trimmed.match(/^([\d,]+)\s+([a-zA-Z\s\&\/\-]+)$/);
  if (leadingCountMatch) {
    const count = leadingCountMatch[1];
    const term = leadingCountMatch[2].trim();
    const transTerm = translateText(term, lang);
    if (transTerm && transTerm !== term) {
      return `${count} ${transTerm}`;
    }
  }

  // Pattern: "X registered today" (e.g. "0 registered today")
  const regTodayMatch = trimmed.match(/^([\d,]+)\s+registered today$/i);
  if (regTodayMatch) {
    const count = regTodayMatch[1];
    if (lang === 'am') return `ዛሬ ${count} ተመዝግቧል`;
    if (lang === 'om') return `Har'a ${count} galmaa'eera`;
    if (lang === 'ti') return `ሎሚ ${count} ተመዝጊቡ`;
  }

  // Pattern: "X of Y submitted today" (e.g. "0 of 2 submitted today")
  const ofSubMatch = trimmed.match(/^([\d,]+)\s+of\s+([\d,]+)\s+submitted today$/i);
  if (ofSubMatch) {
    const sub = ofSubMatch[1];
    const tot = ofSubMatch[2];
    if (lang === 'am') return `ዛሬ ከ ${tot} ውስጥ ${sub} ቀርቧል`;
    if (lang === 'om') return `Har'a ${tot} keessaa ${sub} dhiyaateera`;
    if (lang === 'ti') return `ሎሚ ካብ ${tot} ውሽጢ ${sub} ቀሪቡ`;
  }

  // Pattern: "X pending sync" (e.g. "0 pending sync")
  const pendSyncMatch = trimmed.match(/^([\d,]+)\s+pending sync$/i);
  if (pendSyncMatch) {
    const count = pendSyncMatch[1];
    if (lang === 'am') return `${count} ማመሳሰል በመጠባበቅ ላይ`;
    if (lang === 'om') return `${count} walqabsiisa eegaa jira`;
    if (lang === 'ti') return `${count} ምስምሳል ዝጽበ`;
  }

  // Pattern: "Xm ago", "Xh ago", "Xd ago", "Just now", "Yesterday"
  if (/^just now$/i.test(trimmed)) {
    if (lang === 'am') return 'አሁን';
    if (lang === 'om') return 'Amma';
    if (lang === 'ti') return 'ሕጂ';
  }
  if (/^yesterday$/i.test(trimmed)) {
    if (lang === 'am') return 'ትላንት';
    if (lang === 'om') return 'Kaleessa';
    if (lang === 'ti') return 'ትማሊ';
  }
  const timeAgoMatch = trimmed.match(/^(\d+)\s*([mhd])\s*ago$/i);
  if (timeAgoMatch) {
    const val = timeAgoMatch[1];
    const unit = timeAgoMatch[2].toLowerCase();
    if (unit === 'm') {
      if (lang === 'am') return `ከ ${val} ደቂቃ በፊት`;
      if (lang === 'om') return `Daqiiqaa ${val} dura`;
      if (lang === 'ti') return `ቅድሚ ${val} ደቒቕ`;
    }
    if (unit === 'h') {
      if (lang === 'am') return `ከ ${val} ሰዓት በፊት`;
      if (lang === 'om') return `Sa'aatii ${val} dura`;
      if (lang === 'ti') return `ቅድሚ ${val} ሰዓት`;
    }
    if (unit === 'd') {
      if (lang === 'am') return `ከ ${val} ቀን በፊት`;
      if (lang === 'om') return `Guyyaa ${val} dura`;
      if (lang === 'ti') return `ቅድሚ ${val} መዓልቲ`;
    }
  }

  // Pattern: "No active FieldSync session detected"
  if (/^no active fieldsync session detected$/i.test(trimmed)) {
    if (lang === 'am') return 'ምንም ንቁ የፌልድሲንክ የስራ ክፍለ-ጊዜ አልተገኘም';
    if (lang === 'om') return 'Turtii FieldSync socho\'aan hin argamne';
    if (lang === 'ti') return 'ምንም ንጡፍ ናይ ፌልድሲንክ ክፍለ-ግዜ ኣይተረኽበን';
  }

  // Pattern: "A scheduled work verification occurred for ... while no active FieldSync session was detected."
  const verificationMatch = trimmed.match(/^a scheduled work verification occurred for\s+(.+?)\s+while no active fieldsync session was detected\.?$/i);
  if (verificationMatch) {
    const person = verificationMatch[1];
    if (lang === 'am') return `ለ ${person} የታቀደ የስራ ማረጋገጫ ተከናውኗል፤ ነገር ግን ምንም ንቁ የፌልድሲንክ ክፍለ-ጊዜ አልተገኘም።`;
    if (lang === 'om') return `Mirkaneessi hojii saganteeffame ${person}-f raawwatameera garuu turtii FieldSync socho'aan hin argamne.`;
    if (lang === 'ti') return `ን ${person} ዝተመደበ ናይ ስራሕ ምርግጋጽ ተኻይዱ፤ ግን ምንም ንጡፍ ናይ ፌልድሲንክ ክፍለ-ግዜ ኣይተረኽበን።`;
  }

  // Pattern: "Registered citizen {name} (12-Digit ID: {id})"
  const regCitizenLogMatch = trimmed.match(/^registered citizen\s+(.+?)\s*\((?:12-digit\s+id:\s*)?([^)]+)\)$/i);
  if (regCitizenLogMatch) {
    const name = regCitizenLogMatch[1];
    const id = regCitizenLogMatch[2];
    if (lang === 'am') return `የተመዘገበ ዜጋ ${name} (12-አሃዝ መለያ: ${id})`;
    if (lang === 'om') return `Lammii galmaa'e ${name} (Eenyummaa Dijitii-12: ${id})`;
    if (lang === 'ti') return `ዝተመዝገበ ዜጋ ${name} (12-ኣሃዝ መለለዪ: ${id})`;
  }

  // Pattern: "User {name} logged in"
  const userLoginMatch = trimmed.match(/^user\s+(.+?)\s+logged in$/i);
  if (userLoginMatch) {
    const name = userLoginMatch[1];
    if (lang === 'am') return `ተጠቃሚ ${name} ገብቷል`;
    if (lang === 'om') return `Fayyadamaa ${name} seeneera`;
    if (lang === 'ti') return `ተጠቃሚ ${name} ኣትዩ`;
  }

  // Pattern: "Daily report submitted for ... (Registered: X, Screen-time: Y)"
  const repSubLogMatch = trimmed.match(/^(?:daily\s+work\s+report|daily\s+report)\s+submitted for\s+([^\(]+)\s*\((.+)\)$/i);
  if (repSubLogMatch) {
    const date = repSubLogMatch[1].trim();
    const details = repSubLogMatch[2].trim();
    if (lang === 'am') return `የዕለት ሪፖርት ለ ${date} ቀርቧል (${details})`;
    if (lang === 'om') return `Gabaasni guyyaa ${date}-f dhiyaateera (${details})`;
    if (lang === 'ti') return `መዓልታዊ ጸብጻብ ን ${date} ቀሪቡ (${details})`;
  }

  // Pattern: "Telemetry & registration activity strictly scoped to your assigned Zone ({zone})"
  const scopeZoneMatch = trimmed.match(/^telemetry\s*\&\s*registration activity strictly scoped to your assigned zone\s*\((.+)\)$/i);
  if (scopeZoneMatch) {
    const zone = scopeZoneMatch[1];
    if (lang === 'am') return `ለእርስዎ የተመደበው ዞን (${zone}) የተገደበ የቴሌሜትሪ እና የምዝገባ እንቅስቃሴ`;
    if (lang === 'om') return `Sochii teelemeetirii fi galmee kallattiin zoonii keessan (${zone}) irratti murtaa'e`;
    if (lang === 'ti') return `ንዝተመደበልኩም ዞባ (${zone}) ዝተወሰነ ናይ ቴሌሜትሪን ምዝገባን ምንቅስቓስ`;
  }

  // Pattern: "Registrations strictly scoped to your assigned zone in {region}"
  const scopeRegMatch = trimmed.match(/^registrations strictly scoped to your assigned zone in\s+(.+)$/i);
  if (scopeRegMatch) {
    const region = scopeRegMatch[1];
    if (lang === 'am') return `በ ${region} ውስጥ ለእርስዎ የተመደበው ዞን የተገደቡ ምዝገባዎች`;
    if (lang === 'om') return `Galmeewwan ${region} keessatti kallattiin zoonii keessan irratti murtaa'an`;
    if (lang === 'ti') return `ኣብ ${region} ንዝተመደበልኩም ዞባ ዝተወሰኑ ምዝገባታት`;
  }

  // Pattern: "Citizen Registrations by Woreda ({zone})"
  const regByWoredaMatch = trimmed.match(/^citizen registrations by woreda\s*\((.+)\)$/i);
  if (regByWoredaMatch) {
    const zone = regByWoredaMatch[1];
    if (lang === 'am') return `የዜጎች ምዝገባ በወረዳ (${zone})`;
    if (lang === 'om') return `Galmee Lammiilee Aanaadhaan (${zone})`;
    if (lang === 'ti') return `ምዝገባ ዜጋታት ብወረዳ (${zone})`;
  }

  // Pattern: "Regional Jurisdiction ({region})"
  const regJurisMatch = trimmed.match(/^regional jurisdiction\s*\((.+)\)$/i);
  if (regJurisMatch) {
    const region = regJurisMatch[1];
    if (lang === 'am') return `የክልል አስተዳደር ክልል (${region})`;
    if (lang === 'om') return `Aangoo Naannoo (${region})`;
    if (lang === 'ti') return `ክልላዊ ስልጣን (${region})`;
  }

  // 4. Multi-word phrase and keyword replacement
  // All phrases sorted by length descending so longest phrases match first
  let result = rawText;
  let hasReplaced = false;

  for (const phrase of sortedPhraseKeys) {
    // Only match multi-word phrases (strictly containing spaces) when doing partial replacement,
    // to prevent single common words (like 'or', 'by', 'unit', 'field', 'team', 'direct', 'active') from being swapped inside English sentences!
    const isMultiWord = phrase.trim().includes(' ');
    if (!isMultiWord && trimmed.split(/\s+/).length > 2) {
      continue;
    }

    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'gi');
    if (regex.test(result)) {
      const item = translationDictionary[phrase] || lowercaseLookup.get(phrase.toLowerCase());
      if (item && (item as any)[lang]) {
        result = result.replace(regex, (item as any)[lang]);
        hasReplaced = true;
      }
    }
  }

  // Guard against mixed two-language sentences:
  // If the original text was a multi-word English sentence (> 2 words),
  // and partial replacement left residual untranslated English words ([a-zA-Z]{3,}),
  // DO NOT return a mixed sentence with two languages!
  if (hasReplaced && trimmed.split(/\s+/).length > 2) {
    const hasRemainingEnglishWords = /[a-zA-Z]{3,}/.test(result.replace(/FieldSync|ID|EMP|AM|PM|GPS/gi, ''));
    const hasNonLatin = /[^\u0000-\u007F]/.test(result);
    if (hasRemainingEnglishWords && hasNonLatin) {
      // Revert to avoid "in one sentence there is two language words"
      return rawText;
    }
  }

  return hasReplaced ? result : rawText;
}

/**
 * Traverses DOM tree and translates text nodes and attributes safely.
 */
export function translateDOM(root: Node = document.body, lang: string = currentLanguage) {
  if (!root || typeof window === 'undefined') return;
  isTranslatingDOM = true;

  try {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            const tag = el.tagName.toLowerCase();
            if (
              tag === 'script' ||
              tag === 'style' ||
              tag === 'code' ||
              tag === 'pre' ||
              tag === 'svg' ||
              tag === 'path' ||
              el.hasAttribute('data-no-translate')
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }

          if (node.nodeType === Node.TEXT_NODE) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const parentTag = parent.tagName.toLowerCase();
            if (
              parentTag === 'script' ||
              parentTag === 'style' ||
              parentTag === 'code' ||
              parentTag === 'pre' ||
              parentTag === 'svg' ||
              parent.hasAttribute('data-no-translate')
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            // Skip purely numeric, timer/time strings like "00:00:00"
            const text = node.nodeValue?.trim();
            if (!text || /^\d{2}:\d{2}(:\d{2})?$/.test(text) || /^\d+$/.test(text)) {
              return NodeFilter.FILTER_SKIP;
            }
            return NodeFilter.FILTER_ACCEPT;
          }

          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const textNode = currentNode;
        if (lang === 'en') {
          if (origTextMap.has(textNode)) {
            const orig = origTextMap.get(textNode)!;
            if (textNode.nodeValue !== orig) {
              textNode.nodeValue = orig;
            }
          }
        } else {
          let orig = origTextMap.get(textNode);
          if (orig) {
            // If React changed the text node to a new string that is not our previous translation, update orig:
            if (textNode.nodeValue !== orig && textNode.nodeValue !== translateText(orig, lang)) {
              orig = textNode.nodeValue || '';
              origTextMap.set(textNode, orig);
            }
          } else {
            orig = textNode.nodeValue || '';
            origTextMap.set(textNode, orig);
          }
          const translated = translateText(orig, lang);
          if (translated !== textNode.nodeValue) {
            textNode.nodeValue = translated;
          }
        }
      } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const el = currentNode as Element;

        // Placeholders on inputs
        if (el.hasAttribute('placeholder')) {
          const ph = el.getAttribute('placeholder') || '';
          if (lang === 'en') {
            if (origPlaceholderMap.has(el)) {
              el.setAttribute('placeholder', origPlaceholderMap.get(el)!);
            }
          } else {
            let orig = origPlaceholderMap.get(el);
            if (!orig || (ph !== orig && ph !== translateText(orig, lang))) {
              orig = ph;
              origPlaceholderMap.set(el, orig);
            }
            el.setAttribute('placeholder', translateText(orig, lang));
          }
        }

        // Title tooltips
        if (el.hasAttribute('title')) {
          const title = el.getAttribute('title') || '';
          if (lang === 'en') {
            if (origTitleMap.has(el)) {
              el.setAttribute('title', origTitleMap.get(el)!);
            }
          } else {
            let orig = origTitleMap.get(el);
            if (!orig || (title !== orig && title !== translateText(orig, lang))) {
              orig = title;
              origTitleMap.set(el, orig);
            }
            el.setAttribute('title', translateText(orig, lang));
          }
        }
      }

      currentNode = walker.nextNode();
    }
  } catch (err) {
    console.error('Translation DOM error:', err);
  } finally {
    isTranslatingDOM = false;
  }
}

/**
 * Initializes or updates DOM mutation observer to keep dynamically rendered components translated.
 */
export function setTranslationLanguage(lang: string) {
  currentLanguage = lang;

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Immediate translation of current DOM
  translateDOM(document.body, lang);

  // Restart observer for this language
  if (currentObserver) {
    currentObserver.disconnect();
    currentObserver = null;
  }

  if (lang !== 'en') {
    currentObserver = new MutationObserver((mutations) => {
      if (isTranslatingDOM) return;

      let shouldTranslate = false;
      for (const mut of mutations) {
        if (
          (mut.type === 'childList' && mut.addedNodes.length > 0) ||
          mut.type === 'characterData' ||
          mut.type === 'attributes'
        ) {
          shouldTranslate = true;
          break;
        }
      }

      if (shouldTranslate) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          translateDOM(document.body, currentLanguage);
        });
      }
    });

    currentObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title'],
    });
  }
}

// Re-translate whenever active tab changes in the application
if (typeof window !== 'undefined') {
  window.addEventListener('fieldsync-tab-change', () => {
    if (currentLanguage !== 'en') {
      setTimeout(() => translateDOM(document.body, currentLanguage), 50);
      setTimeout(() => translateDOM(document.body, currentLanguage), 200);
      setTimeout(() => translateDOM(document.body, currentLanguage), 500);
    }
  });
}
