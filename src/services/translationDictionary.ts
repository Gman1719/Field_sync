// Comprehensive Multilingual Translation Dictionary for FieldSync
// Languages: English (en), Amharic (am), Afaan Oromoo (om), Tigrinya (ti)

export interface DictionaryItem {
  am: string;
  om: string;
  ti: string;
}

export const translationDictionary: Record<string, DictionaryItem> = {
  // Brand & General
  'FieldSync': { am: 'ፊልድሲንክ', om: 'FieldSync', ti: 'ፊልድሲንክ' },
  'Offline Report Management System': { am: 'ከመስመር ውጭ ሪፖርት አስተዳደር ስርዓት', om: 'Sisteemii Bulchiinsa Gabaasa Toora-Alaa', ti: 'ስርዓተ ኣዘላለም ሪፖርት ብዘይ መስመር' },
  'National ID Registration • Field Operations • Real-time Sync': { am: 'ብሔራዊ መታወቂያ ምዝገባ • የመስክ ሥራዎች • የቅጽበት ማመሳሰል', om: 'Galmee Waraqaa Eenyummaa Biyyooleessaa • Hojii Dirree • Walqabsiisa Yeroo', ti: 'ምዝገባ ብሄራዊ መንጠቆ • ስራሕቲ ግዳም • ምስምሳል ጊዜ' },
  'Connecting Field Teams to the National Registry': { am: 'የመስክ ቡድኖችን ከብሔራዊ መዝገብ ጋር ማገናኘት', om: 'Garee Dirree Gara Galmee Biyyooleessaatti Walqabsiisuu', ti: 'ጉጅለታት ግዳም ምስ ሃገራዊ መዝገብ ምትእስሳር' },
  'FieldSync Platform • 2026': { am: 'የፊልድሲንክ መድረክ • 2026', om: 'Waliigala FieldSync • 2026', ti: 'መድረኽ ፊልድሲንክ • 2026' },

  // Language Dropdown
  'Select Language': { am: 'ቋንቋ ይምረጡ', om: 'Afaan Filadhu', ti: 'ቋንቋ ምረጽ' },
  'SELECT LANGUAGE': { am: 'ቋንቋ ይምረጡ', om: 'AFAAN FILADHU', ti: 'ቋንቋ ምረጽ' },
  'English': { am: 'እንግሊዝኛ', om: 'Ingiliffa', ti: 'እንግሊዝኛ' },
  'Amharic': { am: 'አማርኛ', om: 'Afaan Amaaraa', ti: 'ኣምሓርኛ' },
  'Afaan Oromoo': { am: 'አፋን ኦሮሞ', om: 'Afaan Oromoo', ti: 'ኦሮምኛ' },
  'Oromoo': { am: 'ኦሮምኛ', om: 'Oromoo', ti: 'ኦሮምኛ' },
  'Tigrinya': { am: 'ትግርኛ', om: 'Afaan Tigree', ti: 'ትግርኛ' },
  'Change Language': { am: 'ቋንቋ ቀይር', om: 'Afaan Jijjiiri', ti: 'ቋንቋ ቀይር' },

  // Theme
  'Switch to Light Theme': { am: 'ወደ ብርሃን ገጽታ ቀይር', om: 'Gara Ifaatti Jijjiiri', ti: 'ናብ ብርሃን ቀይር' },
  'Switch to Dark Theme': { am: 'ወደ ጨለማ ገጽታ ቀይር', om: 'Gara Dukkanaatti Jijjiiri', ti: 'ናብ ጸሊም ቀይር' },
  'Toggle color theme': { am: 'የቀለም ገጽታ ቀይር', om: 'Bifa Jijjiiri', ti: 'ሕብሪ ቀይር' },

  // Navigation Links & Titles
  'Features': { am: 'ገጽታዎች', om: 'Amaloota', ti: 'ባህርያት' },
  'How It Works': { am: 'እንዴት እንደሚሰራ', om: 'Akkamitti Hojjeta', ti: 'ከመይ ይሰርሕ' },
  'Field Conditions': { am: 'የመስክ ሁኔታዎች', om: 'Haala Dirree', ti: 'ኩነታት ግዳም' },
  'User Portals': { am: 'የተጠቃሚ ፖርታሎች', om: 'Balbala Fayyadamtootaa', ti: 'መእተዊ ተጠቀምቲ' },
  'Operations': { am: 'ስራዎች', om: 'Hojiiwwan', ti: 'ስርሒታት' },
  'Security': { am: 'ደህንነት', om: 'Nageenya', ti: 'ደሕንነት' },
  'Dashboard': { am: 'ዳሽቦርድ', om: 'Daaashboordii', ti: 'ዳሽቦርድ' },
  'Notifications': { am: 'ማንቂያዎች', om: 'Beeksisa', ti: 'መጠንቀቕታታት' },
  'Citizen Registration': { am: 'የዜጎች ምዝገባ', om: 'Galmee Lammiilee', ti: 'ምዝገባ ዜጋታት' },
  'Register Citizen': { am: 'ዜጋ ይመዝገቡ', om: 'Lammii Galmeessi', ti: 'ዜጋ መዝግብ' },
  'Registered Citizens': { am: 'የተመዘገቡ ዜጎች', om: 'Lammiilee Galmaa\'an', ti: 'ዝተመዝገቡ ዜጋታት' },
  'Reporting & Logs': { am: 'ሪፖርት እና መዝገቦች', om: 'Gabaasaafi Galmee', ti: 'ጸብጻብን መዛግብትን' },
  'Daily Work Report': { am: 'የዕለት የስራ ሪፖርት', om: 'Gabaasa Hojii Guyyaa', ti: 'ናይ መዓልቲ ስራሕ ጸብጻብ' },
  'My Report': { am: 'የኔ ሪፖርት', om: 'Gabaasa Koo', ti: 'ናተይ ጸብጻብ' },
  'My Submissions': { am: 'የኔ ማስገባቶች', om: 'Ergama Koo', ti: 'ዘእተኹዎም' },
  'Activity Logs': { am: 'የእንቅስቃሴ መዝገቦች', om: 'Galmee Sochii', ti: 'ናይ ንጥፈት መዛግብቲ' },
  'Work Sessions & Time': { am: 'የስራ ክፍለ ጊዜ እና ሰዓት', om: 'Yeroo fi Marsaa Hojii', ti: 'ናይ ስራሕ እዋንን ግዜን' },
  'Work Sessions': { am: 'የስራ ክፍለ ጊዜያት', om: 'Marsaa Hojii', ti: 'ናይ ስራሕ እዋናት' },
  'Supervision & Team': { am: 'ቁጥጥር እና ቡድን', om: 'To\'annoo fi Garee', ti: 'ቁጽጽርን ጉጅለን' },
  'Supervisor Reports': { am: 'የሱፐርቫይዘር ሪፖርቶች', om: 'Gabaasa Tooftaa', ti: 'ናይ ተቖጻጻሪ ጸብጻባት' },
  'Team Management': { am: 'የቡድን አስተዳደር', om: 'Bulchiinsa Garee', ti: 'ምሕደራ ጉጅለ' },
  'Task Assignments': { am: 'የስራ ምደባዎች', om: 'Ramaddii Hojii', ti: 'ምደባ ስራሕቲ' },
  'Consolidated Attendance': { am: 'የተጠቃለለ እንደሪ', om: 'Argama Waliigalaa', ti: 'ዝተጠቃለለ ህላወ' },
  'Attendance Management': { am: 'የእንደሪ አስተዳደር', om: 'Bulchiinsa Argamaa', ti: 'ምሕደራ ህላወ' },
  'Consolidated Reports': { am: 'የተጠቃለሉ ሪፖርቶች', om: 'Gabaasaalee Waliigalaa', ti: 'ዝተጠቃለሉ ጸብጻባት' },
  'All Reports': { am: 'ሁሉም ሪፖርቶች', om: 'Gabaasa Hunda', ti: 'ኩሎም ጸብጻባት' },
  'Leave Requests': { am: 'የእረፍት ጥያቄዎች', om: 'Gaaffii Boqonnaa', ti: 'ሕቶታት ዕረፍቲ' },
  'Permission Requests': { am: 'የፈቃድ ጥያቄዎች', om: 'Gaaffii Hayyamaa', ti: 'ሕቶታት ፍቓድ' },
  'Screen Time Control': { am: 'የስክሪን ሰዓት ቁጥጥር', om: 'To\'annoo Yeroo Iskiiriinii', ti: 'ቁጽጽር ግዜ ስክሪን' },
  'Identity Verification': { am: 'የማንነት ማረጋገጫ', om: 'Mirkaneessa Eenyummaa', ti: 'ምርግጋጽ መንነት' },
  'Duplicate Review': { am: 'ተደጋጋሚ መረጃ ግምገማ', om: 'Gamaaggama Irra-Deebii', ti: 'ግምገማ ድርብ መረዳእታ' },
  'Administration': { am: 'አስተዳደር', om: 'Bulchiinsa', ti: 'ምሕደራ' },
  'User Management': { am: 'የተጠቃሚዎች አስተዳደር', om: 'Bulchiinsa Fayyadamtootaa', ti: 'ምሕደራ ተጠቀምቲ' },
  'Analytics & Trends': { am: 'ትንታኔ እና አዝማሚያዎች', om: 'Xiinxalaafi Haala', ti: 'ትንታነን ዝንባለን' },
  'Citizens Database': { am: 'የዜጎች ዳታቤዝ', om: 'Kuusaa Daataa Lammiilee', ti: 'ዳታቤዝ ዜጋታት' },
  'Audit Log & History': { am: 'የኦዲት መዝገብ እና ታሪክ', om: 'Galmee Odiitii fi Seenaa', ti: 'መዝገብ ኦዲትን ታሪክን' },
  'System Alerts': { am: 'የስርዓት ማንቂያዎች', om: 'Akeekkachiisa Sirnaa', ti: 'መጠንቀቕታታት ስርዓት' },
  'System & Sync': { am: 'ስርዓት እና ማመሳሰል', om: 'Sirnaafi Walqabsiisa', ti: 'ስርዓትን ምስምሳልን' },
  'Sync Center': { am: 'የማመሳሰያ ማዕከል', om: 'Giddu-gala Walqabsiisaa', ti: 'ማእከል ምስምሳል' },
  'Team Chat': { am: 'የቡድን ውይይት', om: 'Haasaa Garee', ti: 'ዕላል ጉጅለ' },
  'My Profile': { am: 'የኔ መገለጫ', om: 'Piroofaayilii Koo', ti: 'ናተይ ፕሮፋይል' },

  // Auth & Login
  'Login': { am: 'ግባ', om: 'Seeni', ti: 'እቶ' },
  'Sign In': { am: 'ግባ', om: 'Seeni', ti: 'እቶ' },
  'Signing In...': { am: 'በመግባት ላይ...', om: 'Seenaa jira...', ti: 'ይኣቱ ኣሎ...' },
  'Sign Out': { am: 'ውጣ', om: 'Ba\'i', ti: 'ውጻእ' },
  'Logout': { am: 'ውጣ', om: 'Baasi', ti: 'ውጻእ' },
  'Back to Home': { am: 'ወደ መነሻ ተመለስ', om: 'Gara Manaatti Deebi\'i', ti: 'ናብ መበገሲ ተመለስ' },
  'Welcome Back': { am: 'እንኳን ደህና መጡ', om: 'Baga Nagaan Deebitan', ti: 'እንቋዕ ብደሓን መጻእኩም' },
  'Login to continue': { am: 'ለመቀጠል ይግቡ', om: 'Itti fufuuf seeni', ti: 'ንምቕጻል እቶ' },
  'Enter your credentials to access your FieldSync account.': {
    am: 'የፊልድሲንክ መለያዎን ለመጠቀም መረጃዎን ያስገቡ።',
    om: 'Akaawuntii FieldSync keessan banuuf odeeffannoo keessan galchaa.',
    ti: 'ናይ ፊልድሲንክ ኣካውንትኩም ንምእታው መረዳእታኹም ኣእትዉ።'
  },
  'Email Address': { am: 'የኢሜይል አድራሻ', om: 'Teessoo Iimeelii', ti: 'ኣድራሻ ኢመይል' },
  'Password': { am: 'የይለፍ ቃል', om: 'Jecha Iccitii', ti: 'ቃል ምስጢር' },
  'Enter your password': { am: 'የይለፍ ቃልዎን ያስገቡ', om: 'Jecha iccitii keessan galchaa', ti: 'ቃል ምስጢርካ ኣእቱ' },
  'Remember this device': { am: 'ይህንን መሳሪያ አስታውስ', om: 'Meeshaa kana yaadadhu', ti: 'ነዚ መሳርሒ ዘክር' },
  'Invalid email or password': { am: 'የተሳሳተ ኢሜይል ወይም የይለፍ ቃል', om: 'Iimeelii ykn jecha iccitii dogoggoraa', ti: 'ኢመይል ወይ ቃል ምስጢር ጌጋ' },
  'Authentication failed. Please verify credentials.': {
    am: 'ማረጋገጥ አልተሳካም። እባክዎ መረጃዎን ያረጋግጡ።',
    om: 'Mirkaneessuun hin milkoofne. Maaloo odeeffannoo keessan mirkaneessaa.',
    ti: 'ምርግጋጽ ኣይተዓወተን። በጃኹም ሓበሬታኹም ኣረጋግጹ።'
  },
  'Demo Accounts': { am: 'የሙከራ መለያዎች', om: 'Akaawuntii Qormaataa', ti: 'መለያታት ማሳያ' },

  // Roles
  'Manager': { am: 'ስራ አስኪያጅ', om: 'Manaajera', ti: 'ስራሕ ኣካያዲ' },
  'Supervisor': { am: 'ተቆጣጣሪ', om: 'Tooftaa', ti: 'ተቖጻጻሪ' },
  'Field Officer': { am: 'የመስክ ኃላፊ', om: 'Hojjetaa Dirree', ti: 'ሓላፊ ግዳም' },
  'Administrator': { am: 'አስተዳዳሪ', om: 'Bulchaa', ti: 'ኣመሓዳሪ' },
  'Role': { am: 'ሚና', om: 'Gahee', ti: 'ተራ' },

  // Landing Page Hero & Sections
  'Built for Real-World Field Operations': {
    am: 'ለእውነተኛው ዓለም የመስክ ስራዎች የተሰራ',
    om: 'Hojii Dirree Addunyaa Dhugaaf Kan Ijaarame',
    ti: 'ንሓቀኛ ስራሕቲ ግዳም ዝተሃነጸ'
  },
  'Designed from the ground up for Ethiopian kebele registration, harsh environments, and intermittent connectivity.': {
    am: 'ለኢትዮጵያ ቀበሌዎች ምዝገባ፣ አስቸጋሪ ሁኔታዎች እና አስተማማኝ ላልሆነ ኔትወርክ ሆን ተብሎ የተዘጋጀ።',
    om: 'Galmee ganda Itoophiyaa, haala rakkisaa fi qunnamtii cituuf dursa irratti hundaa\'ee kan tolfame.',
    ti: 'ንናይ ኢትዮጵያ ቀበሌታት ምዝገባ፣ ከበድቲ ኩነታትን ዘተኣማምን ኢንተርኔት ንዘይብሎም ቦታታት ዝተዳለወ።'
  },
  'Offline-First Architecture': { am: 'ከመስመር ውጭ ቀዳሚ መዋቅር', om: 'Dursa Toora-Alaa', ti: 'ቀዳምነት ዘይመስመር መዋቕር' },
  'Guaranteed Data Integrity': { am: 'የተረጋገጠ የመረጃ ትክክለኛነት', om: 'Mirkaneessa Qulqullina Daataa', ti: 'ውሑስ ጽሬት ሓበሬታ' },
  'Full Encryption': { am: 'ሙሉ ምስጠራ', om: 'Icciteessuu Guutuu', ti: 'ምሉእ ምስጢራዊነት' },
  'Multi-Device Ready': { am: 'ለሁሉም መሳሪያዎች ዝግጁ', om: 'Meeshaalee Hundaaf Qophii', ti: 'ንኹሉ መሳርሒ ድሉው' },
  'Automated Sync': { am: 'ራስ-ሰር ማመሳሰል', om: 'Walqabsiisa Of-Harkaa', ti: 'ኣውቶማቲክ ምስምሳል' },
  'Live Telemetry': { am: 'የቀጥታ ስታትስቲክስ', om: 'Lakkoofsa Kallattii', ti: 'ቀጥታዊ ስታቲስቲክስ' },
  'Regions Covered': { am: 'የተሸፈኑ ክልሎች', om: 'Naannolee Haguugaman', ti: 'ዝተሸፈኑ ክልላት' },
  'Zones Active': { am: 'ንቁ ዞኖች', om: 'Zoonota Hojiirra Jiran', ti: 'ንጡፋት ዞባታት' },
  'Woredas Connected': { am: 'የተገናኙ ወረዳዎች', om: 'Aanaalee Walqabatan', ti: 'ዝተተኣሳሰሩ ወረዳታት' },
  'Citizens Registered': { am: 'የተመዘገቡ ዜጎች', om: 'Lammiilee Galmaa\'an', ti: 'ዝተመዝገቡ ዜጋታት' },
  'Active Field Users': { am: 'ንቁ የመስክ ተጠቃሚዎች', om: 'Fayyadamtoota Dirree', ti: 'ንጡፋት ተጠቀምቲ ግዳም' },
  'Learn More': { am: 'ተጨማሪ ይወቁ', om: 'Dabalataan Baraa', ti: 'ተወሳኺ ፍለጡ' },
  'Get Started': { am: 'አሁን ይጀምሩ', om: 'Amma Jalqabaa', ti: 'ሕጂ ጀምር' },
  'Access Platform': { am: 'መድረኩን ይጠቀሙ', om: 'Sirnicha Seenaa', ti: 'መድረኽ ተጠቐም' },

  // Workstation & Status
  'Field Officer Workstation': { am: 'የመስክ ኃላፊ የስራ ማዕከል', om: 'Iddoo Hojii Hojjetaa Dirree', ti: 'ናይ ሓላፊ ግዳም ስራሕ መደብ' },
  'Supervisor Command Center': { am: 'የሱፐርቫይዘር መቆጣጠሪያ ማዕከል', om: 'Giddu-gala Ajaja Tooftaa', ti: 'ማእከል ትእዛዝ ተቖጻጻሪ' },
  'Operations Manager Dashboard': { am: 'የስራ አስኪያጅ ዳሽቦርድ', om: 'Daaashboordii Hojii Gaggeessaa', ti: 'ናይ ስራሕ ኣካያዲ ዳሽቦርድ' },
  'Online': { am: 'በመስመር ላይ', om: 'Toora Irra', ti: 'ኣብ መስመር' },
  'Offline': { am: 'ከመስመር ውጭ', om: 'Toora Ala', ti: 'ካብ መስመር ወጻኢ' },
  'Work Session & Screen Time': { am: 'የስራ ክፍለ ጊዜ እና የስክሪን ሰዓት', om: 'Yeroo Iskiiriiniifi Marsaa Hojii', ti: 'ናይ ስራሕ እዋንን ግዜ ስክሪንን' },
  'Official Work Hours': { am: 'ኦፊሴላዊ የስራ ሰዓታት', om: 'Sa\'aatii Hojii Seeraa', ti: 'ስሩዕ ናይ ስራሕ ሰዓታት' },
  'Official Work Hours: 08:30 – 17:30 (Lunch: 12:30 – 13:30)': {
    am: 'ኦፊሴላዊ የስራ ሰዓታት፡ 08:30 – 17:30 (ምሳ፡ 12:30 – 13:30)',
    om: 'Sa\'aatii Hojii Seeraa: 08:30 – 17:30 (Laaqana: 12:30 – 13:30)',
    ti: 'ስሩዕ ናይ ስራሕ ሰዓታት፡ 08:30 – 17:30 (ምሳሕ፡ 12:30 – 13:30)'
  },
  'Session Status': { am: 'የክፍለ ጊዜው ሁኔታ', om: 'Haala Marsaa', ti: 'ኩነታት እዋን ስራሕ' },
  'Paused': { am: 'ለጊዜው ቆሟል', om: 'Dhaabbateera', ti: 'ተወሳሲኑ ደው ኢሉ' },
  'Active': { am: 'ንቁ', om: 'Hojiirra', ti: 'ንጡፍ' },
  "Today's Cumulative Screen Time": { am: 'የዛሬ ድምር የስክሪን ሰዓት', om: 'Yeroo Iskiiriinii Waliigalaa Har\'aa', ti: 'ናይ ሎሚ ድምር ግዜ ስክሪን' },
  '0m total active usage': { am: '0ደቂቃ ጠቅላላ ንቁ አጠቃቀም', om: 'daqiiqaa 0 fayyadama waliigalaa', ti: '0ደቒቕ ጠቕላላ ንጡፍ ኣጠቓቕማ' },
  'Outside Working Hours — Paused': { am: 'ከስራ ሰዓት ውጭ — ለጊዜው ቆሟል', om: 'Sa\'aatii Hojiin Alaa — Dhaabbateera', ti: 'ካብ ሰዓት ስራሕ ወጻኢ — ተዓጊቱ' },
  'Work Session': { am: 'የስራ ክፍለ ጊዜ', om: 'Marsaa Hojii', ti: 'ናይ ስራሕ እዋን' },
  'Started at': { am: 'የተጀመረበት ሰዓት', om: 'Yeroo itti jalqabame', ti: 'ዝተጀመረሉ ግዜ' },
  'Finalizes automatically when you submit your Daily Work Report': {
    am: 'የዕለት የስራ ሪፖርትዎን ሲያስገቡ በራስ-ሰር ይጠናቀቃል',
    om: 'Yeroo gabaasa guyyaa ergitan ofumaan xumurama',
    ti: 'ናይ መዓልቲ ጸብጻብ ምስ ኣእተኹም ብኣውቶማቲክ ይዛዘም'
  },
  'Last Verification': { am: 'የመጨረሻ ማረጋገጫ', om: 'Mirkaneessa Dhumaa', ti: 'ናይ መወዳእታ ምርግጋጽ' },
  'Missed': { am: 'አምልጧል', om: 'Darbameera', ti: 'ሓሊፉ' },
  'Passed': { am: 'አልፏል', om: 'Darbee jira', ti: 'ሓሊፉ' },
  'Official random checks occur during work hours': {
    am: 'በስራ ሰዓት ድንገተኛ የማረጋገጫ ፍተሻዎች ይካሄዳሉ',
    om: 'Sa\'aatii hojii keessa sakatta\'iinsi tasaa ni gaggeeffama',
    ti: 'ኣብ ሰዓት ስራሕ ድንገታዊ ናይ ምርግጋጽ ፍተሻታት ይካየዱ'
  },

  // Dashboard Stats & Metrics
  'Total Reports': { am: 'ጠቅላላ ሪፖርቶች', om: 'Gabaasa Waliigalaa', ti: 'ጠቕላላ ጸብጻባት' },
  'Citizens': { am: 'ዜጎች', om: 'Lammiilee', ti: 'ዜጋታት' },
  'CITIZENS': { am: 'ዜጎች', om: 'LAMMIILEE', ti: 'ዜጋታት' },
  'FEMALE CITIZENS': { am: 'ሴት ዜጎች', om: 'LAMMIILEE DUBARAA', ti: 'ኣንስቲ ዜጋታት' },
  'MALE CITIZENS': { am: 'ወንድ ዜጎች', om: 'LAMMIILEE DHIIRAA', ti: 'ተባዕትዮ ዜጋታት' },
  'TOTAL CITIZENS': { am: 'ጠቅላላ ዜጎች', om: 'LAMMIILEE WALIIGALAA', ti: 'ጠቕላላ ዜጋታት' },
  'Female Citizens': { am: 'ሴት ዜጎች', om: 'Lammiilee Dubaraa', ti: 'ኣንስቲ ዜጋታት' },
  'Male Citizens': { am: 'ወንድ ዜጎች', om: 'Lammiilee Dhiiraa', ti: 'ተባዕትዮ ዜጋታት' },
  'Total Registrations': { am: 'ጠቅላላ ምዝገባዎች', om: 'Galmee Waliigalaa', ti: 'ጠቕላላ ምዝገባታት' },
  'Attendance Rate': { am: 'የእንደሪ መጠን', om: 'Reeshio Argamaa', ti: 'መጠን ህላወ' },
  'Efficiency': { am: 'ብቃት', om: 'Ga\'umsa', ti: 'ብቕዓት' },
  'Trust Score': { am: 'የመተማመን ውጤት', om: 'Qabxii Amanamummaa', ti: 'ነጥቢ ምትእምማን' },
  'Pending Leaves': { am: 'በመጠባበቅ ላይ ያሉ ፈቃዶች', om: 'Boqonnaa Eegamaa Jiru', ti: 'ዝጽበዩ ዘለዉ ዕረፍትታት' },
  'Pending Permissions': { am: 'በመጠባበቅ ላይ ያሉ ፈቃዶች', om: 'Hayyama Eegamaa Jiru', ti: 'ዝጽበዩ ዘለዉ ፍቓዳት' },
  'Registration Trend': { am: 'የምዝገባ አዝማሚያ', om: 'Adeemsa Galmee', ti: 'ናይ ምዝገባ ዝንባለ' },
  'Top Performing Officers': { am: 'ከፍተኛ አፈጻጸም ያላቸው ኃላፊዎች', om: 'Hoggantoota Dirree Ga\'umsa Olaanaa', ti: 'ብሉጻት ሓለፍቲ ግዳም' },
  'Today\'s Reports': { am: 'የዛሬ ሪፖርቶች', om: 'Gabaasa Har\'aa', ti: 'ናይ ሎሚ ጸብጻባት' },
  'Today\'s Registrations': { am: 'የዛሬ ምዝገባዎች', om: 'Galmee Har\'aa', ti: 'ናይ ሎሚ ምዝገባታት' },
  'Today\'s Summary': { am: 'የዛሬ ማጠቃለያ', om: 'Cuunfaa Har\'aa', ti: 'ናይ ሎሚ ጽሟቕ' },
  'Recent Activity': { am: 'የቅርብ ጊዜ እንቅስቃሴ', om: 'Sochii Dhihoo', ti: 'ናይ ቀረባ ንጥፈታት' },
  'Registration Target': { am: 'የምዝገባ ግብ', om: 'Kaayyoo Galmee', ti: 'ናይ ምዝገባ ሸቶ' },

  // Citizen Registration & Management
  'Register Citizen for National ID': { am: 'ዜጋ ለብሔራዊ መታወቂያ ይመዝገቡ', om: 'Lammii Waraqaa Eenyummaa Biyyooleessaaf Galmeessi', ti: 'ዜጋ ንሃገራዊ መንነት ወረቐት መዝግብ' },
  'Enter citizen information for National ID registration': {
    am: 'ለብሔራዊ መታወቂያ ምዝገባ የዜጋውን መረጃ ያስገቡ',
    om: 'Galmee eenyummaaf odeeffannoo lammii galchaa',
    ti: 'ንሃገራዊ መንነት ምዝገባ ናይቲ ዜጋ መረዳእታ ኣእትዉ'
  },
  'First Name': { am: 'ስም', om: 'Maqaa', ti: 'ስም' },
  'Last Name': { am: 'የአባት ስም', om: 'Maqaa Abbaa', ti: 'ስም ኣቦ' },
  'Father Name': { am: 'የአባት ስም', om: 'Maqaa Abbaa', ti: 'ስም ኣቦ' },
  'Grandfather Name': { am: 'የአያት ስም', om: 'Maqaa Akaakayyuu', ti: 'ስም ኣባሓጎ' },
  'Date of Birth': { am: 'የትውልድ ቀን', om: 'Guyyaa Dhalootaa', ti: 'ዕለት ልደት' },
  'Gender': { am: 'ጾታ', om: 'Kornyaa', ti: 'ጾታ' },
  'Male': { am: 'ወንድ', om: 'Dhiira', ti: 'ተባዕታይ' },
  'Female': { am: 'ሴት', om: 'Dubara', ti: 'ኣንስተይቲ' },
  'Other': { am: 'ሌላ', om: 'Kan biroo', ti: 'ካልእ' },
  'Marital Status': { am: 'የጋብቻ ሁኔታ', om: 'Haala Gaa\'elaa', ti: 'ኩነታት መርዓ' },
  'Single': { am: 'ያላገባ/ች', om: 'Qeentee', ti: 'ዘየተመርዓወ/ት' },
  'Married': { am: 'ያገባ/ች', om: 'Kan Fuudhe/Heerume', ti: 'እተመርዓወ/ት' },
  'Divorced': { am: 'የተፋታ/ች', om: 'Kan Hiike/Hiikte', ti: 'እተፋትሐ/ት' },
  'Widowed': { am: 'የሞተበት/ባት', om: 'Abbaan Warraa/Haati Warraa kan Du\'e', ti: 'መጻምዲ ዝሞቶ/ታ' },
  'Occupation': { am: 'ሙያ', om: 'Hojii', ti: 'ሞያ' },
  'Address': { am: 'አድራሻ', om: 'Teessoo', ti: 'ኣድራሻ' },
  'Region': { am: 'ክልል', om: 'Naannoo', ti: 'ክልል' },
  'Zone': { am: 'ዞን', om: 'Zoonii', ti: 'ዞባ' },
  'Woreda': { am: 'ወረዳ', om: 'Aanaa', ti: 'ወረዳ' },
  'Kebele': { am: 'ቀበሌ', om: 'Ganda', ti: 'ቀበሌ' },
  'District': { am: 'ወረዳ', om: 'Aanaa', ti: 'ወረዳ' },
  'Village': { am: 'ቀበሌ', om: 'Ganda', ti: 'ቀበሌ' },
  'Phone Number': { am: 'የስልክ ቁጥር', om: 'Lakkoofsa Bilbilaa', ti: 'ቁጽሪ ተሌፎን' },
  'ID Type': { am: 'የመታወቂያ አይነት', om: 'Gosa Waraqaa Eenyummaa', ti: 'ዓይነት መንነት ወረቐት' },
  'National ID': { am: 'ብሔራዊ መታወቂያ', om: 'Waraqaa Eenyummaa Biyyooleessaa', ti: 'ሃገራዊ መንነት ወረቐት' },
  'Kebele ID': { am: 'የቀበሌ መታወቂያ', om: 'Waraqaa Eenyummaa Gandaa', ti: 'ናይ ቀበሌ መንነት ወረቐት' },
  'Birth Certificate': { am: 'የትውልድ ሰርተፍኬት', om: 'Waraqaa Dhalootaa', ti: 'ናይ ልደት ምስክር ወረቐት' },
  'Passport': { am: 'ፓስፖርት', om: 'Paaspoortii', ti: 'ፓስፖርት' },
  'ID Number': { am: 'የመታወቂያ ቁጥር', om: 'Lakkoofsa Eenyummaa', ti: 'ቁጽሪ መንነት ወረቐት' },
  'Biometrics Collected': { am: 'ባዮሜትሪክስ ተሰብስቧል', om: 'Baayomeetiriiksiin Fudhatameera', ti: 'ባዮሜትሪክስ ተወሲዱ' },
  'Registration Date': { am: 'የተመዘገበበት ቀን', om: 'Guyyaa Galmee', ti: 'ዝተመዝገበሉ ዕለት' },
  'Search by name, phone, or ID...': {
    am: 'በስም፣ በስልክ ወይም በመታወቂያ ቁጥር ይፈልጉ...',
    om: 'Maqaa, bilbila, ykn lakkoofsa eenyummaan barbaadi...',
    ti: 'ብሽም፣ ብተሌፎን ወይ ብቁጽሪ መንነት ድለይ...'
  },
  'Filter by Region': { am: 'በክልል አጣራ', om: 'Naannoodhaan Sitiri', ti: 'ብክልል ኣጻሪ' },
  'All Regions': { am: 'ሁሉም ክልሎች', om: 'Naannolee Hunda', ti: 'ኩሎም ክልላት' },
  'Export CSV': { am: 'በ CSV አውጣ', om: 'CSV Baasi', ti: 'ብ CSV ኣውጽእ' },
  'Add New Citizen': { am: 'አዲስ ዜጋ መዝግብ', om: 'Lammii Haaraa Dabali', ti: 'ሓድሽ ዜጋ ወስኽ' },
  'View Details': { am: 'ዝርዝሩን ይመልከቱ', om: 'Bal\'ina Ilaali', ti: 'ዝርዝር ርአ' },

  // Common UI Actions & Controls
  'Save': { am: 'አስቀምጥ', om: 'Olkaayi', ti: 'ዓቅብ' },
  'Cancel': { am: 'ሰርዝ', om: 'Haqi', ti: 'ሰርዝ' },
  'Delete': { am: 'አጥፋ', om: 'Balleessi', ti: 'ደምስስ' },
  'Edit': { am: 'አርትዕ', om: 'Gulaali', ti: 'ኣርትዕ' },
  'Approve': { am: 'ፍቀድ', om: 'Mirkaneessi', ti: 'ፍቀድ' },
  'Reject': { am: 'አትፍቀድ', om: 'Didi', ti: 'ኣይትፍቀድ' },
  'Submit': { am: 'አስገባ', om: 'Ergi', ti: 'ኣእትው' },
  'Search': { am: 'ፈልግ', om: 'Barbaadi', ti: 'ድለይ' },
  'Filter': { am: 'አጣራ', om: 'Gingilchi', ti: 'ኣጻሪ' },
  'Export': { am: 'አውጣ', om: 'Baasi', ti: 'ኣውጽእ' },
  'Loading...': { am: 'በመጫን ላይ...', om: 'Fe\'amaa jira...', ti: 'ይጽዓን ኣሎ...' },
  'No data found': { am: 'ምንም መረጃ አልተገኘም', om: 'Odeeffannoon hin argamne', ti: 'ምንም ሓበሬታ ኣይተረኽበን' },
  'Actions': { am: 'እርምጃዎች', om: 'Tarkaanfiiwwan', ti: 'ተግባራት' },
  'Status': { am: 'ሁኔታ', om: 'Haala', ti: 'ኩነታት' },
  'Date': { am: 'ቀን', om: 'Guyyaa', ti: 'ዕለት' },
  'Name': { am: 'ስም', om: 'Maqaa', ti: 'ስም' },
  'Full Name': { am: 'ሙሉ ስም', om: 'Maqaa Guutuu', ti: 'ምሉእ ስም' },
  'Phone': { am: 'ስልክ', om: 'Bilbila', ti: 'ተሌፎን' },
  'Email': { am: 'ኢሜይል', om: 'Iimeelii', ti: 'ኢመይል' },
  'Close': { am: 'ዝጋ', om: 'Cufi', ti: 'ዕጾ' },
  'Confirm': { am: 'አረጋግጥ', om: 'Mirkaneessi', ti: 'ኣረጋግጽ' },
  'Yes': { am: 'አዎ', om: 'Eeyyee', ti: 'እወ' },
  'No': { am: 'አይ', om: 'Lakki', ti: 'ኣይፋል' },
  'Select': { am: 'ይምረጡ', om: 'Filadhu', ti: 'ምረጽ' },
  'Select Role': { am: 'ሚና ይምረጡ', om: 'Gahee Filadhu', ti: 'ተራ ምረጽ' },
  'Select Region': { am: 'ክልል ይምረጡ', om: 'Naannoo Filadhu', ti: 'ክልል ምረጽ' },
  'Select Shift': { am: 'ፈረቃ ይምረጡ', om: 'Garee Hojii Filadhu', ti: 'ተራ ምረጽ' },

  // Reports
  'Submit Daily Report': { am: 'የዕለት ሪፖርት ያስገቡ', om: 'Gabaasa Guyyaa Ergi', ti: 'ናይ መዓልቲ ጸብጻብ ኣእትው' },
  'Site Name': { am: 'የጣቢያው ስም', om: 'Maqaa Bakkaa', ti: 'ስም መደበር' },
  'Citizens Registered Today': { am: 'ዛሬ የተመዘገቡ ዜጎች', om: 'Lammiilee Har\'a Galmaa\'an', ti: 'ሎሚ ዝተመዝገቡ ዜጋታት' },
  'Attendance Status': { am: 'የእንደሪ ሁኔታ', om: 'Haala Argamaa', ti: 'ኩነታት ህላወ' },
  'Present': { am: 'ተገኝቷል', om: 'Argameera', ti: 'ተረኺቡ' },
  'Late': { am: 'ዘግይቷል', om: 'Turteera', ti: 'ደንጒዩ' },
  'Half Day': { am: 'ግማሽ ቀን', om: 'Walakkaa Guyyaa', ti: 'ፍርቂ መዓልቲ' },
  'Absent': { am: 'አልተገኘም', om: 'Hafaniiru', ti: 'ኣይተረኽበን' },
  'Work Hours': { am: 'የስራ ሰዓታት', om: 'Sa\'aatii Hojii', ti: 'ሰዓታት ስራሕ' },
  'Operational Status': { am: 'የስራ ሁኔታ', om: 'Haala Hojii', ti: 'ኩነታት ስርሒት' },
  'Interrupted': { am: 'ተቋርጧል', om: 'Citee jira', ti: 'ተቋሪጹ' },
  'Equipment Status': { am: 'የመሳሪያ ሁኔታ', om: 'Haala Meeshaa', ti: 'ኩነታት መሳርሒ' },
  'Operational': { am: 'የሚሰራ', om: 'Kan Hojjetu', ti: 'ዝሰርሕ' },
  'Partially Operational': { am: 'በከፊል የሚሰራ', om: 'Gartokkoo Kan Hojjetu', ti: 'ብኽፋል ዝሰርሕ' },
  'Non-Operational': { am: 'የማይሰራ', om: 'Kan Hin Hojjenne', ti: 'ዘይሰርሕ' },
  'Materials Used': { am: 'የተጠቀሙት ቁሳቁሶች', om: 'Meeshaalee Fayyadaman', ti: 'ዝተጠቐምዎም ኣቑሑ' },
  'Team Members Present': { am: 'የተገኙ የቡድን አባላት', om: 'Miseensota Garee Argaman', ti: 'ዝተረኽቡ ኣባላት ጉጅለ' },
  'Weather Conditions': { am: 'የአየር ሁኔታ', om: 'Haala Qilleensaa', ti: 'ኩነታት ኣየር' },
  'Challenges': { am: 'ተግዳሮቶች', om: 'Rakkinaalee', ti: 'ድድሒትታት' },
  'Comments': { am: 'አስተያየቶች', om: 'Yaada', ti: 'ርእይቶታት' },
  'Submit Report': { am: 'ሪፖርት ያስገቡ', om: 'Gabaasa Ergi', ti: 'ጸብጻብ ኣእትው' },
  'Report submitted successfully!': { am: 'ሪፖርት በተሳካ ሁኔታ ተላልፏል!', om: 'Gabaasni milkaa\'inaan ergameera!', ti: 'ጸብጻብ ብዓወት ተላኢኹ!' },

  // Sessions & Screen Time
  'Start Session': { am: 'ክፍለ ጊዜ ጀምር', om: 'Marsaa Jalqabi', ti: 'እዋን ጀምር' },
  'Pause Session': { am: 'ለጊዜው አቁም', om: 'Marsaa Dhaabi', ti: 'ንጊዜኡ ኣዕርፍ' },
  'Resume Session': { am: 'ቀጥል', om: 'Marsaa Itti Fufi', ti: 'ቀጽል' },
  'End Session': { am: 'አጠናቅቅ', om: 'Marsaa Xumuri', ti: 'ዛዝም' },
  'Login Time': { am: 'የመግቢያ ሰዓት', om: 'Yeroo Seensaa', ti: 'ናይ ምእታው ሰዓት' },
  'Logout Time': { am: 'የመውጫ ሰዓት', om: 'Yeroo Ba\'insaa', ti: 'ናይ ምውጻእ ሰዓት' },
  'Total Time': { am: 'ጠቅላላ ሰዓት', om: 'Yeroo Waliigalaa', ti: 'ጠቕላላ ግዜ' },
  'Limit': { am: 'ገደብ', om: 'Daangaa', ti: 'ወሰን' },
  'Set Limit': { am: 'ገደብ አስቀምጥ', om: 'Daangaa Kaa\'i', ti: 'ወሰን ግበር' },
  'Hours Worked': { am: 'የተሰራባቸው ሰዓታት', om: 'Sa\'aatii Hojjetame', ti: 'ዝተሰርሑ ሰዓታት' },
  'Check In': { am: 'መግቢያ', om: 'Galma Seensaa', ti: 'ምእታው' },
  'Check Out': { am: 'መውጫ', om: 'Galma Ba\'insaa', ti: 'ምውጻእ' },

  // Users
  'Create New User': { am: 'አዲስ ተጠቃሚ ፍጠር', om: 'Fayyadaamaa Haaraa Uumi', ti: 'ሓድሽ ተጠቃሚ ፍጠር' },
  'Add new Field Officer or Supervisor': { am: 'አዲስ የመስክ ኃላፊ ወይም ሱፐርቫይዘር ይጨምሩ', om: 'Hojjetaa dirree ykn tooftaa haaraa dabali', ti: 'ሓድሽ ሓላፊ ግዳም ወይ ተቖጻጻሪ ወስኽ' },
  'All Users': { am: 'ሁሉም ተጠቃሚዎች', om: 'Fayyadamtoota Hunda', ti: 'ኩሎም ተጠቀምቲ' },
  'No users found': { am: 'ምንም ተጠቃሚ አልተገኘም', om: 'Fayyadamtootni hin argamne', ti: 'ምንም ተጠቀምቲ ኣይተረኽቡን' },
  'Total Users': { am: 'ጠቅላላ ተጠቃሚዎች', om: 'Fayyadamtoota Waliigalaa', ti: 'ጠቕላላ ተጠቀምቲ' },
  'Shift': { am: 'ፈረቃ', om: 'Garee Hojii', ti: 'ተራ ስራሕ' },
  'Department': { am: 'ክፍል', om: 'Kutaa', ti: 'ክፍሊ' },
  'Assigned Sites': { am: 'የተመደቡባቸው ጣቢያዎች', om: 'Bakkeewwan Ramadaman', ti: 'ዝተመደቡሎም መደበራት' },
  'Deactivate': { am: 'አቦዝን', om: 'Balleessi', ti: 'ኣሰናኽል' },
  'Activate': { am: 'አንቃ', om: 'Kakaasi', ti: 'ኣንቅሕ' },
  'Employee ID': { am: 'የሰራተኛ መለያ', om: 'Eenyummaa Hojjetaa', ti: 'መፍለዪ ሰራሕተኛ' },
  'Day': { am: 'ቀን', om: 'Guyyaa', ti: 'ቀትር' },
  'Night': { am: 'ማታ', om: 'Halkan', ti: 'ለይቲ' },
  'Flexible': { am: 'ተለዋዋጭ', om: 'Jijjiiramaa', ti: 'ተለዋዋጢ' },

  // Notifications
  'Mark all as read': { am: 'ሁሉንም እንደተነበቡ ምልክት አድርግ', om: 'Hunda akka dubbifametti mallatteessi', ti: 'ኩሎም ከም እተነበቡ ምልክት ግበር' },
  'No notifications': { am: 'ምንም ማንቂያ የለም', om: 'Beeksisni hin jiru', ti: 'ምንም መጠንቀቕታ የለውን' },

  // Sync Center & Telemetry
  'Sync Now': { am: 'አሁን አመሳስል', om: 'Amma Walqabsiisi', ti: 'ሕጂ ኣመሳስል' },
  'Pull Updates': { am: 'ዝማኔዎችን አምጣ', om: 'Haaromsawwan Fidi', ti: 'ሓደሽቲ ዛዕባታት ኣምጽእ' },
  'All data synchronized': { am: 'ሁሉም መረጃ ተመሳስሏል', om: 'Odeeffannoon hundi walqabateera', ti: 'ኩሉ መረዳእታ ተመሳሲሉ' },
  'Pending Sync Items': { am: 'በማመሳሰል ላይ ያሉ እቃዎች', om: 'Meeshaalee Walqabsiisa Eegan', ti: 'ምስምሳል ዝጽበዩ ዘለዉ' },
  'Synchronization Diagnostics & Telemetry': { am: 'የማመሳሰል ምርመራ እና ቴሌሜትሪ', om: 'Qorannoo fi Tajaajila Walqabsiisaa', ti: 'ምርመራን ቴሌሜትሪን ምስምሳል' },
  'Sync Health': { am: 'የማመሳሰል ጤና ሁኔታ', om: 'Fayyaa Walqabsiisaa', ti: 'ጥዕና ምስምሳል' },
  'Successfully synchronized records with PostgreSQL!': { am: 'መረጃዎች ከዋናው ዳታቤዝ ጋር በተሳካ ሁኔታ ተመሳስለዋል!', om: 'Galmeeleen milkaa\'inaan kuusaa daataa waliin walqabataniiru!', ti: 'መዛግብቲ ምስ ማእከላይ ዳታቤዝ ብዓወት ተመሳሲሎም!' },

  // Dashboard & Telemetry Sections
  'Operations & System Overview': { am: 'የስራዎች እና የስርዓት አጠቃላይ እይታ', om: 'Ilaalcha Waliigalaa Hojiiwwanii fi Sirnaa', ti: 'ሓፈሻዊ ርእይቶ ስርሒታትን ስርዓትን' },
  'Real-time operational metrics across all organizational divisions': {
    am: 'በሁሉም ድርጅታዊ ክፍሎች ውስጥ ያሉ የቀጥታ የስራ መለኪያዎች',
    om: 'Safartuuwwan hojii kallattii kutaa hundumaa keessatti',
    ti: 'ናይ ቀጥታ ስራሕ መለክዒታት ኣብ ኩሎም ክፍልታት'
  },
  '7-Day Registration Velocity': { am: 'የ7-ቀን የምዝገባ ፍጥነት', om: 'Saffisa Galmee Guyyoota 7', ti: 'ናይ 7-መዓልቲ ናህሪ ምዝገባ' },
  'Daily citizen registrations recorded and synchronized': {
    am: 'የተመዘገቡ እና የተመሳሰሉ የዕለት የዜጎች ምዝገባዎች',
    om: 'Galmee lammiilee guyyaa guyyaan qabameefi walqabate',
    ti: 'ናይ መዓልቲ ዝተመዝገቡን ዝተመሳሰሉን ዜጋታት'
  },
  'Geographic Distribution by Region': { am: 'መልክዓ-ምድራዊ ስርጭት በክልል', om: 'Raabsa Ji\'oogiraafii Naannoodhaan', ti: 'ጂኦግራፊያዊ ኣቀማምጣ ብክልል' },
  'Citizen registration density across administrative regions': {
    am: 'በአስተዳደራዊ ክልሎች ውስጥ የዜጎች ምዝገባ ስርጭት',
    om: 'Heddumina galmee lammiilee naannolee bulchiinsaa keessatti',
    ti: 'ጽቕጥቕጥ ምዝገባ ዜጋታት ኣብ ምምሕዳራዊ ክልላት'
  },
  'Demographic Distribution': { am: 'የስነ-ህዝብ ስርጭት', om: 'Raabsa Ummataa', ti: 'ስነ-ህዝባዊ ስርጭት' },
  'Gender breakdown of registered citizens': { am: 'የተመዘገቡ ዜጎች የጾታ ክፍፍል', om: 'Qoodinsa koorniyaa lammiilee galmaa\'anii', ti: 'ናይ ዝተመዝገቡ ዜጋታት ጾታዊ ምምቃል' },
  'Live Operational Activity Stream': { am: 'የቀጥታ ስራዎች እንቅስቃሴ ፍሰት', om: 'Ya\'a Sochii Hojii Kallattii', ti: 'ቀጥታዊ ፍሰት ንጥፈታት ስርሒት' },
  'Real-time stream of field officer activities & telemetry': {
    am: 'የመስክ ኃላፊዎች እንቅስቃሴ እና ቴሌሜትሪ የቀጥታ ፍሰት',
    om: 'Ya\'a kallattii sochiiwwan hojjettoota dirree fi teelemeetirii',
    ti: 'ቀጥታዊ ፍሰት ንጥፈታትን ቴሌሜትሪን ሓለፍቲ ግዳም'
  },
  'View Full Timeline': { am: 'ሙሉውን የጊዜ ሰሌዳ ይመልከቱ', om: 'Yeroo Guutuu Ilaali', ti: 'ምሉእ ታሪኽ ግዜ ርአ' },
  'Supervisor Registration Performance by Assigned Zone': {
    am: 'የሱፐርቫይዘሮች የምዝገባ አፈጻጸም በተመደቡበት ዞን',
    om: 'Raawwii Galmee Tooftaa Zoonii Ramadameen',
    ti: 'ናይ ተቖጻጻሪታት ናይ ምዝገባ ብቕዓት ብዝተመደበ ዞባ'
  },
  'Comparative citizen intake volume across zonal jurisdictions and supervisory units': {
    am: 'በዞን እና በሱፐርቫይዘር ክፍሎች የተመዘገቡ ዜጎች ንጽጽር',
    om: 'Walbira qabinsa heddumina galmee lammiilee zooniifi kutaalee tooftaa keessatti',
    ti: 'ምንጽጻር ብዝሒ ምዝገባ ዜጋታት ኣብ መንጎ ዞባታትን ኣሃዱታት ቁጽጽርን'
  },
  'Top Performing Zone': { am: 'ከፍተኛ አፈጻጸም ያለው ዞን', om: 'Zoonii Raawwii Olaanaa', ti: 'ዝለዓለ ብቕዓት ዘለዎ ዞባ' },
  'Active Supervisors': { am: 'ንቁ ሱፐርቫይዘሮች', om: 'Tooftota Hojiirra Jiran', ti: 'ንጡፋት ተቖጻጸርቲ' },
  'Total Zonal Intake': { am: 'ጠቅላላ የዞን ምዝገባ', om: 'Galmee Zoonii Waliigalaa', ti: 'ጠቕላላ ምዝገባ ዞባ' },
  'Field Officer Performance & Telemetry': { am: 'የመስክ ኃላፊ አፈጻጸም እና ቴሌሜትሪ', om: 'Raawwii fi Teelemeetirii Hojjetaa Dirree', ti: 'ብቕዓትን ቴሌሜትሪን ሓላፊ ግዳም' },
  'Click any field officer to inspect detailed individual telemetry': {
    am: 'ዝርዝር መረጃውን ለማየት የመስክ ኃላፊውን ጠቅ ያድርጉ',
    om: 'Teelemeetirii bal\'aa ilaaluuf hojjetaa dirree kamiyyuu cuqaasaa',
    ti: 'ዝርዝር ቴሌሜትሪ ንምርኣይ ኣብ ዝኾነ ሓላፊ ግዳም ጠውቑ'
  },
  'Manage Force': { am: 'ቡድኑን አስተዳድር', om: 'Humna Bulchi', ti: 'ሓይሊ ሰራሕተኛ ምሓዝ' },
  'Inspect Supervisors & Zones': { am: 'ሱፐርቫይዘሮችን እና ዞኖችን ይመርምሩ', om: 'Tooftotaafi Zoonota Qoradhu', ti: 'ተቖጻጸርትን ዞባታትን መርምር' },
  'Rank': { am: 'ደረጃ', om: 'Sadarkaa', ti: 'ደረጃ' },
  'Officer': { am: 'ኃላፊ', om: 'Hojjetaa', ti: 'ሓላፊ' },
  'Woreda / Territory': { am: 'ወረዳ / ግዛት', om: 'Aanaa / Naannoo Hojii', ti: 'ወረዳ / ዞባ' },
  'Registrations': { am: 'ምዝገባዎች', om: 'Galmeewwan', ti: 'ምዝገባታት' },
  'Reports': { am: 'ሪፖርቶች', om: 'Gabaasota', ti: 'ጸብጻባት' },
  'Detail': { am: 'ዝርዝር', om: 'Bal\'ina', ti: 'ዝርዝር' },
  'Inspect': { am: 'መርምር', om: 'Qoradhu', ti: 'መርምር' },
  'Field Officer Telemetry Drilldown': { am: 'የመስክ ኃላፊ ዝርዝር ቴሌሜትሪ', om: 'Bal\'ina Teelemeetirii Hojjetaa Dirree', ti: 'ዕምቆት ቴሌሜትሪ ሓላፊ ግዳም' },
  'Comprehensive field operational performance and submission history': {
    am: 'አጠቃላይ የመስክ ስራ አፈጻጸም እና የሪፖርት ታሪክ',
    om: 'Raawwii hojii dirree guutuu fi seenaa gabaasaa',
    ti: 'ሓፈሻዊ ስርሒታዊ ብቕዓት ግዳምን ታሪክ ጸብጻባትን'
  },
  'Close Drilldown': { am: 'ዝርዝሩን ዝጋ', om: 'Bal\'ina Cufi', ti: 'ዝርዝር ዕጾ' },
  'Today\'s Report Status': { am: 'የዛሬ ሪፖርት ሁኔታ', om: 'Haala Gabaasa Har\'aa', ti: 'ኩነታት ጸብጻብ ሎሚ' },
  'Shift Logged ✓': { am: 'ፈረቃ ተመዝግቧል ✓', om: 'Marsaan Galmaa\'eera ✓', ti: 'ተራ ስራሕ ተመዝጊቡ ✓' },
  'Action Required': { am: 'እርምጃ ያስፈልጋል', om: 'Tarkaanfiin Ni Barbaachisa', ti: 'ስጉምቲ የድሊ' },
  'Daily Report Compliance': { am: 'የዕለት ሪፖርት ተገዢነት', om: 'Kabaja Gabaasa Guyyaa', ti: 'ተገዛእነት ናይ መዓልቲ ጸብጻብ' },
  '100% Complete': { am: '100% ተጠናቋል', om: '100% Xumurameera', ti: '100% ተዛዚሙ' },
  'In Progress': { am: 'በሂደት ላይ', om: 'Adeemsa Irra Jira', ti: 'ኣብ ከይዲ ዘሎ' },
  'Compliance': { am: 'ተገዢነት', om: 'Kabaja Seeraa', ti: 'ተገዛእነት' },
  'Active Staff': { am: 'ንቁ ሰራተኞች', om: 'Hojjattoota Hojiirra Jiran', ti: 'ንጡፋት ሰራሕተኛታት' },
  'Sync Queue': { am: 'የማመሳሰል ወረፋ', om: 'Tarree Walqabsiisaa', ti: 'ሰልፊ ምስምሳል' },
  'Telemetry': { am: 'ቴሌሜትሪ', om: 'Teelemeetirii', ti: 'ቴሌሜትሪ' },

  // Citizens Database & Directory
  'My Total Registered': { am: 'የኔ ጠቅላላ ምዝገባ', om: 'Galmee Koo Waliigalaa', ti: 'ናተይ ጠቕላላ ዝተመዝገቡ' },
  'Total Registered': { am: 'ጠቅላላ የተመዘገቡ', om: 'Waliigala Galmaa\'an', ti: 'ጠቕላላ ዝተመዝገቡ' },
  'Enrolled by you': { am: 'በእርስዎ የተመዘገቡ', om: 'Isiniin kan galmaa\'e', ti: 'ብኣኻትኩም ዝተመዝገቡ' },
  'All registered citizens': { am: 'ሁሉም የተመዘገቡ ዜጎች', om: 'Lammiilee galmaa\'an hunda', ti: 'ኩሎም ዝተመዝገቡ ዜጋታት' },
  'Synced to Cloud': { am: 'ከደመና ጋር የተመሳሰለ', om: 'Duumessa Waliin Walqabate', ti: 'ናብ ደመና ዝተመሳሰለ' },
  'Persisted on central server': { am: 'በዋናው አገልጋይ ላይ የተቀመጠ', om: 'Sarvara giddu-galeessaa irratti kuufame', ti: 'ኣብ ማእከላይ ሰርቨር ዝተዓቀበ' },
  'Buffered on Device': { am: 'በመሳሪያው ላይ የተያዘ', om: 'Meeshaa Irratti Kan Eegamu', ti: 'ኣብ መሳርሒ ዝተዓቀበ' },
  'Buffered on this device': { am: 'በዚህ መሳሪያ ላይ ተቀምጧል', om: 'Meeshaa kana irratti qabameera', ti: 'ኣብዚ መሳርሒ ተታሒዙ ኣሎ' },
  'Pending Local Sync': { am: 'የአካባቢ ማመሳሰል በመጠባበቅ ላይ', om: 'Walqabsiisa Naannoo Eegaa Jira', ti: 'ናይ ከባቢ ምስምሳል ዝጽበ' },
  'Registered males': { am: 'የተመዘገቡ ወንዶች', om: 'Dhiirota galmaa\'an', ti: 'ዝተመዝገቡ ተባዕትዮ' },
  'Registered females': { am: 'የተመዘገቡ ሴቶች', om: 'Dubartoota galmaa\'an', ti: 'ዝተመዝገባ ኣንስቲ' },
  'Search by citizen name, 12-digit ID, phone, email, woreda, or kebele/village...': {
    am: 'በዜጋው ስም፣ ባለ 12-አሃዝ መታወቂያ፣ ስልክ፣ ኢሜይል፣ ወረዳ ወይም ቀበሌ ይፈልጉ...',
    om: 'Maqaa lammiitiin, lakkoofsa eenyummaa dijiitii 12, bilbila, iimeelii, aanaa ykn gandaan barbaadaa...',
    ti: 'ብሽም ዜጋ፣ 12-ኣሃዝ መንነት፣ ተሌፎን፣ ኢመይል፣ ወረዳ ወይ ቀበሌ ድለዩ...'
  },
  'Clear search': { am: 'ፍለጋውን አጽዳ', om: 'Barbaacha Haqii', ti: 'ምድላይ ኣጽሪ' },
  'Filter by registration date': { am: 'በምዝገባ ቀን አጣራ', om: 'Guyyaa Galmeetiin Sitiri', ti: 'ብዕለት ምዝገባ ኣጻሪ' },
  'Today': { am: 'ዛሬ', om: 'Har\'a', ti: 'ሎሚ' },
  'All Dates': { am: 'ሁሉም ቀናት', om: 'Guyyoota Hunda', ti: 'ኩሎም ዕለታት' },
  'Registered By: All Officers': { am: 'የመዘገበው፡ ሁሉም ኃላፊዎች', om: 'Kan Galmeesse: Hojjattoota Hunda', ti: 'ዘመዝገቦ፡ ኩሎም ሓለፍቲ' },
  'All Sync States': { am: 'ሁሉም የማመሳሰል ሁኔታዎች', om: 'Haalota Walqabsiisaa Hunda', ti: 'ኩሎም ኩነታት ምስምሳል' },
  'All Genders': { am: 'ሁሉም ጾታዎች', om: 'Koorniyaa Hunda', ti: 'ኩሎም ጾታታት' },
  'Clear Filters': { am: 'ማጣሪያዎችን አጽዳ', om: 'Gingilchituu Haqii', ti: 'መጻረዪታት ኣጽሪ' },
  'Reset All Filters': { am: 'ሁሉንም ማጣሪያዎች መልስ', om: 'Gingilchituu Hunda Deebisi', ti: 'ኩሎም መጻረዪታት ኣዐሪ' },
  'Officer Intake Throughput': { am: 'የኃላፊው የምዝገባ መጠን', om: 'Gahumsa Galmee Hojjetaa', ti: 'መጠን ምዝገባ ሓላፊ' },
  'Citizen Name & 12-Digit ID': { am: 'የዜጋ ስም እና ባለ 12-አሃዝ መታወቂያ', om: 'Maqaa Lammii fi ID Dijiitii 12', ti: 'ስም ዜጋን 12-ኣሃዝ መንነትን' },
  'Contact': { am: 'አድራሻ', om: 'Qunnamtii', ti: 'ርክብ' },
  'Age': { am: 'ዕድሜ', om: 'Umurii', ti: 'ዕድመ' },
  'Kebele / Village': { am: 'ቀበሌ / መንደር', om: 'Ganda / Mandara', ti: 'ቀበሌ / ዓዲ' },
  'Details': { am: 'ዝርዝሮች', om: 'Bal\'ina', ti: 'ዝርዝር' },
  'Copy': { am: 'ቅዳ', om: 'Garagalchi', ti: 'ቕዳሕ' },
  'Copied': { am: 'ተቀድቷል', om: 'Garagalchameera', ti: 'ተቐዲሑ' },
  'Copy ID': { am: 'መታወቂያ ቅዳ', om: 'ID Garagalchi', ti: 'መንነት ቕዳሕ' },
  'Copy phone': { am: 'ስልክ ቅዳ', om: 'Bilbila Garagalchi', ti: 'ተሌፎን ቕዳሕ' },
  'Citizen Details': { am: 'የዜጋው ዝርዝር መረጃ', om: 'Bal\'ina Lammii', ti: 'ዝርዝር ሓበሬታ ዜጋ' },
  'Personal Demographics': { am: 'የግል ስነ-ህዝብ መረጃ', om: 'Odeeffannoo Ummataa Dhuunfaa', ti: 'ብሕታዊ ስነ-ህዝባዊ መረዳእታ' },
  'Calculated Age': { am: 'የተሰላ ዕድሜ', om: 'Umurii Shallagame', ti: 'ዝተሰልዐ ዕድመ' },
  'Mobile Phone Number': { am: 'የሞባይል ስልክ ቁጥር', om: 'Lakkoofsa Bilbila Moobaayilaa', ti: 'ቁጽሪ ሞባይል ተሌፎን' },
  'Ethiopian Administrative Jurisdiction': { am: 'የኢትዮጵያ አስተዳደራዊ ክልል', om: 'Aangoo Bulchiinsa Itoophiyaa', ti: 'ምምሕዳራዊ ዞባ ኢትዮጵያ' },
  'Registration Provenance & Device Audit': { am: 'የምዝገባ አመጣጥ እና የመሳሪያ ኦዲት', om: 'Madda Galmee fi Qorannoo Meeshaa', ti: 'ምንጪ ምዝገባን ኦዲት መሳርሕን' },
  'Registered By (Officer)': { am: 'የመዘገበው (ኃላፊ)', om: 'Kan Galmeesse (Hojjetaa)', ti: 'ዘመዝገቦ (ሓላፊ)' },
  'Officer Employee ID': { am: 'የኃላፊው የሰራተኛ መለያ', om: 'ID Hojjetaa', ti: 'መፍለዪ ቁጽሪ ሓላፊ' },
  'Intake Timestamp': { am: 'የተመዘገበበት ሰዓት', om: 'Yeroo Galmee', ti: 'ዝተመዝገበሉ ግዜ' },
  'Close Details': { am: 'ዝርዝሩን ዝጋ', om: 'Bal\'ina Cufi', ti: 'ዝርዝር ዕጾ' },
  'No Citizen Records Registered Yet': { am: 'እስካሁን የተመዘገበ ዜጋ የለም', om: 'Hanga ammaatti lammiin galmaa\'e hin jiru', ti: 'ክሳዕ ሕጂ ዝተመዝገበ ዜጋ የለን' },
  'No Citizen Records Found': { am: 'ምንም የዜጋ መረጃ አልተገኘም', om: 'Galmeen lammii hin argamne', ti: 'ዝኾነ መዝገብ ዜጋ ኣይተረኽበን' },
  'Register Citizen Now': { am: 'አሁን ዜጋ ይመዝገቡ', om: 'Amma Lammii Galmeessi', ti: 'ሕጂ ዜጋ መዝግብ' },

  // Citizen Registration Console
  'Citizen Registration Console': { am: 'የዜጎች ምዝገባ ማዕከል', om: 'Iddoo Galmee Lammiilee', ti: 'ማእከል ምዝገባ ዜጋታት' },
  'Register citizens easily': { am: 'ዜጎችን በቀላሉ ይመዝገቡ', om: 'Lammiilee salphatti galmeessaa', ti: 'ንዜጋታት ብቐሊሉ መዝግብ' },
  'Offline Mode • Stored Locally': { am: 'ከመስመር ውጭ ሁነታ • በኮምፒዩተሩ ተቀምጧል', om: 'Haala Toora-Alaa • Meeshaa Irratti Kuufame', ti: 'ዘይመስመር ኩነታት • ኣብ መሳርሒ ተዓቂቡ' },
  'Intake Enrolled Successfully': { am: 'ምዝገባው በተሳካ ሁኔታ ተከናውኗል', om: 'Galmeen Milkaa\'inaan Xumurameera', ti: 'ምዝገባ ብዓወት ተፈጺሙ' },
  '12-Digit Citizen ID:': { am: 'ባለ 12-አሃዝ የዜጋ መታወቂያ፡', om: 'ID Lammii Dijiitii 12:', ti: '12-ኣሃዝ መንነት ዜጋ፡' },
  'View in Registered Citizens': { am: 'በተመዘገቡ ዜጎች ዝርዝር ውስጥ ይመልከቱ', om: 'Lammiilee Galmaa\'an Keessatti Ilaali', ti: 'ኣብ ዝተመዝገቡ ዜጋታት ርአ' },
  'Dismiss': { am: 'አሰናብት', om: 'Dhiisi', ti: 'ሕደጎ' },
  '1. Citizen Identity & Demographics': { am: '1. የዜጋው ማንነት እና ስነ-ህዝብ', om: '1. Eenyummaa fi Ummata Lammii', ti: '1. መንነትን ስነ-ህዝብን ዜጋ' },
  'Legal full name and date of birth required for biographic enrollment': {
    am: 'ለባዮግራፊክ ምዝገባ ህጋዊ ሙሉ ስም እና የትውልድ ቀን ያስፈልጋል',
    om: 'Galmee seeraaf maqaa guutuufi guyyaan dhalootaa barbaachisaadha',
    ti: 'ንባዮግራፊክ ምዝገባ ሕጋዊ ምሉእ ስምን ዕለት ልደትን የድሊ'
  },
  'Middle Name (Optional)': { am: 'የአባት ስም (አማራጭ)', om: 'Maqaa Abbaa (Filannoo)', ti: 'ስም ኣቦ (ኣማራጺ)' },
  'Middle Name (Father)': { am: 'የአባት ስም', om: 'Maqaa Abbaa', ti: 'ስም ኣቦ' },
  '2. Contact Channels (Optional)': { am: '2. የመገናኛ መንገዶች (አማራጭ)', om: '2. Karaalee Qunnamtii (Filannoo)', ti: '2. መራኸቢ መስመራት (ኣማራጺ)' },
  'Phone Number (Optional)': { am: 'የስልክ ቁጥር (አማራጭ)', om: 'Lakkoofsa Bilbilaa (Filannoo)', ti: 'ቁጽሪ ተሌፎን (ኣማራጺ)' },
  'Email Address (Optional)': { am: 'የኢሜይል አድራሻ (አማራጭ)', om: 'Teessoo Iimeelii (Filannoo)', ti: 'ኣድራሻ ኢመይል (ኣማራጺ)' },
  '3. Administrative Address & Location': { am: '3. አስተዳደራዊ አድራሻ እና ቦታ', om: '3. Teessoo fi Bakka Bulchiinsaa', ti: '3. ምምሕዳራዊ ኣድራሻን ቦታን' },
  'Region / City': { am: 'ክልል / ከተማ', om: 'Naannoo / Magaalaa', ti: 'ክልል / ከተማ' },
  'Zone / Sub-City': { am: 'ዞን / ክፍለ ከተማ', om: 'Zoonii / Kifle Magaalaa', ti: 'ዞባ / ክፍለ ከተማ' },
  'Woreda Station': { am: 'የወረዳ ጣቢያ', om: 'Buufata Aanaa', ti: 'ጣብያ ወረዳ' },
  'Kebele Unit': { am: 'የቀበሌ ክፍል', om: 'Kutaa Gandaa', ti: 'ኣሃዱ ቀበሌ' },
  'Village or Community Name': { am: 'የመንደር ወይም የማህበረሰብ ስም', om: 'Maqaa Mandaraa ykn Hawaasaa', ti: 'ስም ዓዲ ወይ ማሕበረሰብ' },
  'Select Zone': { am: 'ዞን ይምረጡ', om: 'Zoonii Filadhu', ti: 'ዞባ ምረጽ' },
  'Select Woreda': { am: 'ወረዳ ይምረጡ', om: 'Aanaa Filadhu', ti: 'ወረዳ ምረጽ' },
  'Select Kebele': { am: 'ቀበሌ ይምረጡ', om: 'Ganda Filadhu', ti: 'ቀበሌ ምረጽ' },
  'Choose Region First': { am: 'መጀመሪያ ክልል ይምረጡ', om: 'Dursa Naannoo Filadhu', ti: 'ቅድም ክልል ምረጽ' },
  'Choose Zone First': { am: 'መጀመሪያ ዞን ይምረጡ', om: 'Dursa Zoonii Filadhu', ti: 'ቅድም ዞባ ምረጽ' },
  'Choose Woreda First': { am: 'መጀመሪያ ወረዳ ይምረጡ', om: 'Dursa Aanaa Filadhu', ti: 'ቅድም ወረዳ ምረጽ' },
  'Clear Form': { am: 'ቅጹን አጽዳ', om: 'Unka Haqii', ti: 'ፎርም ኣጽሪ' },

  // Daily Work Reports & Submissions
  'Organization Daily Work Reports': { am: 'የድርጅቱ የዕለት የስራ ሪፖርቶች', om: 'Gabaasaalee Hojii Guyyaa Dhaabbataa', ti: 'ናይ ትካል መዓልታዊ ጸብጻባት ስራሕ' },
  'Team Daily Work Reports & Review': { am: 'የቡድን ዕለት የስራ ሪፖርቶች እና ግምገማ', om: 'Gabaasa Hojii Guyyaa Gareefi Gamaggama', ti: 'ናይ ጉጅለ መዓልታዊ ጸብጻብን ገምጋምን' },
  'Central oversight of all field officer submissions, screen-time telemetry & operational roadblocks': {
    am: 'የሁሉም የመስክ ኃላፊዎች ሪፖርቶች፣ የስክሪን ሰዓት እና የስራ ተግዳሮቶች ማዕከላዊ ቁጥጥር',
    om: 'Gabaasaalee hojjettoota dirree, yeroo iskiiriinii fi rakkoolee hojii hunda to\'achuu',
    ti: 'ማእከላይ ቁጽጽር ኩሎም ጸብጻባት ሓለፍቲ ግዳም፣ ሰዓታት ስክሪንን ዕንቅፋታትን'
  },
  'Review submitted daily field deliverables, verify screen-time, and monitor team roadblocks': {
    am: 'የገቡ የመስክ ስራዎችን ይገምግሙ፣ የስክሪን ሰዓትን ያረጋግጡ እና ተግዳሮቶችን ይከታተሉ',
    om: 'Hojiiwwan dirree ergaman gamaaggami, yeroo iskiiriinii mirkaneessi, rakkoolee hordofi',
    ti: 'ዝኣተዉ ስራሕቲ መርምር፣ ሰዓት ስክሪን ኣረጋግጽ፣ ዕንቅፋታት ጉጅለ ተኸታተል'
  },
  'Reports Filed': { am: 'የገቡ ሪፖርቶች', om: 'Gabaasaalee Ergaman', ti: 'ዝኣተዉ ጸብጻባት' },
  'Total Field Screen Time': { am: 'ጠቅላላ የመስክ ስክሪን ሰዓት', om: 'Yeroo Iskiiriinii Dirree Waliigalaa', ti: 'ጠቕላላ ግዜ ስክሪን ግዳም' },
  'Filter by Officer (All Officers)': { am: 'በኃላፊ አጣራ (ሁሉም ኃላፊዎች)', om: 'Hojjetaadhaan Sitiri (Hunda)', ti: 'ብሓላፊ ኣጻሪ (ኩሎም)' },
  'Field Officer Submissions': { am: 'የመስክ ኃላፊዎች ሪፖርቶች', om: 'Gabaasaalee Hojjettoota Dirree', ti: 'ጸብጻባት ሓለፍቲ ግዳም' },
  'Showing reports submitted by field teams': { am: 'በመስክ ቡድኖች የገቡ ሪፖርቶችን በማሳየት ላይ', om: 'Gabaasaalee garee dirreetiin ergaman agarsiisaa jira', ti: 'ብጉጅለታት ግዳም ዝኣተዉ ጸብጻባት የርኢ ኣሎ' },
  'Daily Work & Field Observations': { am: 'የዕለት ስራ እና የመስክ ምልከታዎች', om: 'Hojii Guyyaa fi Hubannoo Dirree', ti: 'ናይ መዓልቲ ስራሕን ናይ ግዳም ተዓዝቦን' },
  'Daily Work Narrative & Completed Deliverables': { am: 'የዕለት ስራ ማብራሪያ እና የተከናወኑ ተግባራት', om: 'Ibsa Hojii Guyyaa fi Hojii Xumurame', ti: 'መግለጺ መዓልታዊ ስራሕን ዝተዛዘሙ ዕዮታትን' },
  'Enter details of today\'s citizen intake, site visits, and completed registrations...': {
    am: 'የዛሬውን የዜጎች ምዝገባ፣ የመስክ ጉብኝት እና የተጠናቀቁ ስራዎችን ያስገቡ...',
    om: 'Bal\'ina galmee lammiilee har\'aa, daawwannaa bakkaa fi galmee xumurame galchaa...',
    ti: 'ናይ ሎሚ ምዝገባ ዜጋታት፣ ናይ ቦታ ምብጻሕን ዝተዛዘሙ ስራሕትን ኣእትዉ...'
  },
  'Roadblocks & Operational Challenges': { am: 'እንቅፋቶች እና የስራ ተግዳሮቶች', om: 'Gufuuwwan fi Qormaataalee Hojii', ti: 'ዕንቅፋታትን ስርሒታዊ ብድሆታትን' },
  'Describe any field obstacles, network issues, or equipment challenges...': {
    am: 'ያጋጠሙ የመስክ እንቅፋቶችን፣ የኔትወርክ ወይም የመሳሪያ ችግሮችን ይግለጹ...',
    om: 'Rakkinaalee dirree, qunnamtii interneetii ykn meeshaa mudatan ibsaa...',
    ti: 'ዝኾነ ዘጋጠመ ናይ ግዳም ዕንቅፋታት፣ ናይ ኢንተርኔት ወይ መሳርሒ ጸገማት ግለጹ...'
  },
  'Shift Logistics & Next Steps': { am: 'የፈረቃ ሎጂስቲክስ እና ቀጣይ እርምጃዎች', om: 'Lojistiksii Hojii fi Tarkaanfii Itti Aanu', ti: 'ሎጂስቲክስ ስራሕን ዝቕጽሉ ስጉምትታትን' },
  'Resources Used & Logistics Needed': { am: 'ጥቅም ላይ የዋሉ እና የሚያስፈልጉ ቁሳቁሶች', om: 'Meeshaalee Fayyadaman fi Barbaachisan', ti: 'ዝተጠቐምዎምን ዘድልዩን ቀረባትን' },
  'Biometric kits, tablets, vehicle/fuel, battery packs...': {
    am: 'የባዮሜትሪክ መገልገያዎች፣ ታብሌቶች፣ መኪና/ነዳጅ፣ ባትሪዎች...',
    om: 'Meeshaalee baayomeetiriiksii, taableetii, konkolaataa/boba\'aa, baatirii...',
    ti: 'ናይ ባዮሜትሪክ መሳርሕታት፣ ታብሌታት፣ መኪና/ነዳዲ፣ ባተርታት...'
  },
  'Tomorrow\'s Priorities & Target Kebeles': { am: 'የነገ ቅድሚያ የሚሰጣቸው ስራዎች እና ዒላማ ቀበሌዎች', om: 'Dursi Boruu fi Gandoota Xiyyeeffannoo', ti: 'ናይ ጽባሕ ቀዳምነታትን ዒላማ ቀበሌታትን' },
  'Target kebeles, prioritized registration sites for next shift...': {
    am: 'ዒላማ የተደረጉ ቀበሌዎች፣ ለቀጣዩ ፈረቃ ቅድሚያ የሚሰጣቸው የምዝገባ ቦታዎች...',
    om: 'Gandoota xiyyeeffannoo, bakkeewwan galmee dursa kennamuuf...',
    ti: 'ዒላማ ዝተገብሩ ቀበሌታት፣ ንዝቕጽል ተራ ቀዳምነት ዝወሃቦም ናይ ምዝገባ ቦታታት...'
  },
  'Work Summary & Narrative': { am: 'የስራ ማጠቃለያ እና ማብራሪያ', om: 'Cuunfaa Hojii fi Ibsa', ti: 'ጽሟቕ ስራሕን መብርህን' },
  'Key Achievements & Milestones': { am: 'ዋና ዋና ስኬቶች እና ክንውኖች', om: 'Milkaa\'inoota Gurguddoo', ti: 'ቀንድቲ ዓወታትን መድረኻትን' },
  'Roadblocks & Field Challenges': { am: 'እንቅፋቶች እና የመስክ ተግዳሮቶች', om: 'Gufuuwwan fi Qormaata Dirree', ti: 'ዕንቅፋታትን ናይ ግዳም ብድሆታትን' },
  'Resources Used & Needed for Next Shift': { am: 'ጥቅም ላይ የዋሉ እና ለቀጣዩ ፈረቃ የሚያስፈልጉ ቁሳቁሶች', om: 'Meeshaalee Hojiirra Oolanii fi Marsaa Itti Aanuuf Barbaachisan', ti: 'ዝተጠቐምዎምን ንዝቕጽል ተራ ዘድልዩን ኣቑሑ' },
  'Tomorrow\'s Strategy & Target Kebeles': { am: 'የነገ ስትራቴጂ እና ዒላማ ቀበሌዎች', om: 'Tarsiimoo Boruu fi Gandoota Xiyyeeffannoo', ti: 'ናይ ጽባሕ ስትራተጅን ዒላማ ቀበሌታትን' },
  'Close Review': { am: 'ግምገማውን ዝጋ', om: 'Gamaggama Cufi', ti: 'ገምጋም ዕጾ' },
  'Detail Report': { am: 'ዝርዝር ሪፖርት', om: 'Gabaasa Bal\'aa', ti: 'ዝርዝር ጸብጻብ' },
  'Finalized Screen Time': { am: 'የተጠናቀቀ የስክሪን ሰዓት', om: 'Yeroo Iskiiriinii Xumurame', ti: 'ዝተዛዘመ ግዜ ስክሪን' },
  'Recorded Screen Time': { am: 'የተመዘገበ የስክሪን ሰዓት', om: 'Yeroo Iskiiriinii Galmaa\'e', ti: 'ዝተመዝገበ ግዜ ስክሪን' },
  'Reporting Officer': { am: 'ሪፖርት አቅራቢ ኃላፊ', om: 'Hojjetaa Gabaasa Dhiyeesse', ti: 'ጸብጻብ ዘቕረበ ሓላፊ' },
  'Report Date': { am: 'የሪፖርት ቀን', om: 'Guyyaa Gabaasaa', ti: 'ዕለት ጸብጻብ' },
  'Citizens Intake': { am: 'የተመዘገቡ ዜጎች', om: 'Galmee Lammiilee', ti: 'ምዝገባ ዜጋታት' },
  'Active Time': { am: 'ንቁ ሰዓት', om: 'Yeroo Hojii', ti: 'ንጡፍ ግዜ' },
  'Cloud Synced': { am: 'ከደመና ጋር የተመሳሰለ', om: 'Duumessa Waliin Walqabate', ti: 'ምስ ደመና ዝተመሳሰለ' },

  // --- USER & WORKSTATION MANAGEMENT ---
  'User & Workstation Management': { am: 'የተጠቃሚዎች እና የስራ ጣቢያ አስተዳደር', om: 'Bulchiinsa Fayyadamtootaa fi Iddoo Hojii', ti: 'ምሕደራ ተጠቀምትን መደበር ስራሕን' },
  'Administer system accounts, assign Ethiopian administrative hierarchies, and oversee role permissions': {
    am: 'የስርዓት መለያዎችን ያስተዳድሩ፣ የኢትዮጵያ አስተዳደራዊ እርከኖችን ይመድቡ እና የሚና ፈቃዶችን ይቆጣጠሩ',
    om: 'Akkaawuntiiwwan sirnaa bulchaa, sadarkaa bulchiinsa Itoophiyaa ramadaa, hayyama gahees to\'adhaa',
    ti: 'ናይ ስርዓት ሕሳባት ምምሕዳር፡ ናይ ኢትዮጵያ ምምሕዳራዊ መዋቕር ምምዳብን ፍቓዳት ተራ ምቁጽጻርን'
  },
  'Create User': { am: 'ተጠቃሚ ፍጠር', om: 'Fayyadamaa Uumi', ti: 'ተጠቃሚ ፍጠር' },
  'Add New User': { am: 'አዲስ ተጠቃሚ ጨምር', om: 'Fayyadamaa Haaraa Dabali', ti: 'ሓድሽ ተጠቃሚ ወስኽ' },
  'Total Personnel': { am: 'ጠቅላላ ሰራተኞች', om: 'Waliigala Hojjattootaa', ti: 'ጠቕላላ ሰራሕተኛታት' },
  'All staff records': { am: 'ሁሉም የሰራተኞች መረጃዎች', om: 'Galmee hojjattoota hunda', ti: 'ኩሎም መዛግብቲ ሰራሕተኛታት' },
  'Active Accounts': { am: 'ንቁ መለያዎች', om: 'Akkaawuntiiwwan Socho\'an', ti: 'ንጡፋት ሕሳባት' },
  'Frontline agents': { am: 'የቀዳሚ መስመር ወኪሎች', om: 'Hojjettoota toora duraa', ti: 'ናይ ቀዳማይ መስመር ወከልቲ' },
  'Supervisors': { am: 'ተቆጣጣሪዎች', om: 'Tooftota', ti: 'ተቖጻጸርቲ' },
  'Zonal oversight': { am: 'የዞን ቁጥጥር', om: 'Hordoffii Zoonii', ti: 'ናይ ዞባ ቁጽጽር' },
  'Managers': { am: 'ስራ አስኪያጆች', om: 'Manaajeroota', ti: 'ስራሕ ኣካየድቲ' },
  'Command tier': { am: 'የአመራር እርከን', om: 'Sadarkaa Ajajaa', ti: 'ደረጃ ኣመራርሓ' },
  'Unassigned': { am: 'ያልተመደበ', om: 'Kan hin ramadamne', ti: 'ዘይተመደበ' },
  'Needs assignment': { am: 'ምደባ ያስፈልገዋል', om: 'Ramaddii barbaada', ti: 'ምደባ የድልዮ' },
  'Disabled accounts': { am: 'የታገዱ መለያዎች', om: 'Akkaawuntiiwwan cufaman', ti: 'ዝተዓጸዉ ሕሳባት' },
  'Staff Directory': { am: 'የሰራተኞች ማውጫ', om: 'Galmee Hojjattootaa', ti: 'መዝገብ ሰራሕተኛታት' },
  'records': { am: 'መዝገቦች', om: 'galmeewwan', ti: 'መዛግብቲ' },
  'Filtered Records': { am: 'የተጣሩ መረጃዎች', om: 'Galmeewwan Gingilchaman', ti: 'ዝተጻረዩ መዛግብቲ' },
  'Search by staff name, email, employee ID, or location...': {
    am: 'በሰራተኛ ስም፣ ኢሜይል፣ የሰራተኛ መለያ ወይም ቦታ ይፈልጉ...',
    om: 'Maqaa hojjetaa, imeelii, koodii hojjetaa, ykn bakkaan barbaadaa...',
    ti: 'ብሽም ሰራሕተኛ፡ ኢመይል፡ መለለዪ ሰራሕተኛ ወይ ቦታ ድለዩ...'
  },
  'All Roles': { am: 'ሁሉም ሚናዎች', om: 'Gaheewwan Hunda', ti: 'ኩሎም ተራታት' },
  'All Statuses': { am: 'ሁሉም ሁኔታዎች', om: 'Haalawwan Hunda', ti: 'ኩሎም ኩነታት' },
  'Staff Member': { am: 'የሰራተኛ አባል', om: 'Miseensa Hojjetaa', ti: 'ኣባል ሰራሕተኛ' },
  'Authorized personnel, Ethiopian location hierarchy assignments, and workstation status': {
    am: 'የተፈቀደላቸው ሰራተኞች፣ የኢትዮጵያ የቦታ እርከን ምደባዎች እና የስራ ጣቢያ ሁኔታ',
    om: 'Hojjattoota hayyamameef, ramaddii sadarkaa bakka Itoophiyaa fi haala iddoo hojii',
    ti: 'ፍቓድ ዘለዎም ሰራሕተኛታት፡ ናይ ኢትዮጵያ ቦታታት ምደባን ኩነታት መደበር ስራሕን'
  },
  'No staff accounts found': { am: 'ምንም የሰራተኛ መለያ አልተገኘም', om: 'Akkaawuntiin hojjetaa hin argamne', ti: 'ምንም ናይ ሰራሕተኛ ሕሳብ ኣይተረኽበን' },
  'Try adjusting your search criteria or resetting filters': {
    am: 'እባክዎን የፍለጋ መስፈርቱን ያስተካክሉ ወይም ማጣሪያዎችን ዳግም ያስጀምሩ',
    om: 'Mee ulaagaa barbaacha keessanii sirreessaa ykn gingilchitoota deebisaa',
    ti: 'በጃኹም መዐቀኒ ድሌትኩም ኣዐርዩ ወይ መጻረዪታት ዳግማይ ኣጀምሩ'
  },
  'National': { am: 'ሀገር አቀፍ', om: 'Biyyoolessaa', ti: 'ሃገራዊ' },
  'All Zones': { am: 'ሁሉም ዞኖች', om: 'Zooniiwwan Hunda', ti: 'ኩሎም ዞባታት' },
  'All Woredas': { am: 'ሁሉም ወረዳዎች', om: 'Aanaalee Hunda', ti: 'ኩሎም ወረዳታት' },
  'Field Officers': { am: 'የመስክ ኃላፊዎች', om: 'Hojjettoota Dirree', ti: 'ሓለፍቲ ግዳም' },
  'field officer': { am: 'የመስክ ኃላፊ', om: 'Hojjetaa Dirree', ti: 'ሓላፊ ግዳም' },
  'supervisor': { am: 'ተቆጣጣሪ', om: 'Tooftaa', ti: 'ተቖጻጻሪ' },
  'manager': { am: 'ስራ አስኪያጅ', om: 'Manaajera', ti: 'ስራሕ ኣካያዲ' },
  'field_officer': { am: 'የመስክ ኃላፊ', om: 'Hojjetaa Dirree', ti: 'ሓላፊ ግዳም' },
  'Inactive': { am: 'የቦዘነ', om: 'Dhaabbateera', ti: 'ዘይንጡፍ' },
  'active': { am: 'ንቁ', om: 'Hojjataa', ti: 'ንጡፍ' },
  'inactive': { am: 'የቦዘነ', om: 'Dhaabbateera', ti: 'ዘይንጡፍ' },
  'ACTIVE ACCOUNT': { am: 'ንቁ መለያ', om: 'AKKAAWUNTII HOJJATAA', ti: 'ንጡፍ ሕሳብ' },
  'INACTIVE': { am: 'የቦዘነ', om: 'KAN DHAABBATE', ti: 'ዘይንጡፍ' },
  'Inactive Accounts': { am: 'የቦዘኑ መለያዎች', om: 'Akkaawuntiiwwan Dhaabbatan', ti: 'ዘይንጡፋት ሕሳባት' },
  'Copy email': { am: 'ኢሜይሉን ገልብጥ', om: 'Imeelii Waraabi', ti: 'ኢመይል ቅዳሕ' },
  'Reset all filters': { am: 'ሁሉንም ማጣሪያዎች ዳግም አስጀምር', om: 'Gingilchitoota hunda deebisii jalqabsiisi', ti: 'ኩሎም መጻረዪታት ዳግማይ ጀምር' },
  '10 digits starting with 09/07 (or +2519/+2517 with 8 digits)': {
    am: 'በ09/07 የሚጀምሩ 10 ዲጂቶች (ወይም +2519/+2517 ከ8 ዲጂቶች ጋር)',
    om: 'Dijiitii 10 kan 09/07 jalqabu (ykn +2519/+2517 dijiitii 8 waliin)',
    ti: 'ብ09/07 ዝጅምሩ 10 ቁጽርታት (ወይ +2519/+2517 ምስ 8 ቁጽርታት)'
  },
  'ID': { am: 'መለያ', om: 'Koodii', ti: 'መለለዪ' },
  'Staff Account & Profile Details': { am: 'የሰራተኛ መለያ እና የመገለጫ ዝርዝሮች', om: 'Akkaawuntii Hojjetaa fi Bal\'ina Piroofaayilii', ti: 'ናይ ሰራሕተኛ ሕሳብን ዝርዝር ፕሮፋይልን' },
  'Syncing live stats...': { am: 'የቀጥታ መረጃዎችን በማመሳሰል ላይ...', om: 'Ragaalee kallattii walsimsiisaa jira...', ti: 'ቀጥታዊ መረዳእታታት የሰማምዕ ኣሎ...' },
  'Personal & Contact Information': { am: 'የግል እና የግንኙነት መረጃ', om: 'Odeeffannoo Dhuunfaa fi Qunnamtii', ti: 'ብሕታውን ናይ ርክብን ሓበሬታ' },
  'Full Legal Name': { am: 'ሙሉ ህጋዊ ስም', om: 'Maqaa Guutuu Seeraa', ti: 'ምሉእ ሕጋዊ ስም' },
  'Not provided': { am: 'አልተሰጠም', om: 'Hin kennamne', ti: 'ኣይተዋህበን' },
  'Ethiopian Administrative Hierarchy': { am: 'የኢትዮጵያ አስተዳደራዊ እርከን', om: 'Sadarkaa Bulchiinsa Itoophiyaa', ti: 'ናይ ኢትዮጵያ ምምሕዳራዊ መዋቕር' },
  'National Operational Scope': { am: 'ሀገር አቀፍ የስራ ወሰን', om: 'Bal\'ina Hojii Biyyoolessaa', ti: 'ሃገራዊ ስርሒታዊ ወሰን' },
  'Federal Democratic Republic of Ethiopia (Organization-wide Authority)': {
    am: 'የኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ (መላ ድርጅቱን የሚያካትት ስልጣን)',
    om: 'Rippabiliika Dimookiraatawaa Federaalawaa Itoophiyaa (Aangoo Guutuu Dhaabbataa)',
    ti: 'ፈደራላዊት ደሞክራስያዊት ሪፓብሊክ ኢትዮጵያ (ምሉእ ስልጣን ትካል)'
  },
  'Woreda / Station': { am: 'ወረዳ / ጣቢያ', om: 'Aanaa / Buufata', ti: 'ወረዳ / መደበር' },
  'All Woredas in Zone': { am: 'በዞኑ ውስጥ ያሉ ሁሉም ወረዳዎች', om: 'Aanaalee Zoonii Keessaa Hunda', ti: 'ኣብቲ ዞባ ዘለዉ ኩሎም ወረዳታት' },
  'Direct Assigned Supervisor': { am: 'ቀጥታ የተመደበ ተቆጣጣሪ', om: 'Tooftaa Kallattiin Ramadame', ti: 'ቀጥታ ዝተመደበ ተቖጻጻሪ' },
  'Zonal Supervisor': { am: 'የዞን ተቆጣጣሪ', om: 'Tooftaa Zoonii', ti: 'ናይ ዞባ ተቖጻጻሪ' },
  'Change Operational Role': { am: 'የስራ ሚና ቀይር', om: 'Gahee Hojii Jijjiiri', ti: 'ተራ ስራሕ ቀይር' },
  'Select new functional authority for this staff member': {
    am: 'ለዚህ ሰራተኛ አዲስ የስራ ስልጣን ይምረጡ',
    om: 'Miseensa hojjetaa kanaaf aangoo hojii haaraa filadhaa',
    ti: 'ነዚ ሰራሕተኛ ሓድሽ ስርሒታዊ ስልጣን ምረጹ'
  },
  'Frontline citizen registration & woreda field intake': {
    am: 'የቀዳሚ መስመር የዜጎች ምዝገባ እና የወረዳ የመስክ ስራ',
    om: 'Galmee lammiilee toora duraa fi hojii dirree aanaa',
    ti: 'ናይ ቀዳማይ መስመር ምዝገባ ዜጋታትን ናይ ወረዳ ግዳም ስራሕን'
  },
  'Zonal operations coordination & field officer oversight': {
    am: 'የዞን ስራዎች ቅንጅት እና የመስክ ኃላፊዎች ቁጥጥር',
    om: 'Qindeessaa hojii zoonii fi to\'annoo hojjettoota dirree',
    ti: 'ምትሕብባር ስርሒታት ዞባን ቁጽጽር ሓለፍቲ ግዳምን'
  },
  'National command authority & complete administration': {
    am: 'ሀገር አቀፍ የአመራር ስልጣን እና ሙሉ አስተዳደር',
    om: 'Aangoo ajaja biyyoolessaa fi guutummaa bulchiinsaa',
    ti: 'ሃገራዊ ናይ ኣመራርሓ ስልጣንን ምሉእ ምምሕዳርን'
  },
  'Confirm Role Change': { am: 'የሚና ለውጡን አረጋግጥ', om: 'Jijjiirama Gahee Mirkaneessi', ti: 'ምቕያር ተራ ኣረጋግጽ' },
  'Manager Administrative Actions': { am: 'የስራ አስኪያጅ አስተዳደራዊ እርምጃዎች', om: 'Tarkaanfiiwwan Bulchiinsaa Manaajeraa', ti: 'ናይ ስራሕ ኣካያዲ ምምሕዳራዊ ተግባራት' },
  'Edit Profile': { am: 'መገለጫ አርትዕ', om: 'Piroofaayilii Gulaali', ti: 'ፕሮፋይል ኣዐሪ' },
  'Change Role': { am: 'ሚና ቀይር', om: 'Gahee Jijjiiri', ti: 'ተራ ቀይር' },
  'Change Location': { am: 'ቦታ ቀይር', om: 'Bakka Jijjiiri', ti: 'ቦታ ቀይር' },
  'Reset Password': { am: 'የይለፍ ቃል ዳግም አስጀምር', om: 'Jecha Iccitii Deebisii Jalqabsiisi', ti: 'ቃል ምስጢር ዳግማይ ጀምር' },
  'Deactivate Account': { am: 'መለያ አግድ', om: 'Akkaawuntii Cufi', ti: 'ሕሳብ ዕጾ' },
  'Activate Account': { am: 'መለያ አንቃ', om: 'Akkaawuntii Bansi', ti: 'ሕሳብ ኣተግብር' },
  'Edit Staff Profile': { am: 'የሰራተኛ መገለጫ አርትዕ', om: 'Piroofaayilii Hojjetaa Gulaali', ti: 'ፕሮፋይል ሰራሕተኛ ኣዐሪ' },
  'Contact Details': { am: 'የግንኙነት ዝርዝር', om: 'Bal\'ina Qunnamtii', ti: 'ዝርዝር ርክብ' },
  'Ethiopian mobile format (09/07 + 8 digits) or +251': {
    am: 'የኢትዮጵያ ስልክ ቅርጸት (09/07 + 8 ዲጂቶች) ወይም +251',
    om: 'Bifa bilbila Itoophiyaa (09/07 + dijiitii 8) ykn +251',
    ti: 'ቅርጺ ተሌፎን ኢትዮጵያ (09/07 + 8 ቁጽርታት) ወይ +251'
  },
  'Change Operational Role & Workstation Location': {
    am: 'የስራ ሚና እና የስራ ጣቢያ ቦታ ቀይር',
    om: 'Gahee Hojii fi Iddoo Buufata Hojii Jijjiiri',
    ti: 'ተራ ስራሕን ቦታ መደበር ስራሕን ቀይር'
  },
  'Current:': { am: 'የአሁኑ፡', om: 'Ammaa:', ti: 'ናይ ሕጂ፡' },
  '1. Select New Operational Role': { am: '1. አዲስ የስራ ሚና ይምረጡ', om: '1. Gahee Hojii Haaraa Filadhaa', ti: '1. ሓድሽ ስርሒታዊ ተራ ምረጹ' },
  'Selected': { am: 'ተመርጧል', om: 'Filatameera', ti: 'ዝተመረጸ' },
  'Frontline citizen intake, biometric capture, and daily activity reporting at the woreda level.': {
    am: 'የቀዳሚ መስመር የዜጎች ምዝገባ፣ የባዮሜትሪክ ቅበላ እና በወረዳ ደረጃ የዕለት የስራ ሪፖርት ማቅረብ።',
    om: 'Galmee lammiilee toora duraa, waraabbii baayomeetiriiksii fi gabaasa hojii guyyaa sadarkaa aanaatti.',
    ti: 'ቀዳማይ መስመር ምቕባል ዜጋታት፣ ባዮሜትሪክ ምውሳድን ኣብ ደረጃ ወረዳ መዓልታዊ ጸብጻብ ምቕራብን።'
  },
  'Zonal operational oversight, officer coordination, and monitoring aggregate registrations.': {
    am: 'የዞን የስራ ቁጥጥር፣ የኃላፊዎች ቅንጅት እና አጠቃላይ ምዝገባዎችን መከታተል።',
    om: 'Hordoffii hojii zoonii, qindeessaa hojjettootaa fi hordoffii waliigala galmee.',
    ti: 'ናይ ዞባ ስርሒታዊ ቁጽጽር፣ ምትሕብባር ሓለፍቲን ምክትታል ድምር ምዝገባታትን።'
  },
  '3. Station & Location Assignment': { am: '3. የጣቢያ እና የቦታ ምደባ', om: '3. Ramaddii Buufataa fi Bakkaa', ti: '3. ምደባ መደበርን ቦታን' },
  'Organization-Wide Scope': { am: 'መላ ድርጅቱን የሚያካትት ወሰን', om: 'Bal\'ina Dhaabbata Guutuu', ti: 'ምሉእ ትካል ዝሽፍን ወሰን' },
  'Managers hold system-wide administrative oversight. No Zone or Woreda assignment is required.': {
    am: 'ስራ አስኪያጆች መላ ስርዓቱን የሚቆጣጠሩበት አስተዳደራዊ ስልጣን አላቸው። ምንም የዞን ወይም የወረዳ ምደባ አያስፈልግም።',
    om: 'Manaajerootni hordoffii bulchiinsaa guutuu sirnaa qabu. Ramaddiin Zoonii ykn Aanaa hin barbaachisu.',
    ti: 'ስራሕ ኣካየድቲ ምሉእ ስርዓት ዝቖጻጸሩሉ ምምሕዳራዊ ስልጣን ኣለዎም። ናይ ዞባ ወይ ወረዳ ምደባ ኣየድልን።'
  },
  'Assign the Region and Zone for this Supervisor. Supervisors coordinate all woredas within their assigned Zone.': {
    am: 'ለዚህ ተቆጣጣሪ ክልል እና ዞን ይመድቡ። ተቆጣጣሪዎች በተመደቡበት ዞን ውስጥ ያሉትን ሁሉንም ወረዳዎች ያስተባብራሉ።',
    om: 'Tooftaa kanaaf Naannoo fi Zoonii ramadaa. Tooftotni aanaalee Zoonii ramadame keessa jiran hunda qindeessu.',
    ti: 'ነዚ ተቆጻጻሪ ክልልን ዞባን ምደቡ። ተቖጻጸርቲ ኣብቲ ዝተመደበሉ ዞባ ዘለዉ ኩሎም ወረዳታት የዐርዩ።'
  },
  'Assign the Region, Zone, Woreda/Station, and direct Supervisor for this Field Officer.': {
    am: 'ለዚህ የመስክ ኃላፊ ክልል፣ ዞን፣ ወረዳ/ጣቢያ እና ቀጥታ ተቆጣጣሪ ይመድቡ።',
    om: 'Hojjetaa dirree kanaaf Naannoo, Zoonii, Aanaa/Buufata fi Tooftaa kallattii ramadaa.',
    ti: 'ነዚ ሓላፊ ግዳም ክልል፣ ዞባ፣ ወረዳ/መደበርን ቀጥታዊ ተቖጻጻርን ምደቡ።'
  },
  'Apply Role Change': { am: 'የሚና ለውጡን ተግብር', om: 'Jijjiirama Gahee Hojiirra Oolchi', ti: 'ምቕያር ተራ ኣተግብር' },
  'Reassign Operational Workstation': { am: 'የስራ ጣቢያ ቦታን በድጋሚ መድብ', om: 'Iddoo Buufata Hojii Irra Deebiin Ramadi', ti: 'ናይ ስራሕ መደበር ቦታ ዳግማይ መድብ' },
  'Current Active Jurisdiction:': { am: 'የአሁኑ ንቁ የስራ ክልል፡', om: 'Daangaa Hojii Ammaa:', ti: 'ናይ ሕጂ ንጡፍ ናይ ስራሕ ክልል፡' },
  'Organization-wide (National)': { am: 'መላ ድርጅቱን የሚያካትት (ሀገር አቀፍ)', om: 'Dhaabbata Guutuu (Biyyoolessaa)', ti: 'ምሉእ ትካል (ሃገራዊ)' },
  'Select New Ethiopian Hierarchy Assignment': {
    am: 'አዲስ የኢትዮጵያ አስተዳደር እርከን ምደባ ይምረጡ',
    om: 'Ramaddii Sadarkaa Bulchiinsa Itoophiyaa Haaraa Filadhaa',
    ti: 'ሓድሽ ምደባ መዋቕር ምምሕዳር ኢትዮጵያ ምረጹ'
  },
  'Apply Reassignment': { am: 'ዳግም ምደባውን ተግብር', om: 'Ramaddii Haaraa Hojiirra Oolchi', ti: 'ዳግማይ ምደባ ኣተግብር' },
  'No Region': { am: 'ክልል የለም', om: 'Naannoon Hin Jiru', ti: 'ክልል የለን' },
  'No Zone': { am: 'ዞን የለም', om: 'Zooniin Hin Jiru', ti: 'ዞባ የለን' },
  'One-Time Access Password': { am: 'የአንድ ጊዜ መግቢያ የይለፍ ቃል', om: 'Jecha Iccitii Seensaa Yeroo Tokkoo', ti: 'ናይ ሓደ ግዜ መእተዊ ቃል ምስጢር' },
  'Credentials for': { am: 'የመግቢያ መረጃ ለ', om: 'Ragaalee Seensaa kan', ti: 'ናይ ምእታው መረዳእታ ን' },
  'Strict One-Time Display': { am: 'ጥብቅ የአንድ ጊዜ እይታ ብቻ', om: 'Agarsiisa Yeroo Tokkoo Qofa', ti: 'ጽኑዕ ናይ ሓደ ግዜ ምርኢት ጥራይ' },
  'For security reasons, this temporary password is never saved in readable form and cannot be viewed again once this dialog is closed.': {
    am: 'ለደህንነት ሲባል ይህ ጊዜያዊ የይለፍ ቃል በማንበብ መልክ አይቀመጥም እና ይህ መስኮት ከተዘጋ በኋላ እንደገና ሊታይ አይችልም።',
    om: 'Sababa nageenyaatiif, jechi iccitii yeroo kun akka dubbifamutti hin olkaa\'amu, erga saanduqni kun cufamees deebisamee ilaalamuu hin danda\'u.',
    ti: 'ምእንቲ ደሕንነት፡ እዚ ግዝያዊ ቃል ምስጢር ብንጹር ኣይዕቀብን እዩ፡ እዚ መስኮት ምስ ተዓጸወ ድማ ዳግማይ ክርአ ኣይክእልን እዩ።'
  },
  'Securely deliver this temporary code to the staff member. They will be immediately required to choose a new permanent password upon sign-in.': {
    am: 'ይህንን ጊዜያዊ ኮድ በደህንነት ለሰራተኛው ያድርሱ። ወደ ስርዓቱ ሲገቡ ወዲያውኑ አዲስ ቋሚ የይለፍ ቃል እንዲመርጡ ይጠየቃሉ።',
    om: 'Koodii yeroo kana nageenyaan miseensa hojjetaaf dabarsaa. Yeroo seenan battalumaatti jecha iccitii dhaabbataa haaraa akka filatan gaafatamu.',
    ti: 'ነዚ ግዝያዊ ኮድ ብደሕንነት ነቲ ሰራሕተኛ ሃብዎ። ኣብ እዋን ምእታው ብኡንብኡ ሓድሽ ቀዋሚ ቃል ምስጢር ክመርጹ ይሕተቱ።'
  },
  'Temporary password copied to clipboard': { am: 'ጊዜያዊ የይለፍ ቃል ተገልብጧል', om: 'Jechi iccitii yeroo waraabameera', ti: 'ግዝያዊ ቃል ምስጢር ተቐዲሑ' },
  'I have securely shared or copied this password and acknowledge that it cannot be retrieved again.': {
    am: 'ይህንን የይለፍ ቃል በደህንነት አጋርቻለሁ ወይም ገልብጫለሁ፣ እንዲሁም እንደገና ማግኘት እንደማይቻል አውቃለሁ።',
    om: 'Jecha iccitii kana nageenyaan qoodeera ykn waraabeera, deebisee argachuu akka hin dandeenyes nan beeka.',
    ti: 'ነዚ ቃል ምስጢር ብደሕንነት ኣካፊለ ወይ ቀዲሐዮ ኣለኹ፡ ዳግማይ ክርከብ ከም ዘይክእል ድማ ይፈልጥ።'
  },
  'Region / Chartered City': { am: 'ክልል / አስተዳደር ከተማ', om: 'Naannoo / Bulchiinsa Magaalaa', ti: 'ክልል / ምምሕዳር ከተማ' },
  'Select Region / Chartered City': { am: 'ክልል / አስተዳደር ከተማ ይምረጡ', om: 'Naannoo / Bulchiinsa Magaalaa Filadhaa', ti: 'ክልል / ምምሕዳር ከተማ ምረጹ' },
  'Select Region First': { am: 'በቅድሚያ ክልል ይምረጡ', om: 'Dursa Naannoo Filadhaa', ti: 'ቅድም ክልል ምረጹ' },
  'Select Zone First': { am: 'በቅድሚያ ዞን ይምረጡ', om: 'Dursa Zoonii Filadhaa', ti: 'ቅድም ዞባ ምረጹ' },
  'Woreda / Kebele': { am: 'ወረዳ / ቀበሌ', om: 'Aanaa / Ganda', ti: 'ወረዳ / ቀበሌ' },
  'Assigned Supervisor': { am: 'የተመደበ ተቆጣጣሪ', om: 'Tooftaa Ramadame', ti: 'ዝተመደበ ተቖጻጻሪ' },
  'Select Supervisor (or leave unassigned)': { am: 'ተቆጣጣሪ ይምረጡ (ወይም ሳይመደብ ይተዉት)', om: 'Tooftaa filadhaa (ykn osoo hin ramadin dhiisaa)', ti: 'ተቖጻጻሪ ምረጹ (ወይ ከይተመደበ ሕደግዎ)' },
  'No active supervisors in this zone': { am: 'በዚህ ዞን ውስጥ ምንም ንቁ ተቆጣጣሪ የለም', om: 'Zoonii kana keessatti tooftaan socho\'u hin jiru', ti: 'ኣብዚ ዞባ ዝኾነ ንጡፍ ተቖጻጻሪ የለን' },
  'Multiple supervisors detected for this zone. Please select the primary supervisor.': {
    am: 'ለዚህ ዞን በርካታ ተቆጣጣሪዎች ተገኝተዋል። እባክዎን ዋናውን ተቆጣጣሪ ይምረጡ።',
    om: 'Tooftotni hedduun zoonii kanaaf argamaniiru. Mee tooftaa duraa filadhaa.',
    ti: 'ነዚ ዞባ ብዙሓት ተቖጻጸርቲ ተረኺቦም። በጃኹም ዋና ተቖጻጻሪ ምረጹ።'
  },

  // Ethiopian Regions
  'Addis Ababa': { am: 'አዲስ አበባ', om: 'Finfinnee', ti: 'ኣዲስ ኣበባ' },
  'Oromia': { am: 'ኦሮሚያ', om: 'Oromiyaa', ti: 'ኦሮሚያ' },
  'Amhara': { am: 'አማራ', om: 'Amaara', ti: 'ኣምሓራ' },
  'Sidama': { am: 'ሲዳማ', om: 'Sidaama', ti: 'ሲዳማ' },
  'Somali': { am: 'ሶማሌ', om: 'Somaalee', ti: 'ሶማሌ' },
  'Tigray': { am: 'ትግራይ', om: 'Tigraay', ti: 'ትግራይ' },
  'Dire Dawa': { am: 'ድሬዳዋ', om: 'Dirre Dhawaa', ti: 'ድሬዳዋ' },
  'Afar': { am: 'አፋር', om: 'Afaar', ti: 'ዓፋር' },
  'Benishangul-Gumuz': { am: 'ቤኒሻንጉል ጉሙዝ', om: 'Beniishaangul Gumuz', ti: 'ቤኒሻንጉል ጉሙዝ' },
  'Gambela': { am: 'ጋምቤላ', om: 'Gambeellaa', ti: 'ጋምቤላ' },
  'Harari': { am: 'ሐረሪ', om: 'Hararii', ti: 'ሓረሪ' },
  'South Ethiopia': { am: 'ደቡብ ኢትዮጵያ', om: 'Itoophiyaa Kibbaa', ti: 'ደቡብ ኢትዮጵያ' },
  'Central Ethiopia': { am: 'ማዕከላዊ ኢትዮጵያ', om: 'Itoophiyaa Gidduugaleessaa', ti: 'ማእከላይ ኢትዮጵያ' },
  'South West Ethiopia': { am: 'ደቡብ ምዕራብ ኢትዮጵያ', om: 'Itoophiyaa Kibba Lixaa', ti: 'ደቡብ ምዕራብ ኢትዮጵያ' },

  // Ethiopian Zones / Sub-Cities
  'Bole Sub-City': { am: 'ቦሌ ክፍለ ከተማ', om: 'Kutaa Magaalaa Boolee', ti: 'ክፍለ ከተማ ቦሌ' },
  'Yeka Sub-City': { am: 'የካ ክፍለ ከተማ', om: 'Kutaa Magaalaa Yakkkaa', ti: 'ክፍለ ከተማ የካ' },
  'Kirkos Sub-City': { am: 'ቂርቆስ ክፍለ ከተማ', om: 'Kutaa Magaalaa Qirqoos', ti: 'ክፍለ ከተማ ቂርቆስ' },
  'Arada Sub-City': { am: 'አራዳ ክፍለ ከተማ', om: 'Kutaa Magaalaa Araadaa', ti: 'ክፍለ ከተማ ኣራዳ' },
  'Gullele Sub-City': { am: 'ጉለሌ ክፍለ ከተማ', om: 'Kutaa Magaalaa Gullellee', ti: 'ክፍለ ከተማ ጉለሌ' },
  'Lideta Sub-City': { am: 'ልደታ ክፍለ ከተማ', om: 'Kutaa Magaalaa Lidataa', ti: 'ክፍለ ከተማ ልደታ' },
  'Nifas Silk-Lafto Sub-City': { am: 'ንፋስ ስልክ ላፍቶ ክፍለ ከተማ', om: 'Kutaa Magaalaa Nifaas Silk Laaftoo', ti: 'ክፍለ ከተማ ንፋስ ስልክ ላፍቶ' },
  'Akaki Kality Sub-City': { am: 'አቃቂ ቃሊቲ ክፍለ ከተማ', om: 'Kutaa Magaalaa Aqaaqii Qaallittii', ti: 'ክፍለ ከተማ ኣቃቂ ቃሊቲ' },
  'Kolfe Keranio Sub-City': { am: 'ኮልፌ ቀራኒዮ ክፍለ ከተማ', om: 'Kutaa Magaalaa Kolfee Qaraaniyoo', ti: 'ክፍለ ከተማ ኮልፌ ቀራንዮ' },
  'Lemi Kura Sub-City': { am: 'ለሚ ኩራ ክፍለ ከተማ', om: 'Kutaa Magaalaa Lami Kuraa', ti: 'ክፍለ ከተማ ለሚ ኩራ' },
  'Sheger City Zone': { am: 'ሸገር ከተማ ዞን', om: 'Zoonii Magaalaa Shaggar', ti: 'ዞባ ከተማ ሸገር' },
  'Finfinne Special Zone': { am: 'ፊንፊኔ ልዩ ዞን', om: 'Zoonii Addaa Finfinnee', ti: 'ፍሉይ ዞባ ፊንፊነ' },
  'East Shewa Zone': { am: 'ምስራቅ ሸዋ ዞን', om: 'Zoonii Shawaa Bahaa', ti: 'ዞባ ምብራቕ ሸዋ' },
  'Jimma Zone': { am: 'ጅማ ዞን', om: 'Zoonii Jimmaa', ti: 'ዞባ ጅማ' },
  'Arsi Zone': { am: 'አርሲ ዞን', om: 'Zoonii Arsii', ti: 'ዞባ ኣርሲ' },
  'North Shewa Zone': { am: 'ሰሜን ሸዋ ዞን', om: 'Zoonii Shawaa Kaabaa', ti: 'ዞባ ሰሜን ሸዋ' },
  'South Gondar Zone': { am: 'ደቡብ ጎንደር ዞን', om: 'Zoonii Goondar Kibbaa', ti: 'ዞባ ደቡብ ጎንደር' },
  'West Gojjam Zone': { am: 'ምዕራብ ጎጃም ዞን', om: 'Zoonii Gojjam Lixaa', ti: 'ዞባ ምዕራብ ጎጃም' },
  'Hawassa City Administration': { am: 'ሐዋሳ ከተማ አስተዳደር', om: 'Bulchiinsa Magaalaa Hawaasaa', ti: 'ምምሕዳር ከተማ ሓዋሳ' },
  'Central Sidama Zone': { am: 'ማዕከላዊ ሲዳማ ዞን', om: 'Zoonii Sidaama Gidduugaleessaa', ti: 'ዞባ ማእከላይ ሲዳማ' },
  'Mekelle Special Zone': { am: 'መቐለ ልዩ ዞን', om: 'Zoonii Addaa Maqalee', ti: 'ፍሉይ ዞባ መቐለ' },
  'Central Tigray Zone': { am: 'ማዕከላዊ ትግራይ ዞን', om: 'Zoonii Tigraay Gidduugaleessaa', ti: 'ዞባ ማእከላይ ትግራይ' },
  'Jigjiga City Administration': { am: 'ጅግጅጋ ከተማ አስተዳደር', om: 'Bulchiinsa Magaalaa Jigjigaa', ti: 'ምምሕዳር ከተማ ጅግጅጋ' },
  'Faafan Zone': { am: 'ፋፋን ዞን', om: 'Zoonii Faafan', ti: 'ዞባ ፋፋን' },
  'Dire Dawa Administration': { am: 'ድሬዳዋ አስተዳደር', om: 'Bulchiinsa Dirre Dhawaa', ti: 'ምምሕዳር ድሬዳዋ' },

  // Add / Edit User Form Fields
  'Last Name (Grandfather)': { am: 'የአያት ስም', om: 'Maqaa Akaakayyuu', ti: 'ስም ኣባሓጎ' },
  'Save Changes': { am: 'ለውጦችን አስቀምጥ', om: 'Jijjiirama Galmeessi', ti: 'ለውጥታት ኣቐምጥ' },
  'I Have Saved It — Continue': { am: 'አስቀምጬዋለሁ — ቀጥል', om: 'Olkaayeera — Itti Fufi', ti: 'ዓቒበዮ ኣለኹ — ቀጽል' },
  '1. Personal Information (Ethiopian Naming)': { am: '1. የግል መረጃ (የኢትዮጵያ የስም አሰጣጥ)', om: '1. Odeeffannoo Dhuunfaa (Moggaasa Maqaa Itoophiyaa)', ti: '1. ብሕታዊ ሓበሬታ (ናይ ኢትዮጵያ ስም ኣመጋግባ)' },
  '2. System Role Assignment': { am: '2. የስርዓት ሚና ምደባ', om: '2. Ramaddii Gahee Sirnaa', ti: '2. ምደባ ተራ ስርዓት' },
  '3. Ethiopian Administrative Hierarchy Assignment': { am: '3. የኢትዮጵያ አስተዳደራዊ እርከን ምደባ', om: '3. Ramaddii Sadarkaa Bulchiinsa Itoophiyaa', ti: '3. ምደባ መዋቕር ምምሕዳር ኢትዮጵያ' },
  'System Role': { am: 'የስርዓት ሚና', om: 'Gahee Sirnaa', ti: 'ተራ ስርዓት' },
  'Field Officer (Frontline Intake)': { am: 'የመስክ ኃላፊ (የቀዳሚ መስመር ምዝገባ)', om: 'Hojjetaa Dirree (Galmeessa Toora Duraa)', ti: 'ሓላፊ ግዳም (ቀዳማይ መስመር ምዝገባ)' },
  'Supervisor (Zonal Oversight)': { am: 'ተቆጣጣሪ (የዞን ቁጥጥር)', om: 'Tooftaa (Hordoffii Zoonii)', ti: 'ተቖጻጻሪ (ናይ ዞባ ቁጽጽር)' },
  'Manager (National Command)': { am: 'ስራ አስኪያጅ (ሀገር አቀፍ አመራር)', om: 'Manaajera (Ajaja Biyyooleessaa)', ti: 'ስራሕ ኣካያዲ (ሃገራዊ ኣመራርሓ)' },
  'Work Shift': { am: 'የስራ ፈረቃ', om: 'Garee Hojii', ti: 'ፈረቓ ስራሕ' },
  'Department / Unit': { am: 'ክፍል / የስራ ዘርፍ', om: 'Kutaa Hojii', ti: 'ክፍሊ ስራሕ' },
  'Assigned Region': { am: 'የተመደበበት ክልል', om: 'Naannoo Ramadame', ti: 'ዝተመደበሉ ክልል' },
  'Assigned Zone': { am: 'የተመደበበት ዞን', om: 'Zoonii Ramadame', ti: 'ዝተመደበሉ ዞባ' },
  'Assigned Woreda': { am: 'የተመደበበት ወረዳ', om: 'Aanaa Ramadame', ti: 'ዝተመደበሉ ወረዳ' },
  'Create Account & Generate Temporary Password': {
    am: 'መለያ ፍጠር እና ጊዜያዊ የይለፍ ቃል አውጣ',
    om: 'Akkaawuntii Uumiifi Jecha Iccitii Yeroo Homi',
    ti: 'ሕሳብ ፍጠርን ግዝያዊ ቃል ምስጢር ኣውጽእን'
  },
  'Temporary Password': { am: 'ጊዜያዊ የይለፍ ቃል', om: 'Jecha Iccitii Yeroo', ti: 'ግዝያዊ ቃል ምስጢር' },
  'Temporary Password Generated': { am: 'ጊዜያዊ የይለፍ ቃል ተፈጥሯል', om: 'Jechi Iccitii Yeroo Uumameera', ti: 'ግዝያዊ ቃል ምስጢር ተፈጢሩ' },
  'Copy Credentials': { am: 'የመግቢያ መረጃዎችን ገልብጥ', om: 'Ragaalee Seensaa Koppii Godhi', ti: 'ናይ ምእታው መረዳእታ ቅዳሕ' },
  'Updating...': { am: 'በማዘመን ላይ...', om: 'Haaromsituu jira...', ti: 'የሐድስ ኣሎ...' },
  'Creating...': { am: 'በመፍጠር ላይ...', om: 'Uumaa jira...', ti: 'ይፈጥር ኣሎ...' },

  // Attendance Management
  'Total Scheduled': { am: 'ጠቅላላ የታቀዱ', om: 'Waliigala Karoorfaman', ti: 'ጠቕላላ ዝተመደቡ' },
  'On-time check-ins': { am: 'በሰዓቱ የገቡ', om: 'Yeroon Kan Seenan', ti: 'ብሰዓቶም ዝኣተዉ' },
  'Tardy arrivals': { am: 'ያረፈዱ', om: 'Kan Turan', ti: 'ዝደንጐዩ' },
  'Unexcused or missed': { am: 'ያልተፈቀደ ወይም የቀረ', om: 'Hayyama Malee Kan Hafan', ti: 'ብዘይ ፍቓድ ዝተረፉ' },
  'Team Roster (Today)': { am: 'የዛሬ የቡድን ዝርዝር', om: 'Tarree Garee (Har\'a)', ti: 'ናይ ሎሚ ዝርዝር ጉጅለ' },
  'Click any officer to record or adjust their check-in time': {
    am: 'የመግቢያ ሰዓትን ለመመዝገብ ወይም ለማስተካከል ኃላፊውን ጠቅ ያድርጉ',
    om: 'Yeroo seensaa galmeessuuf hojjetaa cuqaasaa',
    ti: 'ናይ ምእታው ሰዓት ንምምዝጋብ ኣብ ሓላፊ ጠውቑ'
  },
  'Attendance Records': { am: 'የእንደሪ መዝገቦች', om: 'Galmee Argamaa', ti: 'መዛግብቲ ህላወ' },
  'Verified check-in timestamps and logged hours': {
    am: 'የተረጋገጡ የመግቢያ ሰዓታት እና የተመዘገቡ የስራ ሰዓቶች',
    om: 'Sa\'aatii seensaa mirkanaa\'eefi sa\'aatii hojjetame',
    ti: 'ዝተረጋገጸ ናይ ምእታው ግዜን ዝተሰርሑ ሰዓታትን'
  },

  // Activity Timeline
  'Audit Trail & Real-Time Event Feed': { am: 'የኦዲት ታሪክ እና የቀጥታ ክስተቶች ፍሰት', om: 'Seenaa Odiitii fi Ya\'a Taateewwan Kallattii', ti: 'ናይ ኦዲት ታሪክን ቀጥታዊ ፍሰት ፍጻሜታትን' },
  'All Events': { am: 'ሁሉም ክስተቶች', om: 'Taateewwan Hunda', ti: 'ኩሎም ፍጻሜታት' },
  'Search activities or officers...': { am: 'እንቅስቃሴዎችን ወይም ኃላፊዎችን ይፈልጉ...', om: 'Sochiiwwan ykn hojjettoota barbaadaa...', ti: 'ንጥፈታት ወይ ሓለፍቲ ድለዩ...' },
  'Date & Time': { am: 'ቀን እና ሰዓት', om: 'Guyyaa fi Sa\'aatii', ti: 'ዕለትን ሰዓትን' },
  'Event Type': { am: 'የክስተት አይነት', om: 'Gosa Taatee', ti: 'ዓይነት ፍጻሜ' },
  'Description': { am: 'መግለጫ', om: 'Ibsa', ti: 'መግለጺ' },
  'No Matching Activities Found': { am: 'ተዛማጅ እንቅስቃሴ አልተገኘም', om: 'Sochiin walsimu hin argamne', ti: 'ዝሰማማዕ ንጥፈት ኣይተረኽበን' },
  'No Activity Logged Yet': { am: 'እስካሁን የተመዘገበ እንቅስቃሴ የለም', om: 'Hanga ammaatti sochiin galmaa\'e hin jiru', ti: 'ክሳዕ ሕጂ ዝተመዝገበ ንጥፈት የለን' },
  'Citizen Registered': { am: 'ዜጋ ተመዝግቧል', om: 'Lammiin Galmaa\'eera', ti: 'ዜጋ ተመዝጊቡ' },
  'Registration Started': { am: 'ምዝገባ ተጀምሯል', om: 'Galmeen Jalqabameera', ti: 'ምዝገባ ተጀሚሩ' },
  'Work Session Started': { am: 'የስራ ክፍለ ጊዜ ተጀምሯል', om: 'Marsaan Hojii Jalqabameera', ti: 'እዋን ስራሕ ተጀሚሩ' },
  'Work Session Paused': { am: 'የስራ ክፍለ ጊዜ ቆሟል', om: 'Marsaan Hojii Dhaabbateera', ti: 'እዋን ስራሕ ተዓጊቱ' },
  'Work Session Resumed': { am: 'የስራ ክፍለ ጊዜ ቀጥሏል', om: 'Marsaan Hojii Itti Fufeera', ti: 'እዋን ስራሕ ቀጺሉ' },
  'Daily Report Submitted': { am: 'የዕለት ሪፖርት ገብቷል', om: 'Gabaasni Guyyaa Ergameera', ti: 'ናይ መዓልቲ ጸብጻብ ኣትዩ' },

  // System & Branding
  'Offline-First System': { am: 'ከመስመር ውጭ ቀዳሚ ስርዓት', om: 'Sisteemii Dursa Toora-Alaa', ti: 'ቀዳምነት ዘይመስመር ስርዓት' },

  // Header Tab Titles & Navigation
  'Dashboard Overview': { am: 'የዳሽቦርድ አጠቃላይ እይታ', om: 'Ilaalcha Waliigalaa Daashboordii', ti: 'ሓፈሻዊ ርእይቶ ዳሽቦርድ' },
  'Daily Field Reports': { am: 'የዕለት የመስክ ሪፖርቶች', om: 'Gabaasa Dirree Guyyaa', ti: 'ናይ መዓልቲ ናይ ግዳም ጸብጻባት' },
  'Attendance Review': { am: 'የእንደሪ ግምገማ', om: 'Gamaggama Argamaa', ti: 'ገምጋም ህላወ' },
  'Tasks & Assignments': { am: 'ተግባራት እና የስራ ምደባዎች', om: 'Hojiiwwan fi Ramaddii', ti: 'ዕዮታትን ምደባታትን' },
  'Screen Time & Activity': { am: 'የስክሪን ሰዓት እና እንቅስቃሴ', om: 'Yeroo Iskiiriinii fi Sochii', ti: 'ግዜ ስክሪንን ንጥፈትን' },
  'Supervisor Evaluations': { am: 'የሱፐርቫይዘር ግምገማዎች', om: 'Gamaaggama Tooftaa', ti: 'ገምጋማት ተቖጻጻሪ' },
  'Field Team Directory': { am: 'የመስክ ቡድን ማውጫ', om: 'Galmee Garee Dirree', ti: 'መዝገብ ጉጅለ ግዳም' },
  'Citizen Database': { am: 'የዜጎች ዳታቤዝ', om: 'Kuusaa Daataa Lammiilee', ti: 'ዳታቤዝ ዜጋታት' },
  'All Daily Reports': { am: 'ሁሉም የዕለት ሪፖርቶች', om: 'Gabaasa Guyyaa Hunda', ti: 'ኩሎም መዓልታዊ ጸብጻባት' },
  'Emergency Alerts': { am: 'የአስቸኳይ ጊዜ ማንቂያዎች', om: 'Akeekkachiisa Yeroo Rakkinaa', ti: 'ናይ ህጹጽ ግዜ መጠንቀቕታታት' },
  'Officer Security Verification': { am: 'የኃላፊ የደህንነት ማረጋገጫ', om: 'Mirkaneessa Nageenya Hojjetaa', ti: 'ምርግጋጽ ደሕንነት ሓላፊ' },
  'Notifications & Alerts': { am: 'ማንቂያዎች እና ማስጠንቀቂያዎች', om: 'Beeksisa fi Akeekkachiisa', ti: 'መጠንቀቕታታትን ምልክታታትን' },
  'My Profile & Workstation': { am: 'የኔ መገለጫ እና የስራ ጣቢያ', om: 'Piroofaayilii Koo fi Iddoo Hojii', ti: 'ናተይ ፕሮፋይልን መደበር ስራሕን' },
  'Security & Change Password': { am: 'ደህንነት እና የይለፍ ቃል መቀየሪያ', om: 'Nageenya fi Jijjiirraa Jecha Iccitii', ti: 'ደሕንነትን ምቕያር ቃል ምስጢርን' },

  // Sidebar Role-Specific Items
  'Manager Chat': { am: 'የስራ አስኪያጅ ውይይት', om: 'Haasaa Manaajeraa', ti: 'ዕላል ስራሕ ኣካያዲ' },
  'Supervisor Chat': { am: 'የሱፐርቫይዘር ውይይት', om: 'Haasaa Tooftaa', ti: 'ዕላል ተቖጻጻሪ' },
  'Team': { am: 'ቡድን', om: 'Garee', ti: 'ጉጅለ' },
  'Officer Daily Reports': { am: 'የኃላፊዎች ዕለት ሪፖርቶች', om: 'Gabaasa Guyyaa Hojjettootaa', ti: 'ናይ ሓለፍቲ መዓልታዊ ጸብጻባት' },
  'Officers Screen Time': { am: 'የኃላፊዎች ስክሪን ሰዓት', om: 'Yeroo Iskiiriinii Hojjettootaa', ti: 'ግዜ ስክሪን ሓለፍቲ' },
  'Analysis and Detail': { am: 'ትንታኔ እና ዝርዝር', om: 'Xiinxalaafi Bal\'ina', ti: 'ትንታነን ዝርዝርን' },
  'System Audit Trail': { am: 'የስርዓት ኦዲት ታሪክ', om: 'Faana Odiitii Sirnaa', ti: 'ናይ ስርዓት ኦዲት ታሪክ' },
  'Daily Work Reports': { am: 'የዕለት የስራ ሪፖርቶች', om: 'Gabaasaalee Hojii Guyyaa', ti: 'ናይ መዓልቲ ስራሕ ጸብጻባት' },
  'Reports & Review': { am: 'ሪፖርቶች እና ግምገማ', om: 'Gabaasaaleefi Gamaggama', ti: 'ጸብጻባትን ገምጋምን' },

  // Supervisor & Manager Reports / Reviews
  'Team Daily Reports & Review': { am: 'የቡድን ዕለት ሪፖርቶች እና ግምገማ', om: 'Gabaasa Guyyaa Gareefi Gamaggama', ti: 'ናይ ጉጅለ መዓልታዊ ጸብጻብን ገምጋምን' },
  'Supervisor Evaluations & Reports': { am: 'የሱፐርቫይዘር ግምገማዎች እና ሪፖርቶች', om: 'Gamaaggamaafi Gabaasaalee Tooftaa', ti: 'ገምጋማትን ጸብጻባትን ተቖጻጻሪ' },
  'Submit performance evaluations for field officers and operational self-assessments': {
    am: 'ለመስክ ኃላፊዎች የአፈጻጸም ግምገማዎችን እና የስራ ራስ-ግምገማዎችን ያስገቡ',
    om: 'Gamaaggama raawwii hojjettoota dirree fi of-gamaaggama hojii dhiyeessaa',
    ti: 'ናይ ሓለፍቲ ግዳም ብቕዓት ገምጋማትን ናይ ስራሕ ውልቀ-ገምጋማትን ኣእትዉ'
  },
  'Loading daily reports...': { am: 'የዕለት ሪፖርቶችን በመጫን ላይ...', om: 'Gabaasaalee guyyaa fe\'aa jira...', ti: 'መዓልታዊ ጸብጻባት ይጽዓን ኣሎ...' },
  'No daily reports match the current filters.': { am: 'ምንም የዕለት ሪፖርት ከማጣሪያው ጋር አይዛመድም።', om: 'Gabaasni guyyaa gingilchituu walsimu hin jiru.', ti: 'ምንም መዓልታዊ ጸብጻብ ምስዚ መጻረዪ ኣይሰማማዕን።' },
  'Self Report': { am: 'የግል ሪፖርት', om: 'Gabaasa Ofii', ti: 'ናይ ባዕልኻ ጸብጻብ' },
  'Evaluate Officer': { am: 'ኃላፊን ገምግም', om: 'Hojjetaa Gamaaggami', ti: 'ንሓላፊ ገምግም' },
  'All Evaluations': { am: 'ሁሉም ግምገማዎች', om: 'Gamaaggama Hunda', ti: 'ኩሎም ገምጋማት' },
  'Officer Assessments': { am: 'የኃላፊዎች ምዘና', om: 'Gamaaggama Hojjettootaa', ti: 'ምዘናታት ሓለፍቲ' },
  'Supervisor Self-Reports': { am: 'የሱፐርቫይዘር የግል ሪፖርቶች', om: 'Gabaasaalee Ofii Tooftaa', ti: 'ናይ ተቖጻጻሪ ናይ ባዕሉ ጸብጻባት' },
  'No supervisor reports recorded yet': { am: 'እስካሁን ምንም የሱፐርቫይዘር ሪፖርት አልተመዘገበም', om: 'Hanga ammaatti gabaasni tooftaa hin galmoofne', ti: 'ክሳዕ ሕጂ ዝተመዝገበ ናይ ተቖጻጻሪ ጸብጻብ የለን' },
  'Report Type': { am: 'የሪፖርት አይነት', om: 'Gosa Gabaasaa', ti: 'ዓይነት ጸብጻብ' },
  'Subject / Region': { am: 'ርዕስ / ክልል', om: 'Mata-duree / Naannoo', ti: 'ርእሲ / ክልል' },
  'Rating / Status': { am: 'ደረጃ / ሁኔታ', om: 'Sadarkaa / Haala', ti: 'ደረጃ / ኩነታት' },
  'Sync Status': { am: 'የማመሳሰል ሁኔታ', om: 'Haala Walsimsiisaa', ti: 'ኩነታት ምስምሳል' },
  'Officer Assessment': { am: 'የኃላፊ ምዘና', om: 'Gamaaggama Hojjetaa', ti: 'ምዘና ሓላፊ' },
  'Supervisor Self-Report': { am: 'የሱፐርቫይዘር የግል ሪፖርት', om: 'Gabaasa Ofii Tooftaa', ti: 'ናይ ተቖጻጻሪ ባዕላዊ ጸብጻብ' },
  'Synced': { am: 'ተመሳስሏል', om: 'Walsimeera', ti: 'ተመሳሲሉ' },
  'Pending Sync': { am: 'በማመሳሰል ላይ', om: 'Walsimsiisa Eegaa Jira', ti: 'ምስምሳል ዝጽበ' },
  'Summary': { am: 'ማጠቃለያ', om: 'Cuunfaa', ti: 'ጽሟቕ' },

  // Supervisor Evaluation & Self-Report Forms
  'Submit Officer Evaluation': { am: 'የኃላፊ ግምገማ አስገባ', om: 'Gamaaggama Hojjetaa Galchi', ti: 'ገምጋም ሓላፊ ኣእቱ' },
  'Select Officer': { am: 'ኃላፊ ምረጥ', om: 'Hojjetaa Filadhu', ti: 'ሓላፊ ምረጽ' },
  'Choose Assigned Officer': { am: 'የተመደበ ኃላፊ ይምረጡ', om: 'Hojjetaa Ramadame Filadhaa', ti: 'ዝተመደበ ሓላፊ ምረጹ' },
  'Evaluation Date': { am: 'የግምገማ ቀን', om: 'Guyyaa Gamaaggamaa', ti: 'ዕለት ገምጋም' },
  'Registration Quality': { am: 'የምዝገባ ጥራት', om: 'Qulqullina Galmee', ti: 'ጽሬት ምዝገባ' },
  'Shift Punctuality': { am: 'የፈረቃ ሰዓት አክባሪነት', om: 'Yeroo Eeggachuu Marsaa Hojii', ti: 'ሰዓት ምኽባር ፈረቓ' },
  'Teamwork & Morale': { am: 'የቡድን ስራ እና ሞራል', om: 'Hojii Garee fi Morale', ti: 'ስራሕ ጉጅለን ሞራልን' },
  'Excellent': { am: 'እጅግ በጣም ጥሩ', om: 'Baay\'ee Gaarii', ti: 'ብሉጽ' },
  'Good': { am: 'ጥሩ', om: 'Gaarii', ti: 'ጽቡቕ' },
  'Average': { am: 'መካከለኛ', om: 'Giddu-galeessa', ti: 'ማእከላይ' },
  'Poor': { am: 'ደካማ', om: 'Dadhabaa', ti: 'ድኹም' },
  'Overall Rating (1 - 5)': { am: 'አጠቃላይ ደረጃ (1 - 5)', om: 'Sadarkaa Waliigalaa (1 - 5)', ti: 'ሓፈሻዊ ደረጃ (1 - 5)' },
  'Supervisory Observations': { am: 'የሱፐርቫይዘር ምልከታዎች', om: 'Ilaalcha Tooftaa', ti: 'ምልከታታት ተቖጻጻሪ' },
  'Feedback on target progress, citizen engagement, attention to detail...': {
    am: 'በዒላማ እድገት፣ በዜጎች ተሳትፎ እና በትኩረት ላይ የተሰጠ አስተያየት...',
    om: 'Yaada deemsa xiyyeeffannoo, hirmaannaa lammiilee, fi xiyyeeffannoo bal\'inaa...',
    ti: 'ኣብ ምዕባለ ዒላማ፣ ተሳትፎ ዜጋታትን ኣተኵሮን ዝተዋህበ ርእይቶ...'
  },
  'Recommendations & Training': { am: 'የውሳኔ ሃሳቦች እና ስልጠና', om: 'Gorsaalee fi Leenjii', ti: 'ራስያታትን ስልጠናን' },
  'Recommendations for improvement or commendation...': {
    am: 'ለመሻሻል ወይም ለምስጋና የሚሆኑ የውሳኔ ሃሳቦች...',
    om: 'Gorsaalee fooyya\'iinsa ykn galateeffannaa...',
    ti: 'ንመመሓየሺ ወይ ንምምጓስ ዝቐርቡ ራስያታት...'
  },
  'Save Officer Assessment': { am: 'የኃላፊውን ምዘና አስቀምጥ', om: 'Gamaaggama Hojjetaa Galmeessi', ti: 'ምዘና ሓላፊ ኣቐምጥ' },
  'Submit Supervisor Operations Report': { am: 'የሱፐርቫይዘር የስራ ሪፖርት አስገባ', om: 'Gabaasa Hojii Tooftaa Galchi', ti: 'ናይ ተቖጻጻሪ ጸብጻብ ስራሕ ኣእቱ' },
  'Site Visits Conducted': { am: 'የተደረጉ የጣቢያ ጉብኝቶች', om: 'Daawwannaa Bakkaa Taasifame', ti: 'ዝተኻየዱ ናይ ቦታ ምብጻሓት' },
  'Issues Resolved': { am: 'የተፈቱ ችግሮች', om: 'Rakkinaalee Furmaata Argatan', ti: 'ዝተፈትሑ ጸገማት' },
  'Key Operational Achievements': { am: 'ዋና ዋና የስራ ስኬቶች', om: 'Milkaa\'inoota Hojii Ijoo', ti: 'ቀንድቲ ስርሒታዊ ዓወታት' },
  'Milestones reached, coverage milestones...': {
    am: 'የተደረሱ ዋና ዋና ግቦች፣ የስርጭት ምዕራፎች...',
    om: 'Milkaa\'inoota qaqqabaman, sadarkaalee haguuggii...',
    ti: 'ዝተበጽሑ መድረኻት፣ ብጽሓት...'
  },
  'Team Bottlenecks & Challenges': { am: 'የቡድን ማነቆዎች እና ተግዳሮቶች', om: 'Gufuuwwan fi Qormaataalee Garee', ti: 'ዕንቅፋታትን ብድሆታትን ጉጅለ' },
  'Logistics, connectivity, device supply...': {
    am: 'ሎጂስቲክስ፣ የኔትወርክ ግንኙነት፣ የመሳሪያ አቅርቦት...',
    om: 'Lojistiksii, qunnamtii interneetii, dhiyeessii meeshaalee...',
    ti: 'ሎጂስቲክስ፣ ርክብ መርበብ፣ ቀረብ መሳርሒ...'
  },
  'Submit Operations Report': { am: 'የስራ ሪፖርት አስገባ', om: 'Gabaasa Hojii Galchi', ti: 'ጸብጻብ ስራሕ ኣእቱ' },

  // Screen Time & Monitoring
  'Cumulative daily screen time sent with official daily reports': {
    am: 'ከይፋዊ የዕለት ሪፖርቶች ጋር የተላከ የተጠራቀመ የዕለት ስክሪን ሰዓት',
    om: 'Yeroo iskiiriinii guyyaa walitti qabame kan gabaasa guyyaa waliin ergame',
    ti: 'ምስ ወግዓዊ መዓልታዊ ጸብጻብ ዝተላእከ ዝተደመረ ናይ ስክሪን ግዜ'
  },
  'Filter by officer...': { am: 'በኃላፊ አጣራ...', om: 'Hojjetaadhaan calali...', ti: 'ብሓላፊ ኣጻሪ...' },
  'Loading officers screen time...': { am: 'የኃላፊዎችን ስክሪን ሰዓት በመጫን ላይ...', om: 'Yeroo iskiiriinii hojjettootaa fe\'aa jira...', ti: 'ናይ ሓለፍቲ ግዜ ስክሪን ይጽዓን ኣሎ...' },
  'No Field Officers Found': { am: 'ምንም የመስክ ኃላፊ አልተገኘም', om: 'Hojjetaan Dirree Hin Argamne', ti: 'ምንም ሓላፊ ግዳም ኣይተረኽበን' },
  'Try changing your officer filter': { am: 'እባክዎን የኃላፊ ማጣሪያዎን ይቀይሩ', om: 'Mee gingilchituu hojjetaa keessanii jijjiiraa', ti: 'በጃኹም መጻረዪ ሓላፊኹም ቀይሩ' },
  'No officers assigned to this territory.': { am: 'ለዚህ ግዛት የተመደበ ምንም ኃላፊ የለም።', om: 'Hojjetaan naannoo kanaaf ramadame hin jiru.', ti: 'ነዚ ዞባ ዝተመደበ ሓላፊ የለን።' },
  'Report Status': { am: 'የሪፖርት ሁኔታ', om: 'Haala Gabaasaa', ti: 'ኩነታት ጸብጻብ' },
  'Submitted with Report': { am: 'ከሪፖርት ጋር ገብቷል', om: 'Gabaasa Waliin Ergameera', ti: 'ምስ ጸብጻብ ኣትዩ' },
  'Screen Time': { am: 'የስክሪን ሰዓት', om: 'Yeroo Iskiiriinii', ti: 'ግዜ ስክሪን' },

  // Team Management
  'Operational Team Directory': { am: 'የስራ ቡድን ማውጫ', om: 'Galmee Garee Hojii', ti: 'መዝገብ ጉጅለ ስራሕ' },
  'Personnel hierarchy, real-time connectivity telemetry, and field officer inspection': {
    am: 'የሰራተኞች እርከን፣ የቀጥታ ግንኙነት ቴሌሜትሪ እና የመስክ ኃላፊዎች ቁጥጥር',
    om: 'Sadarkaa hojjettootaa, teelemeetirii qunnamtii kallattii fi to\'annoo hojjettoota dirree',
    ti: 'መዋቕር ሰራሕተኛታት፣ ቀጥታዊ ቴሌሜትሪ ርክብን ቁጽጽር ሓለፍቲ ግዳምን'
  },
  'Search team members, email, phone, or location...': {
    am: 'የቡድን አባላትን በስም፣ ኢሜይል፣ ስልክ ወይም ቦታ ይፈልጉ...',
    om: 'Miseensota garee maqaa, iimeelii, bilbila ykn bakkaan barbaadaa...',
    ti: 'ኣባላት ጉጅለ ብሽም፣ ኢመይል፣ ተሌፎን ወይ ቦታ ድለዩ...'
  },
  'Total Officers': { am: 'ጠቅላላ ኃላፊዎች', om: 'Hojjettoota Waliigalaa', ti: 'ጠቕላላ ሓለፍቲ' },
  'Online Now': { am: 'አሁን በመስመር ላይ', om: 'Amma Toora Irra', ti: 'ሕጂ ኣብ መስመር' },
  'Active Shift': { am: 'ንቁ ፈረቃ', om: 'Marsaa Hojii Socho\'aa', ti: 'ንጡፍ ተራ ስራሕ' },
  'Inspect Officer': { am: 'ኃላፊውን መርምር', om: 'Hojjetaa Qoradhu', ti: 'ንሓላፊ መርምር' },
  'Direct Supervisor': { am: 'የቀጥታ ተቆጣጣሪ', om: 'Tooftaa Kallattii', ti: 'ቀጥታዊ ተቖጻጻሪ' },
  'Cumulative Screen Time': { am: 'የተጠራቀመ የስክሪን ሰዓት', om: 'Yeroo Iskiiriinii Walitti Qabame', ti: 'ዝተደመረ ግዜ ስክሪን' },
  'Daily Report Status': { am: 'የዕለት ሪፖርት ሁኔታ', om: 'Haala Gabaasa Guyyaa', ti: 'ኩነታት መዓልታዊ ጸብጻብ' },

  // --- CITIZENS DATABASE & REGISTRATION SPECIFIC ---
  'Frontline citizen enrollment directory with administrative jurisdiction': {
    am: 'የቀዳሚ መስመር የዜጎች ምዝገባ ማውጫ ከአስተዳደራዊ ስልጣን ጋር',
    om: 'Galmee galmeessa lammiilee toora duraa aangoo bulchiinsaa wajjin',
    ti: 'ናይ ቀዳማይ መስመር ምዝገባ ዜጋታት ማውጫ ምስ ምምሕዳራዊ ስልጣን'
  },
  'Contact Info': { am: 'የእውቂያ መረጃ', om: 'Odeeffannoo Qunnamtii', ti: 'ሓበሬታ ርክብ' },
  'Jurisdiction': { am: 'አስተዳደራዊ ክልል', om: 'Aangoo Bulchiinsaa', ti: 'ምምሕዳራዊ ክልል' },
  'Enrolled By': { am: 'ያስመዘገበው', om: 'Kan Galmeesse', ti: 'ዘመዝገቦ' },
  'Citizenship Enrollment': { am: 'የዜግነት ምዝገባ', om: 'Galmeessa Lammummaa', ti: 'ምዝገባ ዜግነት' },
  'Primary Identity': { am: 'ዋና ማንነት', om: 'Eenyummaa Duraa', ti: 'ቀዳማይ መንነት' },
  'Contact Information (Optional)': { am: 'የእውቂያ መረጃ (አማራጭ)', om: 'Odeeffannoo Qunnamtii (Filannoo)', ti: 'ሓበሬታ ርክብ (ኣማራጺ)' },
  'Residence Location Hierarchy': { am: 'የመኖሪያ ቦታ እርከን', om: 'Sadarkaa Bakka Jireenyaa', ti: 'መዋቕር ቦታ መንበሪ' },
  'Submit Citizen Registration': { am: 'የዜጋ ምዝገባውን አስገባ', om: 'Galmee Lammii Galchi', ti: 'ምዝገባ ዜጋ ኣእቱ' },
  'Reset Form': { am: 'ቅጹን አጽዳ', om: 'Foormii Qulqulleessi', ti: 'ፎርም ኣጽሪ' },
  'Successfully Registered Citizen!': { am: 'ዜጋው በተሳካ ሁኔታ ተመዝግቧል!', om: 'Lammiin milkaa\'inaan galmaa\'eera!', ti: 'ዜጋ ብዓወት ተመዝጊቡ!' },
  '12-Digit Citizen ID': { am: '12-አሃዝ የዜጋ መለያ', om: 'Koodii Lammii Dijiitii 12', ti: '12-ዲጂት መለለዪ ዜጋ' },
  'Register Another Citizen': { am: 'ሌላ ዜጋ መዝግብ', om: 'Lammii Biraa Galmeessi', ti: 'ካልእ ዜጋ መዝግብ' },
  'View Registered Citizens': { am: 'የተመዘገቡ ዜጎችን ተመልከት', om: 'Lammiilee Galmaa\'an Ilaali', ti: 'ዝተመዝገቡ ዜጋታት ርአ' },
  'Success': { am: 'ተሳክቷል', om: 'Milkaa\'eera', ti: 'ተዓዊቱ' },
  'Failed': { am: 'አልተሳካም', om: 'Hin milkoofne', ti: 'ኣይተዓወተን' },

  // --- USER & WORKSTATION MANAGEMENT SUITE TRANSLATIONS ---
  "Central Zone": { am: "ማዕከላዊ ዞን", om: "Godina Giddugaleessaa", ti: "ማእከላይ ዞባ" },
  "Metropolitan Zone": { am: "የሜትሮፖሊታን ዞን", om: "Godina Meetroopoolitaanii", ti: "ሜትሮፖሊታን ዞባ" },
  "Bole Woreda 01": { am: "ቦሌ ወረዳ 01", om: "Aanaa Boolee 01", ti: "ወረዳ ቦሌ 01" },
  "Bole Woreda 02": { am: "ቦሌ ወረዳ 02", om: "Aanaa Boolee 02", ti: "ወረዳ ቦሌ 02" },
  "Bole Woreda 03": { am: "ቦሌ ወረዳ 03", om: "Aanaa Boolee 03", ti: "ወረዳ ቦሌ 03" },
  "Bole Woreda 04": { am: "ቦሌ ወረዳ 04", om: "Aanaa Boolee 04", ti: "ወረዳ ቦሌ 04" },
  "Bole Woreda 05": { am: "ቦሌ ወረዳ 05", om: "Aanaa Boolee 05", ti: "ወረዳ ቦሌ 05" },
  "Bole Woreda 06": { am: "ቦሌ ወረዳ 06", om: "Aanaa Boolee 06", ti: "ወረዳ ቦሌ 06" },
  "Yeka Woreda 01": { am: "የካ ወረዳ 01", om: "Aanaa Yakkā 01", ti: "ወረዳ የካ 01" },
  "Yeka Woreda 02": { am: "የካ ወረዳ 02", om: "Aanaa Yakkā 02", ti: "ወረዳ የካ 02" },
  "Yeka Woreda 03": { am: "የካ ወረዳ 03", om: "Aanaa Yakkā 03", ti: "ወረዳ የካ 03" },
  "Kirkos Woreda 01": { am: "ቂርቆስ ወረዳ 01", om: "Aanaa Qirqoos 01", ti: "ወረዳ ቂርቆስ 01" },
  "Kirkos Woreda 02": { am: "ቂርቆስ ወረዳ 02", om: "Aanaa Qirqoos 02", ti: "ወረዳ ቂርቆስ 02" },
  "Sheger Sub-District 01": { am: "ሸገር ክፍለ ከተማ 01", om: "Kutaa Bulchiinsa Shaggar 01", ti: "ክፍለ ከተማ ሸገር 01" },
  "Sheger Sub-District 02": { am: "ሸገር ክፍለ ከተማ 02", om: "Kutaa Bulchiinsa Shaggar 02", ti: "ክፍለ ከተማ ሸገር 02" },
  "Adama Rural Woreda": { am: "አዳማ የገጠር ወረዳ", om: "Aanaa Baadiyyaa Adaamaa", ti: "ወረዳ ገጠር ኣዳማ" },
  "Bishoftu Woreda": { am: "ቢሾፍቱ ወረዳ", om: "Aanaa Bishooftuu", ti: "ወረዳ ቢሾፍቱ" },
  "Woreda 01": { am: "ወረዳ 01", om: "Aanaa 01", ti: "ወረዳ 01" },
  "Woreda 02": { am: "ወረዳ 02", om: "Aanaa 02", ti: "ወረዳ 02" },
  "Woreda 03": { am: "ወረዳ 03", om: "Aanaa 03", ti: "ወረዳ 03" },
  "First name is required": { am: "ስም ማስገባት ግዴታ ነው", om: "Maqaan duraa barbaachisaadha", ti: "ስም ምእታው ግዴታ እዩ" },
  "Father name is required": { am: "የአባት ስም ማስገባት ግዴታ ነው", om: "Maqaan abbaa barbaachisaadha", ti: "ስም ኣቦ ምእታው ግዴታ እዩ" },
  "Grandfather name is required": { am: "የአያት ስም ማስገባት ግዴታ ነው", om: "Maqaan akaakayyuu barbaachisaadha", ti: "ስም ኣባሓጎ ምእታው ግዴታ እዩ" },
  "First name cannot contain numbers": { am: "ስም ቁጥሮችን መያዝ አይችልም", om: "Maqaan duraa lakkoofsa qabaachuu hin danda'u", ti: "ስም ቁጽሪታት ክሕዝ ኣይክእልን" },
  "Middle name cannot contain numbers": { am: "የአባት ስም ቁጥሮችን መያዝ አይችልም", om: "Maqaan abbaa lakkoofsa qabaachuu hin danda'u", ti: "ስም ኣቦ ቁጽሪታት ክሕዝ ኣይክእልን" },
  "Last name cannot contain numbers": { am: "የአያት ስም ቁጥሮችን መያዝ አይችልም", om: "Maqaan akaakayyuu lakkoofsa qabaachuu hin danda'u", ti: "ስም ኣባሓጎ ቁጽሪታት ክሕዝ ኣይክእልን" },
  "Father name or last name is required": { am: "የአባት ስም ወይም የአያት ስም ማስገባት ግዴታ ነው", om: "Maqaan abbaa ykn maqaan akaakayyuu barbaachisaadha", ti: "ስም ኣቦ ወይ ስም ኣባሓጎ ምእታው ግዴታ እዩ" },
  "Email address is required": { am: "የኢሜይል አድራሻ ማስገባት ግዴታ ነው", om: "Teessoon iimeelii barbaachisaadha", ti: "ኣድራሻ ኢመይል ምእታው ግዴታ እዩ" },
  "Invalid email address format": { am: "ልክ ያልሆነ የኢሜይል አድራሻ ቅርጸት", om: "Boca teessoo iimeelii sirrii hin taane", ti: "ዘይቅኑዕ ቅርጺ ኣድራሻ ኢመይል" },
  "Invalid Ethiopian phone format": { am: "ልክ ያልሆነ የኢትዮጵያ ስልክ ቁጥር ቅርጸት", om: "Boca lakkoofsa bilbila Itoophiyaa sirrii hin taane", ti: "ዘይቅኑዕ ቅርጺ ቁጽሪ ተሌፎን ኢትዮጵያ" },
  "Enter 10 digits (09/07...) or +251": { am: "10 አሃዞችን (09/07...) ወይም +251 ያስገቡ", om: "Dijiitii 10 (09/07...) ykn +251 galchaa", ti: "10 ዲጂት (09/07...) ወይ +251 ኣእትዉ" },
  "Region is required": { am: "ክልል ማስገባት ግዴታ ነው", om: "Naannoon barbaachisaadha", ti: "ክልል ምምራጽ ግዴታ እዩ" },
  "Zone is required": { am: "ዞን ማስገባት ግዴታ ነው", om: "Godinni barbaachisaadha", ti: "ዞባ ምምራጽ ግዴታ እዩ" },
  "Woreda is required": { am: "ወረዳ ማስገባት ግዴታ ነው", om: "Aanaan barbaachisaadha", ti: "ወረዳ ምምራጽ ግዴታ እዩ" },
  "Region is required for Supervisor": { am: "ለተቆጣጣሪ ክልል ማስገባት ግዴታ ነው", om: "To'ataadhaaf naannoon barbaachisaadha", ti: "ንተቖጻጻሪ ክልል ምምራጽ ግዴታ እዩ" },
  "Zone is required for Supervisor": { am: "ለተቆጣጣሪ ዞን ማስገባት ግዴታ ነው", om: "To'ataadhaaf godinni barbaachisaadha", ti: "ንተቖጻጻሪ ዞባ ምምራጽ ግዴታ እዩ" },
  "Region is required for Field Officer": { am: "ለመስክ ኃላፊ ክልል ማስገባት ግዴታ ነው", om: "Hojjetaa dirreetiif naannoon barbaachisaadha", ti: "ንሓላፊ ግዳም ክልል ምምራጽ ግዴታ እዩ" },
  "Zone is required for Field Officer": { am: "ለመስክ ኃላፊ ዞን ማስገባት ግዴታ ነው", om: "Hojjetaa dirreetiif godinni barbaachisaadha", ti: "ንሓላፊ ግዳም ዞባ ምምራጽ ግዴታ እዩ" },
  "Woreda is required for Field Officer": { am: "ለመስክ ኃላፊ ወረዳ ማስገባት ግዴታ ነው", om: "Hojjetaa dirreetiif aanaan barbaachisaadha", ti: "ንሓላፊ ግዳም ወረዳ ምምራጽ ግዴታ እዩ" },
  "Region is required for Supervisors": { am: "ለተቆጣጣሪዎች ክልል ማስገባት ግዴታ ነው", om: "To'attootaaf naannoon barbaachisaadha", ti: "ንተቖጻጸርቲ ክልል ምምራጽ ግዴታ እዩ" },
  "Region is required for Field Officers": { am: "ለመስክ ኃላፊዎች ክልል ማስገባት ግዴታ ነው", om: "Hojjettoota dirreetiif naannoon barbaachisaadha", ti: "ንሓለፍቲ ግዳም ክልል ምምራጽ ግዴታ እዩ" },
  "Please resolve errors in the form": { am: "እባክዎን በቅጹ ውስጥ ያሉትን ስህተቶች ያስተካክሉ", om: "Mee dogoggora foormii keessaa sirreessaa", ti: "በጃኹም ኣብቲ ፎርም ዘለዉ ጌጋታት ኣዐርዩ" },
  "Please resolve validation errors in the form.": { am: "እባክዎን በቅጹ ውስጥ ያሉትን የማረጋገጫ ስህተቶች ያስተካክሉ።", om: "Mee dogoggoroota mirkaneessaa foormii keessaa sirreessaa.", ti: "በጃኹም ኣብቲ ፎርም ዘለዉ ናይ ምርግጋጽ ጌጋታት ኣዐርዩ።" },
  "Please complete all required location fields": { am: "እባክዎን ሁሉንም አስፈላጊ የአካባቢ መስኮች ይሙሉ", om: "Mee dirreewwan bakkaa barbaachisoo hunda guutaa", ti: "በጃኹም ኩሎም ዘድልዩ ናይ ቦታ መሳልጥታት ምልኡ" },
  "Please complete all required location fields for this role.": { am: "እባክዎን ለዚህ የስራ ድርሻ ሁሉንም አስፈላጊ የአካባቢ መስኮች ይሙሉ", om: "Mee gahee hojii kanaaf dirreewwan bakkaa barbaachisoo hunda guutaa", ti: "በጃኹም ነዚ ስራሕ ዘድልዩ ኩሎም ናይ ቦታ መሳልጥታት ምልኡ" },
  "A user with this email address already exists": { am: "በዚህ የኢሜይል አድራሻ የተመዘገበ ተጠቃሚ ቀድሞውኑ አለ", om: "Fayyadamaan teessoo iimeelii kanaan galmaa'e duraan jira", ti: "በዚ ኣድራሻ ኢመይል ዝተመዝገበ ተጠቃሚ ድሮ ኣሎ" },
  "User account created successfully!": { am: "የተጠቃሚ መለያ በተሳካ ሁኔታ ተፈጥሯል!", om: "Herregni fayyadamaa milkaa'inaan uumameera!", ti: "ሕሳብ ተጠቃሚ ብዓወት ተፈጢሩ!" },
  "Could not create user account": { am: "የተጠቃሚ መለያ መፍጠር አልተቻለም", om: "Herrega fayyadamaa uumuun hin danda'amne", ti: "ሕሳብ ተጠቃሚ ምፍጣር ኣይተኻእለን" },
  "User creation failed:": { am: "ተጠቃሚ መፍጠር አልተሳካም፡", om: "Fayyadamaa uumuun hin milkoofne:", ti: "ተጠቃሚ ምፍጣር ኣይተዓወተን፡" },
  "Staff profile updated successfully": { am: "የሰራተኛው መገለጫ በተሳካ ሁኔታ ተሻሽሏል", om: "Piroofaayiliin hojjetaa milkaa'inaan haaromfameera", ti: "መግለጺ ሰራሕተኛ ብዓወት ተመሓይሹ" },
  "Failed to update user profile": { am: "የተጠቃሚውን መገለጫ ማሻሻል አልተሳካም", om: "Piroofaayilii fayyadamaa haaromsuun hin milkoofne", ti: "መግለጺ ተጠቃሚ ምምሕያሽ ኣይተዓወተን" },
  "Workstation location reassigned for": { am: "የስራ ቦታ ምደባ ተቀይሯል ለ", om: "Iddoon hojii deebisamee ramadameeraaf", ti: "ቦታ ስራሕ ዳግማይ ተመዲቡ ን" },
  "Reassignment failed": { am: "ቦታ መቀየር አልተሳካም", om: "Deebisanii ramaduun hin milkoofne", ti: "ዳግማይ ምምዳብ ኣይተዓወተን" },
  "Role & workstation updated to": { am: "የስራ ድርሻ እና የስራ ጣቢያ ተሻሽሏል ወደ", om: "Gaheen fi iddoon hojii haaromfameera gara", ti: "ተራን ቦታ ስራሕን ተመሓይሹ ናብ" },
  "Failed to update role & location": { am: "የስራ ድርሻ እና ቦታ ማሻሻል አልተሳካም", om: "Gahee fi iddoo hojii haaromsuun hin milkoofne", ti: "ተራን ቦታን ምምሕያሽ ኣይተዓወተን" },
  "Password reset successfully": { am: "የይለፍ ቃል በተሳካ ሁኔታ ተቀይሯል", om: "Jechi icciitii milkaa'inaan haaromfameera", ti: "መሕለፊ ቃል ብዓወት ተቐይሩ" },
  "Failed to reset password:": { am: "የይለፍ ቃል መቀየር አልተሳካም፡", om: "Jechoota icciitii haaromsuun hin milkoofne:", ti: "መሕለፊ ቃል ምቕያር ኣይተዓወተን፡" },
  "Failed to change status:": { am: "ሁኔታውን መቀየር አልተሳካም፡", om: "Haala jijjiiruun hin milkoofne:", ti: "ኩነታት ምቕያር ኣይተዓወተን፡" },
  "Failed to change role:": { am: "የስራ ድርሻ መቀየር አልተሳካም፡", om: "Gahee hojii jijjiiruun hin milkoofne:", ti: "ተራ ስራሕ ምቕያር ኣይተዓወተን፡" },
  "Failed to copy to clipboard": { am: "ወደ ቅንጥብ ሰሌዳ መቅዳት አልተሳካም", om: "Gara gabatee waraabbiitti koppii gochuun hin milkoofne", ti: "ናብ ቅንጥብ ሰሌዳ ምቕዳሕ ኣይተዓወተን" },
  "Unknown error": { am: "ያልታወቀ ስህተት", om: "Dogoggora hin beekamne", ti: "ዘይተፈልጠ ጌጋ" },
  "Copy failed:": { am: "መቅዳት አልተሳካም፡", om: "Koppii gochuun hin milkoofne:", ti: "ምቕዳሕ ኣይተዓወተን፡" },
  "Error toggling status:": { am: "ሁኔታን በመቀየር ላይ ስህተት፡", om: "Haala jijjiiruu irratti dogoggora:", ti: "ኩነታት ኣብ ምቕያር ጌጋ፡" },
  "Reassignment error:": { am: "ቦታ በመቀየር ላይ ስህተት፡", om: "Dogoggora deebisanii ramaduu:", ti: "ጌጋ ዳግማይ ምምዳብ፡" },
  "Reset error:": { am: "የይለፍ ቃል በመቀየር ላይ ስህተት፡", om: "Dogoggora haaromsuu:", ti: "ጌጋ ምቕያር መሕለፊ ቃል፡" },
  "Role update error:": { am: "የስራ ድርሻ በመቀየር ላይ ስህተት፡", om: "Dogoggora gahee haaromsuu:", ti: "ጌጋ ምምሕያሽ ተራ፡" },
  "Status toggle error:": { am: "ሁኔታ በመቀየር ላይ ስህተት፡", om: "Dogoggora haala jijjiiruu:", ti: "ጌጋ ምቕያር ኩነታት፡" },
  "Update user error:": { am: "ተጠቃሚ በማሻሻል ላይ ስህተት፡", om: "Dogoggora fayyadamaa haaromsuu:", ti: "ጌጋ ምምሕያሽ ተጠቃሚ፡" },
  "National command authority, full system administration, staff management, and analytics.": { am: "የአገር አቀፍ የዕዝ ስልጣን፣ ሙሉ የስርዓት አስተዳደር፣ የሰራተኞች አመራር እና ትንታኔ።", om: "Aangoo ajaja bioolessaa, bulchiinsa sirna guutuu, geggeessummaa hojjettootaa fi xiinxala.", ti: "ሃገራዊ ናይ ትእዛዝ ስልጣን፣ ምሉእ ምምሕዳር ስርዓት፣ ምምሕዳር ሰራሕተኛታትን ትንተናን።" },
  "Temporary Password Created": { am: "ጊዜያዊ የይለፍ ቃል ተፈጥሯል", om: "Jechi Icciitii Yeroo Uumameera", ti: "ግዝያዊ መሕለፊ ቃል ተፈጢሩ" },
  "This temporary password was generated for": { am: "ይህ ጊዜያዊ የይለፍ ቃል የተፈጠረው ለ", om: "Jechi icciitii yeroo kun kan uumameef", ti: "እዚ ግዝያዊ መሕለፊ ቃል ዝተፈጥረ ን" },
  "Share this one-time credential securely with the user. They will be forced to set a personal password upon first authentication.": { am: "ይህንን የአንድ ጊዜ መረጃ ለተጠቃሚው በጥንቃቄ ያጋሩ። በመጀመሪያው መግቢያ ላይ የራሳቸውን የግል የይለፍ ቃል እንዲያዘጋጁ ይገደዳሉ።", om: "Koodii yeroo tokkoo kana of eeggannoon fayyadamaaf qoodaa. Yeroo jalqabaaf seenaanitti jecha icciitii dhuunfaa akka qopheessan dirqamu.", ti: "ነዚ ናይ ሓደ ግዜ መረዳእታ ብጥንቃቐ ንተጠቃሚ ኣካፍሉ። ኣብ ናይ መጀመርያ መእተዊ ናይ ባዕሎም ናይ ብሕቲ መሕለፊ ቃል ክመርጹ ይግደዱ።" },
  "Staff Member Name": { am: "የሰራተኛው ስም", om: "Maqaa Hojjetaa", ti: "ሽም ሰራሕተኛ" },
  "User Account": { am: "የተጠቃሚ መለያ", om: "Herrega Fayyadamaa", ti: "ሕሳብ ተጠቃሚ" },
  "One-Time Temporary Password": { am: "የአንድ ጊዜ ጊዜያዊ የይለፍ ቃል", om: "Jecha Icciitii Yeroo Tokkoo", ti: "ናይ ሓደ ግዜ ግዝያዊ መሕለፊ ቃል" },
  "Copy to Clipboard": { am: "ወደ ቅንጥብ ሰሌዳ ቅዳ", om: "Gara Gabatee Waraabbiitti Koppii Godhi", ti: "ናብ ቅንጥብ ሰሌዳ ቅዳሕ" },
  "I Have Saved / Shared This Password": { am: "ይህን የይለፍ ቃል መዝግቤያለሁ / አጋርቻለሁ", om: "Jecha Icciitii Kana Olkaayeera / Qoodeera", ti: "ነዚ መሕለፊ ቃል ኣቐሚጠዮ / ኣካፊለዮ ኣለኹ" },
  "e.g. Almaz": { am: "ምሳሌ፡ አልማዝ", om: "fk. Almaaz", ti: "ንኣብነት፡ ኣልማዝ" },
  "e.g. Tadesse": { am: "ምሳሌ፡ ታደሰ", om: "fk. Taaddasaa", ti: "ንኣብነት፡ ታደሰ" },
  "e.g. Kebede": { am: "ምሳሌ፡ ከበደ", om: "fk. Kabbadaa", ti: "ንኣብነት፡ ከበደ" },
  "e.g. Abebe": { am: "ምሳሌ፡ አበበ", om: "fk. Abbabaa", ti: "ንኣብነት፡ ኣበበ" },
  "e.g. Bikila": { am: "ምሳሌ፡ በቀለ", om: "fk. Biqilaa", ti: "ንኣብነት፡ ቢቂላ" },
  "e.g. Demisse": { am: "ምሳሌ፡ ደሚሴ", om: "fk. Dammisee", ti: "ንኣብነት፡ ደሚሰ" },
  "staff@fieldsync.com": { am: "staff@fieldsync.com", om: "staff@fieldsync.com", ti: "staff@fieldsync.com" },
  "09XXXXXXXX or 07XXXXXXXX": { am: "09XXXXXXXX ወይም 07XXXXXXXX", om: "09XXXXXXXX ykn 07XXXXXXXX", ti: "09XXXXXXXX ወይ 07XXXXXXXX" },
  "09XXXXXXXX or +2519XXXXXXXX": { am: "09XXXXXXXX ወይም +2519XXXXXXXX", om: "09XXXXXXXX ykn +2519XXXXXXXX", ti: "09XXXXXXXX ወይ +2519XXXXXXXX" },
  "• ID:": { am: "• መለያ፡", om: "• Eenyummaa:", ti: "• መለለዪ፡" },
  "ID:": { am: "መለያ፡", om: "Eenyummaa:", ti: "መለለዪ፡" },

  // --- TEAM MANAGEMENT & EXTENDED ENTERPRISE PAGES TRANSLATIONS ---
  "Supervisor Field Team": { am: "የተቆጣጣሪ የመስክ ቡድን", om: "Garee Dirree To'ataa", ti: "ናይ ተቖጻጻሪ ጉጅለ ግዳም" },
  "Direct field officers assigned to your operational unit": { am: "ለእርስዎ የስራ ክፍል በቀጥታ የተመደቡ የመስክ ኃላፊዎች", om: "Hojjettoota dirree kallattiin kutaalee hojii keessaniif ramadaman", ti: "ንናይ ስራሕ ክፍሊኹም ብቐጥታ ዝተመደቡ ሓለፍቲ ግዳም" },
  "Search officer by name, ID, or woreda...": { am: "ኃላፊዎችን በስም፣ መለያ ወይም ወረዳ ይፈልጉ...", om: "Hojjetaa maqaa, eenyummaa ykn aanaadhaan barbaadi...", ti: "ሓለፍቲ ብሽም፣ መለለዪ ወይ ወረዳ ድለዩ..." },
  "Search teams by name, zone, or supervisor...": { am: "ቡድኖችን በስም፣ ዞን ወይም ተቆጣጣሪ ይፈልጉ...", om: "Garee maqaa, godina ykn to'ataadhaan barbaadi...", ti: "ጉጅለታት ብሽም፣ ዞባ ወይ ተቖጻጻሪ ድለዩ..." },
  "Assigned Officers": { am: "የተመደቡ ኃላፊዎች", om: "Hojjettoota Ramadaman", ti: "ዝተመደቡ ሓለፍቲ" },
  "Personnel": { am: "ሰራተኞች", om: "Hojjattoota", ti: "ሰራሕተኛታት" },
  "Connected": { am: "የተገናኙ", om: "Walqabataniiru", ti: "ዝተተሓሓዙ" },
  "Active Status": { am: "የእንቅስቃሴ ሁኔታ", om: "Haala Socho'aa", ti: "ኩነታት ምንቅስቓስ" },
  "Active Personnel": { am: "ንቁ ሰራተኞች", om: "Hojjattoota Socho'oo", ti: "ንጡፋት ሰራሕተኛታት" },
  "Cards Layout": { am: "የካርድ አቀራረብ", om: "Boca Kaardii", ti: "ቅርጺ ካርድ" },
  "Table Layout": { am: "የሰንጠረዥ አቀራረብ", om: "Boca Gabatee", ti: "ቅርጺ ሰሌዳ" },
  "Field Station": { am: "የመስክ ጣቢያ", om: "Buufata Dirree", ti: "መደበር ግዳም" },
  "Assigned Station": { am: "የተመደበበት ጣቢያ", om: "Buufata Ramadame", ti: "ዝተመደበሉ መደበር" },
  "Woreda / Field Station": { am: "ወረዳ / የመስክ ጣቢያ", om: "Aanaa / Buufata Dirree", ti: "ወረዳ / መደበር ግዳም" },
  "Lead Supervisor": { am: "ዋና ተቆጣጣሪ", om: "To'ataa Olaanaa", ti: "ዋና ተቖጻጻሪ" },
  "Lead Supervisor Information": { am: "የዋና ተቆጣጣሪ መረጃ", om: "Odeeffannoo To'ataa Olaanaa", ti: "ሓበሬታ ዋና ተቖጻጻሪ" },
  "Zonal Field Supervisor": { am: "የዞን መስክ ተቆጣጣሪ", om: "To'ataa Dirree Godinaa", ti: "ተቖጻጻሪ ግዳም ዞባ" },
  "Direct Assigned Lead Supervisor": { am: "በቀጥታ የተመደበ ዋና ተቆጣጣሪ", om: "To'ataa Olaanaa Kallattiin Ramadame", ti: "ብቐጥታ ዝተመደበ ዋና ተቖጻጻሪ" },
  "Supervisor Lead": { am: "ተቆጣጣሪ መሪ", om: "Hogganaa To'ataa", ti: "መራሒ ተቖጻጻሪ" },
  "Workforce Hierarchy": { am: "የሰው ኃይል እርከን", om: "Sadarkaa Hojjattootaa", ti: "መዋቕር ሰራሕተኛታት" },
  "Zonal supervisor structures and assigned field officer units": { am: "የዞን ተቆጣጣሪ መዋቅሮች እና የተመደቡ የመስክ ኃላፊዎች ክፍሎች", om: "Caasaalee to'attoota godinaa fi kutaalee hojjettoota dirree ramadaman", ti: "መዋቕር ተቖጻጸርቲ ዞባን ዝተመደቡ ናይ ሓለፍቲ ግዳም ክፍላትን" },
  "Frontline Officers Pool": { am: "የቀዳሚ መስመር ኃላፊዎች ስብስብ", om: "Kuusaa Hojjettoota Toora Duraa", ti: "እኩብ ሓለፍቲ ቀዳማይ መስመር" },
  "Frontline Pool": { am: "የቀዳሚ መስመር ስብስብ", om: "Toora Duraa", ti: "ቀዳማይ መስመር" },
  "No field officers have been assigned to your supervision zone yet.": { am: "እስካሁን ድረስ በእርስዎ ቁጥጥር ዞን ውስጥ የተመደበ የመስክ ኃላፊ የለም።", om: "Hojjetaan dirree godina to'annoo keessaniif ramadame ammatti hin jiru.", ti: "ክሳብ ሕጂ ኣብ ናይ ቁጽጽር ዞባኹም ዝተመደበ ሓላፊ ግዳም የለን።" },
  "Try adjusting your search query or status filter.": { am: "እባክዎን የፍለጋ ቃሉን ወይም የሁኔታ ማጣሪያውን ያስተካክሉ።", om: "Mee jecha barbaacha ykn calaltuu haalaa sirreessaa.", ti: "በጃኹም ቃል ድለይቲ ወይ መጻረዪ ኩነታት ኣዐርዩ።" },
  "No field officers currently assigned to this supervisor.": { am: "በአሁኑ ጊዜ ለዚህ ተቆጣጣሪ የተመደበ የመስክ ኃላፊ የለም።", om: "Hojjetaan dirree to'ataa kanaaf ramadame ammatti hin jiru.", ti: "ኣብዚ ሕጂ እዋን ነዚ ተቖጻጻሪ ዝተመደበ ሓላፊ ግዳም የለን።" },
  "No officers assigned to this supervisor": { am: "ለዚህ ተቆጣጣሪ የተመደበ ኃላፊ የለም", om: "Hojjetaan to'ataa kanaaf ramadame hin jiru", ti: "ነዚ ተቖጻጻሪ ዝተመደበ ሓላፊ የለን" },
  "Field Officer Profile & Operational Information": { am: "የመስክ ኃላፊ መገለጫ እና የስራ መረጃ", om: "Piroofaayilii Hojjetaa Dirree fi Odeeffannoo Hojii", ti: "መግለጺ ሓላፊ ግዳምን ሓበሬታ ስራሕን" },
  "Personal & Contact Details": { am: "የግል እና የእውቂያ ዝርዝሮች", om: "Odeeffannoo Dhuunfaa fi Qunnamtii", ti: "ናይ ብሕትን ርክብን ዝርዝራት" },
  "Administrative Deployment & Hierarchy": { am: "አስተዳደራዊ ምደባ እና እርከን", om: "Ramaddii Bulchiinsaa fi Sadarkaa", ti: "ምምሕዳራዊ ምምዳብን መዋቕርን" },
  "• Role: Zonal Supervisor": { am: "• የስራ ድርሻ፡ የዞን ተቆጣጣሪ", om: "• Gahee: To'ataa Godinaa", ti: "• ተራ፡ ተቖጻጻሪ ዞባ" },
  "Ethiopian Name": { am: "የኢትዮጵያ ስም", om: "Maqaa Itoophiyaa", ti: "ሽም ኢትዮጵያ" },
  "Regional Scope": { am: "የክልል ሽፋን", om: "Daangaa Naannoo", ti: "ሽፋን ክልል" },
  "Zonal Jurisdiction": { am: "የዞን አስተዳደራዊ ወሰን", om: "Aangoo Bulchiinsa Godinaa", ti: "ምምሕዳራዊ ወሰን ዞባ" },
  "General Field": { am: "አጠቃላይ መስክ", om: "Dirree Waliigalaa", ti: "ሓፈሻዊ ግዳም" },
  "Multiple": { am: "በርካታ", om: "Baay'ee", ti: "ብዙሓት" },
  "Operations Team": { am: "የስራ ማስኬጃ ቡድን", om: "Garee Hojii", ti: "ጉጅለ ስራሕ" },
  "Operational Unit": { am: "የስራ ክፍል", om: "Kutaa Hojii", ti: "ክፍሊ ስራሕ" },
  "Team Details —": { am: "የቡድን ዝርዝር —", om: "Bal'ina Garee —", ti: "ዝርዝር ጉጅለ —" },
  "Officers Under This Supervisor": { am: "በዚህ ተቆጣጣሪ ስር ያሉ ኃላፊዎች", om: "Hojjettoota To'ataa Kana Jalatti Argaman", ti: "ኣብ ትሕቲ እዚ ተቖጻጻሪ ዘለዉ ሓለፍቲ" },
  "Copy Email": { am: "ኢሜይል ቅዳ", om: "Iimeelii Koppii Godhi", ti: "ኢመይል ቅዳሕ" },
  "Copy Phone": { am: "ስልክ ቁጥር ቅዳ", om: "Bilbila Koppii Godhi", ti: "ተሌፎን ቅዳሕ" },
  "Call": { am: "ደውል", om: "Bilbili", ti: "ደውል" },
  "South West Ethiopia Peoples": { am: "የደቡብ ምዕራብ ኢትዮጵያ ህዝቦች", om: "Ummatoota Itoophiyaa Kibba Lixaa", ti: "ህዝብታት ደቡብ ምዕራብ ኢትዮጵያ" },
  "Officers": { am: "ኃላፊዎች", om: "Hojjettoota", ti: "ሓለፍቲ" },
  "Enterprise Reports Repository": { am: "የድርጅት ሪፖርቶች ማከማቻ", om: "Kuusaa Gabaasaalee Dhaabbataa", ti: "መኽዘን ጸብጻባት ትካል" },
  "Complete centralized audit of field officer submissions and supervisor evaluations": { am: "የመስክ ኃላፊዎች ሪፖርቶች እና የተቆጣጣሪዎች ግምገማዎች የተሟላ ማዕከላዊ ኦዲት", om: "Ooditii giddugaleessaa guutuu galmee hojjettoota dirree fi madaallii to'attootaa", ti: "ምሉእ ማእከላይ ኦዲት ናይ ሓለፍቲ ግዳም ጸብጻባትን ተቖጻጸርቲ ገምጋማትን" },
  "Historical daily work submissions, citizen intake, and device screen-time telemetry": { am: "ያለፉት የዕለት ስራ ሪፖርቶች፣ የዜጎች ምዝገባ እና የመሳሪያ ስክሪን ሰዓት ቴሌሜትሪ", om: "Galmee hojii guyyaa darbee, galmeessa lammiilee fi teelemeetirii yeroo iskiiriinii meeshaa", ti: "ናይ ሕሉፍ መዓልታዊ ጸብጻባት ስራሕ፣ ምዝገባ ዜጋታትን ቴሌሜትሪ ግዜ ስክሪንን" },
  "Track citizen registration targets, update mission status, and monitor completion progress": { am: "የዜጎች ምዝገባ ግቦችን ይከታተሉ፣ የተልዕኮ ሁኔታን ያዘምኑ እና የማጠናቀቂያ ሂደትን ይቆጣጠሩ", om: "Kaayyoowwan galmee lammiilee hordofaa, haala ergamaa haaromsaa, adeemsa xumuraas to'adhaa", ti: "ዕላማታት ምዝገባ ዜጋታት ተኸታተሉ፣ ኩነታት ተልእኾ ኣመሓይሹ፣ ከምኡ'ውን ምዝዛም ገስጋስ ተቖጻጸሩ" },
  "Central Synchronization Center": { am: "ማዕከላዊ የማመሳሰያ ማዕከል", om: "Wiirtuu Qindoomina Giddugaleessaa", ti: "ማእከላይ መእከሊ ምውህሃድ" },
  "Fieldwork Missions & Assignments": { am: "የመስክ ስራ ተልዕኮዎች እና ምደባዎች", om: "Ergamoota fi Ramaddii Hojii Dirree", ti: "ተልእኾታትን ምምዳባትን ስራሕ ግዳም" },
  "My Fieldwork Assignments": { am: "የእኔ የመስክ ስራ ምደባዎች", om: "Ramaddii Hojii Dirree Koo", ti: "ናተይ ምምዳብ ስራሕ ግዳም" },
  "Create Fieldwork Assignment": { am: "የመስክ ስራ ምደባ ፍጠር", om: "Ramaddii Hojii Dirree Uumi", ti: "ምምዳብ ስራሕ ግዳም ፍጠር" },
  "Deploy registration target to Field Officer": { am: "የምዝገባ ግብ ለመስክ ኃላፊ መድብ", om: "Kaayyoo galmee hojjetaa dirreetiif ramadi", ti: "ዕላማ ምዝገባ ንሓላፊ ግዳም መድብ" },
  "Security & Password": { am: "ደህንነት እና የይለፍ ቃል", om: "Nageenya fi Jecha Icciitii", ti: "ድሕንነትን መሕለፊ ቃልን" },
  "Work Information": { am: "የስራ መረጃ", om: "Odeeffannoo Hojii", ti: "ሓበሬታ ስራሕ" },
  "Personal Information": { am: "የግል መረጃ", om: "Odeeffannoo Dhuunfaa", ti: "ናይ ብሕቲ ሓበሬታ" },
  "Account Information": { am: "የመለያ መረጃ", om: "Odeeffannoo Herregaa", ti: "ሓበሬታ ሕሳብ" },
  "Edit Personal Information": { am: "የግል መረጃን አርትዕ", om: "Odeeffannoo Dhuunfaa Gulaali", ti: "ናይ ብሕቲ ሓበሬታ ኣዐሪ" },
  "Daily Work Session started successfully": { am: "የዕለት የስራ ክፍለ ጊዜ በተሳካ ሁኔታ ተጀምሯል", om: "Kutaan hojii guyyaa milkaa'inaan jalqabeera", ti: "መዓልታዊ ክፍለ ግዜ ስራሕ ብዓወት ተጀሚሩ" },
  "Failed to start work session": { am: "የስራ ክፍለ ጊዜ መጀመር አልተቻለም", om: "Kutaa hojii jalqabuun hin danda'amne", ti: "ክፍለ ግዜ ስራሕ ምጅማር ኣይተኻእለን" },
  "Offline (Saved Locally)": { am: "ከመስመር ውጭ (በአካባቢው ተቀምጧል)", om: "Tooraan Alaa (Naannootti Olkaa'ameera)", ti: "ካብ መስመር ወጻኢ (ብኸባቢ ተዓቒቡ)" },
  "Actively Counting": { am: "በንቃት በመቁጠር ላይ", om: "Harkaan Lakkaa'aa Jira", ti: "ብንጥፈት ይቑጸር ኣሎ" },
  "Session Finalized": { am: "ክፍለ ጊዜው ተጠናቋል", om: "Kutaan Hojii Xumurameera", ti: "ክፍለ ግዜ ተዛዚሙ" },
  "Verification Active": { am: "ማረጋገጫ ንቁ ነው", om: "Mirkaneessi Socho'aadha", ti: "ምርግጋጽ ንጡፍ እዩ" },
  "Not Started": { am: "አልተጀመረም", om: "Hin Jalqabne", ti: "ኣይተጀመረን" },
  "Paused (Lunch Break)": { am: "ለዕረፍት ቆሟል (የምሳ ዕረፍት)", om: "Boqonnaaf Dhaabbate (Boqonnaa Laaqanaa)", ti: "ንዕረፍቲ ደው ኢሉ (ዕረፍቲ ምሳሕ)" },
  "Paused (Page Inactive/Minimized)": { am: "ቆሟል (ገጹ ንቁ ስላልሆነ)", om: "Dhaabbate (Fuulli Socho'aa waan hin taaneef)", ti: "ደው ኢሉ (ገጽ ንጡፍ ስለዘይኮነ)" },

  // --- NOTIFICATION CENTER TRANSLATIONS ---
  "Operational updates, verifications, and system events": {
    am: "የስራ ዝመናዎች፣ ማረጋገጫዎች እና የስርዓት ኩነቶች",
    om: "Odeeffannoo hojii, mirkaneessaa fi ta'eewwan sirnaa",
    ti: "ናይ ስራሕ ሓበሬታታት፣ ምርግጋጻትን ፍጻመታት ስርዓትን"
  },
  "Mark All Read": {
    am: "ሁሉንም እንደተነበበ ምልክት አድርግ",
    om: "Hunda akka Dubbifametti Galmeessi",
    ti: "ንኹሉ ዝተነበበ ግበሮ"
  },
  "Search notifications...": {
    am: "ማንቂያዎችን ይፈልጉ...",
    om: "Beeksisa barbaadi...",
    ti: "መጠንቀቕታታት ድለዩ..."
  },
  "Loading notifications...": {
    am: "ማንቂያዎችን በመጫን ላይ...",
    om: "Beeksisa fe'aa jira...",
    ti: "መጠንቀቕታታት ይጽዓን ኣሎ..."
  },
  "You're All Caught Up": {
    am: "ሁሉም ማንቂያዎች ተጠናቀዋል",
    om: "Hunda Xumurtaniittu",
    ti: "ኩሎም መጠንቀቕታታት ተወዲኦም"
  },
  "No notifications match your current filter or search criteria.": {
    am: "ከአሁኑ ማጣሪያ ወይም ፍለጋ ጋር የሚዛመድ ማንቂያ የለም።",
    om: "Beeksisni calaltuu ykn barbaacha ammaa wajjin walsimu hin jiru.",
    ti: "ምስዚ ሕጂ ዘሎ መጻረዪ ወይ ድለይቲ ዝሰማማዕ መጠንቀቕታ የለን።"
  },
  "No unread alerts or operational notifications at this time.": {
    am: "በአሁኑ ጊዜ ያልተነበቡ ማንቂያዎች የሉም።",
    om: "Yeroo ammaa beeksisni hin dubbifamne hin jiru.",
    ti: "ኣብዚ እዋን ዘይተነበቡ መጠንቀቕታታት የለዉን።"
  },
  "Open Detail": {
    am: "ዝርዝሩን ክፈት",
    om: "Bal'ina Bani",
    ti: "ዝርዝር ክፈት"
  },
  "Unread": {
    am: "ያልተነበበ",
    om: "Hin dubbifamne",
    ti: "ዘይተነበበ"
  },
  "Read": {
    am: "የተነበበ",
    om: "Dubbifameera",
    ti: "ዝተነበበ"
  },
  "Mark as read": {
    am: "እንደተነበበ ምልክት አድርግ",
    om: "Akka dubbifametti galmeessi",
    ti: "ዝተነበበ ምልከት ግበር"
  },
  "Mark as unread": {
    am: "እንዳልተነበበ ምልክት አድርግ",
    om: "Akka hin dubbifamnetti galmeessi",
    ti: "ዘይተነበበ ምልከት ግበር"
  },
  "Remove": {
    am: "አስወግድ",
    om: "Haqi",
    ti: "ኣወግድ"
  },

  // --- ANALYTICS DASHBOARD TRANSLATIONS ---
  "Zone Operations Intelligence": {
    am: "የዞን ስራዎች መረጃ",
    om: "Odeeffannoo Hojii Godinaa",
    ti: "ሓበሬታ ስርሒታት ዞባ"
  },
  "Enterprise Field Operations Analytics": {
    am: "የድርጅት መስክ ስራዎች ትንታኔ",
    om: "Xiinxala Hojii Dirree Dhaabbataa",
    ti: "ትንታነ ስርሒታት ግዳም ትካል"
  },
  "Total Recorded": {
    am: "ጠቅላላ የተመዘገበ",
    om: "Waliigala Galmaa'e",
    ti: "ጠቕላላ ዝተመዝገበ"
  },
  "TOTAL RECORDED": {
    am: "ጠቅላላ የተመዘገበ",
    om: "WALIIGALA GALMAA'E",
    ti: "ጠቕላላ ዝተመዝገበ"
  },
  "Timeframe:": {
    am: "የጊዜ ገደብ:",
    om: "Yeroo:",
    ti: "ናይ ግዜ ደረት:"
  },
  "TIMEFRAME:": {
    am: "የጊዜ ገደብ:",
    om: "YEROO:",
    ti: "ናይ ግዜ ደረት:"
  },
  "This Week (7d)": {
    am: "ይህ ሳምንት (7ቀን)",
    om: "Torban Kana (Guyyaa 7)",
    ti: "ሎሚ ሰሙን (7 መዓልቲ)"
  },
  "This Month (30d)": {
    am: "ይህ ወር (30ቀን)",
    om: "Ji'a Kana (Guyyaa 30)",
    ti: "ሎሚ ወርሒ (30 መዓልቲ)"
  },
  "Zone Scope:": {
    am: "የዞን ወሰን:",
    om: "Daangaa Godinaa:",
    ti: "ደረት ዞባ:"
  },
  "All Zones (National)": {
    am: "ሁሉም ዞኖች (ሀገር አቀፍ)",
    om: "Godinoota Hunda (Biyyooleessa)",
    ti: "ኩሎም ዞባታት (ሃገራዊ)"
  },
  "Assigned Zone:": {
    am: "የተመደበበት ዞን:",
    om: "Godina Ramadame:",
    ti: "ዝተመደበሉ ዞባ:"
  },
  "Registered Citizens by Gender": {
    am: "የተመዘገቡ ዜጎች በጾታ",
    om: "Lammiilee Galmaa'an Koorniyaadhaan",
    ti: "ዝተመዝገቡ ዜጋታት ብጾታ"
  },
  "Citizen Registrations by Gender": {
    am: "የዜጎች ምዝገባ በጾታ",
    om: "Galmee Lammiilee Koorniyaadhaan",
    ti: "ምዝገባ ዜጋታት ብጾታ"
  },
  "Proportional gender breakdown of biographic registrations in the active timeframe": {
    am: "በንቁ የጊዜ ገደብ ውስጥ የተመዘገቡ ዜጎች የጾታ ክፍፍል መጠን",
    om: "Qoqqoodama koorniyaa lammiilee yeroo socho'aa keessatti galmaa'anii",
    ti: "ምምቃል ጾታ ዜጋታት ኣብ ንጡፍ ናይ ግዜ ደረት"
  },
  "Citizen Registrations by Age": {
    am: "የዜጎች ምዝገባ በዕድሜ",
    om: "Galmee Lammiilee Umriidhaan",
    ti: "ምዝገባ ዜጋታት ብዕድመ"
  },
  "Citizen Registrations by Woreda": {
    am: "የዜጎች ምዝገባ በወረዳ",
    om: "Galmee Lammiilee Aanaadhaan",
    ti: "ምዝገባ ዜጋታት ብወረዳ"
  },
  "Citizen Registrations by Zone": {
    am: "የዜጎች ምዝገባ በዞን",
    om: "Galmee Lammiilee Godinaan",
    ti: "ምዝገባ ዜጋታት ብዞባ"
  },
  "Comparative registration volume across woredas in your assigned zone": {
    am: "በተመደበበት ዞን ውስጥ ባሉ ወረዳዎች የንጽጽር ምዝገባ መጠን",
    om: "Gamaaggama baay'ina galmee aanaalee godina ramadame keessatti",
    ti: "ምንጽጻር መጠን ምዝገባ ኣብ ወረዳታት ዝተመደበሉ ዞባ"
  },
  "Comparative registration volume across administrative zones": {
    am: "በአስተዳደራዊ ዞኖች መካከል የንጽጽር ምዝገባ መጠን",
    om: "Gamaaggama baay'ina galmee godinoota bulchiinsaa gidduutti",
    ti: "ምንጽጻር መጠን ምዝገባ ኣብ መንጎ ምምሕዳራዊ ዞባታት"
  },
  "Regional Jurisdiction": {
    am: "የክልል አስተዳደራዊ ወሰን",
    om: "Aangoo Naannoo",
    ti: "ምምሕዳራዊ ወሰን ክልል"
  },
  "Citizen Registrations by Region": {
    am: "የዜጎች ምዝገባ በክልል",
    om: "Galmee Lammiilee Naannoodhaan",
    ti: "ምዝገባ ዜጋታት ብክልል"
  },
  "Compare registration volume between Ethiopian Regional States": {
    am: "በኢትዮጵያ ክልላዊ መንግስታት መካከል የምዝገባ መጠን ንጽጽር",
    om: "Gamaaggama baay'ina galmee mootummoota naannoo Itoophiyaa gidduutti",
    ti: "ምንጽጻር መጠን ምዝገባ ኣብ መንጎ ክልላዊ መንግስታት ኢትዮጵያ"
  },
  "Field Officer Registration Comparison": {
    am: "የመስክ ኃላፊዎች የምዝገባ ንጽጽር",
    om: "Gamaaggama Galmee Hojjettoota Dirree",
    ti: "ምንጽጻር ምዝገባ ሓለፍቲ ግዳም"
  },
  "Top 5": {
    am: "ከፍተኛ 5",
    om: "Olaanoo 5",
    ti: "ቀዳሞት 5"
  },
  "Top 10": {
    am: "ከፍተኛ 10",
    om: "Olaanoo 10",
    ti: "ቀዳሞት 10"
  },
  "Top 20": {
    am: "ከፍተኛ 20",
    om: "Olaanoo 20",
    ti: "ቀዳሞት 20"
  },
  "All Officers": {
    am: "ሁሉም ኃላፊዎች",
    om: "Hojjettoota Hunda",
    ti: "ኩሎም ሓለፍቲ"
  },
  "High → Low": {
    am: "ከከፍተኛ → ዝቅተኛ",
    om: "Olaanaa → Gadi-aanaa",
    ti: "ካብ ልዑል → ትሑት"
  },
  "Low → High": {
    am: "ከዝቅተኛ → ከፍተኛ",
    om: "Gadi-aanaa → Olaanaa",
    ti: "ካብ ትሑት → ልዑል"
  },
  "A → Z": {
    am: "ከሀ → ፐ",
    om: "A → Z",
    ti: "ካብ ሀ → ፐ"
  },
  "Recorded Registrations": {
    am: "የተመዘገቡ ምዝገባዎች",
    om: "Galmeewwan Galmaa'an",
    ti: "ዝተመዝገቡ ምዝገባታት"
  },
  "Officer Verifications": {
    am: "የመስክ ኦፊሰሮች ማረጋገጫዎች",
    om: "Mirkaneessaa Hojjettootaa",
    ti: "መረጋገጺታት የመስክ ኦፊሰራት"
  },
  "Officer Verification Monitor": {
    am: "የኦፊሰሮች ማረጋገጫ መከታተያ",
    om: "Hordoffii Mirkaneessa Hojjettootaa",
    ti: "ተቆጻጻሪ መረጋገጺ ኦፊሰራት"
  },
  "All verification checks — answered and missed — for all your field officers": {
    am: "ለሁሉም የመስክ ኦፊሰሮች የተደረጉ የማረጋገጫ ምርመራዎች — የተመለሱ እና ያለፉ",
    om: "Mirkaneessawwan hojjettoota dirree hunda — kan deebifaman fi kan dhabaman",
    ti: "ንኹሎም የመስክ ኦፊሰራት ዝተገብሩ መረጋገጺታት — ዝተመለሱን ዝሓለፉን"
  },
  "Loading officer verifications...": {
    am: "የኦፊሰሮች ማረጋገጫዎች በመጫን ላይ...",
    om: "Mirkaneessa hojjettootaa fe'aa jira...",
    ti: "መረጋገጺታት ኦፊሰራት ይጽዓን ኣሎ..."
  },
  "All Records": {
    am: "ሁሉም መዝገቦች",
    om: "Galmeewwan Hunda",
    ti: "ኩሎም መዛግብቲ"
  },
  "All Verification Records": {
    am: "ሁሉም የማረጋገጫ መዝገቦች",
    om: "Galmee Mirkaneessaa Hunda",
    ti: "ኩሎም መዛግብቲ መረጋገጺ"
  },
  "Group by Officer": {
    am: "በኦፊሰር መድብ",
    om: "Akka Hojjettotti Qoodi",
    ti: "ብኦፊሰር ምደብ"
  },
  "Question / Verification": {
    am: "ጥያቄ / ማረጋገጫ",
    om: "Gaaffii / Mirkaneessa",
    ti: "ሕቶ / መረጋገጺ"
  },
  "Officer Answer": {
    am: "የኦፊሰሩ ምላሽ",
    om: "Deebii Hojjettaa",
    ti: "መልሲ ኦፊሰር"
  },
  "Presence Confirmed": {
    am: "መገኘት ተረጋግጧል",
    om: "Argamuun Mirkanaa'eera",
    ti: "ህልውና ተረጋጊጹ"
  },
  "Security Verification Challenge": {
    am: "የደህንነት ማረጋገጫ ጥያቄ",
    om: "Qormaata Mirkaneessa Nageenyaa",
    ti: "ሕቶ መረጋገጺ ድሕንነት"
  },
  "Work Verification Check": {
    am: "የስራ ማረጋገጫ ምርመራ",
    om: "Sakatta'a Mirkaneessa Hojii",
    ti: "ምርመራ መረጋገጺ ስራሕ"
  },
  "Random Identity & Presence Verification": {
    am: "ድንገተኛ የማንነት እና የመገኘት ማረጋገጫ",
    om: "Mirkaneessa Eenyummaa fi Argamaa Tasaa",
    ti: "ሃንደበታዊ መረጋገጺ መንነትን ህልውናን"
  },
  "Timed Out (15s)": {
    am: "ጊዜው አልቋል (15 ሰከንድ)",
    om: "Yeroon Dhumate (15s)",
    ti: "ግዜ ተወዲኡ (15 ሰከንድ)"
  },
  "Expired (15s)": {
    am: "ጊዜው አልፏል (15 ሰከንድ)",
    om: "Yeroon Dhumate (15s)",
    ti: "ግዜ ሓሊፉ (15 ሰከንድ)"
  },
  "Missed — No Response (15s Timeout)": {
    am: "ያመለጠ — ምንም ምላሽ የለም (15 ሰከንድ አልቋል)",
    om: "Dhabame — Deebiin hin jiru (15s)",
    ti: "ዝሓለፈ — መልሲ የለን (15 ሰከንድ ተወዲኡ)"
  },
  "Start Work Session": {
    am: "የስራ ሰዓት ጀምር",
    om: "Yeroo Hojii Jalqabi",
    ti: "ናይ ስራሕ ክፍለ ግዜ ጀምር"
  },
  "You are within official working hours. You must start your daily work session before accessing the system.": {
    am: "በመደበኛ የስራ ሰዓት ውስጥ ነዎት። ሲስተሙን ከመጠቀምዎ በፊት የእለት የስራ ሰዓትዎን መጀመር አለብዎት።",
    om: "Sa'aatii hojii mootummaa keessa jirta. Sirnicha fayyadamuun dura yeroo hojii guyyaa keetii jalqabuu qabda.",
    ti: "ኣብ ስሩዕ ናይ ስራሕ ሰዓታት ትርከቡ። ነቲ ስርዓት ቅድሚ ምጥቃምኩም ናይ ዕለቱ ናይ ስራሕ ግዜኹም ክትጅምሩ ኣለኩም።"
  },
  "What happens after starting:": {
    am: "ከጀመሩ በኋላ የሚከናወነው፦",
    om: "Jalqabuu booda maaltu ta'a:",
    ti: "ምስ ጀመርኩም ዝኸውን፦"
  },
  "Screen time tracking begins automatically": {
    am: "የስክሪን ሰዓት ክትትል በራስ-ሰር ይጀምራል",
    om: "Hordoffiin yeroo iskiriinii ofumaan jalqaba",
    ti: "ናይ ስክሪን ሰዓት ምቁጽጻር ብባዕሉ ይጅምር"
  },
  "Random verification checks will be activated": {
    am: "ድንገተኛ የማረጋገጫ ምርመራዎች ስራ ይጀምራሉ",
    om: "Mirkaneessawwan tasaa ni hojjetu",
    ti: "ሃንደበታዊ ናይ መረጋገጺ ምርመራታት ክጅምሩ እዮም"
  },
  "Your session is saved locally and syncs automatically when online": {
    am: "ክፍለ-ጊዜዎ በስልክዎ ይቀመጣል እንዲሁም ኢንተርኔት ሲኖር በራስ-ሰር ይሰምራል",
    om: "Yeroon keessan bakka kanatti kuufama, yeroo toora interneetii qabaattan ofumaan sinkii ta'a",
    ti: "ክፍለ ግዜኹም ኣብዚ ይዕቀብ፣ ኢንተርነት እንተሃልዩ ድማ ብባዕሉ ይሰማማዕ"
  },
  "This session is mandatory. You cannot access the system without starting your work session during working hours.": {
    am: "ይህ ክፍለ-ጊዜ ግዴታ ነው። በስራ ሰዓት ውስጥ የስራ ሰዓትዎን ሳይጀምሩ ሲስተሙን መጠቀም አይችሉም።",
    om: "Yeroon kun dirqama. Sa'aatii hojii keessa yeroo hojii utuu hin jalqabin sirnicha fayyadamuu hin dandeessu.",
    ti: "እዚ ክፍለ ግዜ ግዴታ እዩ። ኣብ ናይ ስራሕ ሰዓት ናይ ስራሕ ግዜኹም ከይጀመርኩም ነቲ ስርዓት ክትጥቀሙ ኣይትኽእሉን።"
  },
  "Starting Session...": {
    am: "ክፍለ-ጊዜ በመጀመር ላይ...",
    om: "Yeroo Jalqabaa Jira...",
    ti: "ክፍለ ግዜ ይጅምር ኣሎ..."
  },
  "Total Checks": {
    am: "ጠቅላላ ምርመራዎች",
    om: "Sakatta'a Waliigalaa",
    ti: "ጠቕላላ ምርመራታት"
  },
  "Confirmed": {
    am: "የተረጋገጠ",
    om: "Mirkanaa'eera",
    ti: "ዝተረጋገጸ"
  },
  "Response Rate": {
    am: "የምላሽ መጠን",
    om: "Dhibbeentaa Deebii",
    ti: "መጠን መልሲ"
  },
  "Supervised Officers": {
    am: "የሚቆጣጠሯቸው ኦፊሰሮች",
    om: "Hojjettoota Hordofaman",
    ti: "ዝተቖጻጸሩ ኦፊሰራት"
  },
  "Total verification events": {
    am: "ጠቅላላ የማረጋገጫ ክስተቶች",
    om: "Mirkaneessa waliigalaa",
    ti: "ጠቕላላ ፍጻመታት መረጋገጺ"
  },
  "Officer answered": {
    am: "ኦፊሰሩ የመለሰው",
    om: "Hojjetaan kan deebise",
    ti: "ኦፊሰር ዝመለሶ"
  },
  "No response or expired": {
    am: "ምላሽ ያልተሰጠ ወይም ጊዜው ያለፈበት",
    om: "Deebii kan hin qabne ykn yeroon kan darbe",
    ti: "መልሲ ዘይተውሃቦ ወይ ግዜ ዝሓለፎ"
  },
  "Team compliance rate": {
    am: "የቡድኑ የማክበር መጠን",
    om: "Sadarkaa seer-qabeessummaa garee",
    ti: "መጠን ምኽባር ጉጅለ"
  },
  "Field officers with activity": {
    am: "እንቅስቃሴ ያላቸው የመስክ ኦፊሰሮች",
    om: "Hojjettoota socho'aa jiran",
    ti: "ምንቅስቓስ ዘለዎም የመስክ ኦፊሰራት"
  },
  "Search officer, employee ID, question, or answer...": {
    am: "ኦፊሰር፣ መታወቂያ፣ ጥያቄ ወይም ምላሽ ይፈልጉ...",
    om: "Hojjettaa, ID, gaaffii ykn deebii barbaadi...",
    ti: "ኦፊሰር፣ መለለዪ፣ ሕቶ ወይ መልሲ ድለዩ..."
  },
  "Verification data and officer responses will appear here as field officers perform daily sessions.": {
    am: "የመስክ ኦፊሰሮች የእለት ስራቸውን ሲያከናውኑ የማረጋገጫ መረጃዎች እና ምላሾች እዚህ ይታያሉ።",
    om: "Odeeffannoon mirkaneessaa fi deebiin hojjettootaa yeroo hojjattoonni hojii isaanii gaggeessan asitti mul'ata.",
    ti: "የመስክ ኦፊሰራት ናይ ዕለት ስርሖም እንተካይዱ ናይ መረጋገጺ ሓበሬታታትን መልስታትን ኣብዚ ይረአ።"
  },

  // Leave and Permission Requests
  "My Requests": {
    am: "የእኔ ጥያቄዎች",
    om: "Gaaffiiwwan Koo",
    ti: "ናተይ ሕቶታት"
  },
  "Leave & Permissions": {
    am: "የእረፍት እና ፍቃድ",
    om: "Baqiisaa fi Hayyama",
    ti: "ዕረፍትን ፍቓድን"
  },
  "Leave & Permission Requests": {
    am: "የእረፍት እና የስራ ሰዓት ፍቃድ ጥያቄዎች",
    om: "Gaaffiiwwan Baqiisaa fi Hayyamaa",
    ti: "ናይ ዕረፍትን ፍቓድን ሕቶታት"
  },
  "My Requests (Leaves & Permissions)": {
    am: "ጥያቄዎቼ (የእረፍት እና የስራ ሰዓት ፍቃዶች)",
    om: "Gaaffiiwwan Koo (Baqiisaa fi Hayyama)",
    ti: "ናተይ ሕቶታት (ዕረፍትን ፍቓድን)"
  },
  "Field Officer Requests": {
    am: "የመስክ ኦፊሰር ጥያቄዎች",
    om: "Gaaffiiwwan Hojjattoota Dirree",
    ti: "ናይ ሜዳ ኦፊሰር ሕቶታት"
  },
  "Supervisor Approvals": {
    am: "የሱፐርቫይዘር ማጽደቂያዎች",
    om: "Mirkaneessa Tooftaa",
    ti: "ምጽዳቕ ሱፐርቫይዘር"
  },
  "Management Oversight": {
    am: "የማኔጅመንት ቁጥጥር",
    om: "Hordoffii Bulchiinsaa",
    ti: "ተቖጻጻርነት ኣመራርሓ"
  },
  "Official Workday: 08:30 – 17:30 (Lunch: 12:30 – 13:30)": {
    am: "መደበኛ የስራ ሰዓት፡ 08:30 – 17:30 (የምሳ እረፍት፡ 12:30 – 13:30)",
    om: "Sa'aatii Hojii Idilee: 08:30 – 17:30 (Boqonnaa Laaqanaa: 12:30 – 13:30)",
    ti: "ስሩዕ ናይ ስራሕ ሰዓት፡ 08:30 – 17:30 (ናይ ምሳሕ ዕረፍቲ፡ 12:30 – 13:30)"
  },
  "Submit and track your formal leave and temporary workday permission requests. Approved absence periods are recorded separately from screen time.": {
    am: "መደበኛ የእረፍት እና ጊዜያዊ የስራ ሰዓት ፍቃድ ጥያቄዎችን ያስገቡ እና ይከታተሉ። የጸደቁ የቀሪ ጊዜያት ከስክሪን ጊዜ ተለይተው ይመዘገባሉ።",
    om: "Gaaffiiwwan baqiisaa idilee fi hayyama yeroo hojii galchaa, hordofaa. Yeroon hayyamame galmee yeroo iskiriinii irraa addatti qabama.",
    ti: "ስሩዕ ናይ ዕረፍቲ ፍቓድን ናይ ስራሕ ሰዓት ፍቓድ ሕቶታትን ኣእትዉን ተኸታተሉን። ዝጸደቑ ናይ ዘይምህላው እዋናት ካብ ናይ ስክሪን ግዜ ተፈላልዮም ይምዝገቡ።"
  },
  "Review, approve, or reject leave and permission requests submitted by field officers with transparent decision notes.": {
    am: "በመስክ ኦፊሰሮች የቀረቡ የእረፍት እና የፍቃድ ጥያቄዎችን በማብራሪያ ማስታወሻ ይገምግሙ፣ ያጽድቁ ወይም ውድቅ ያድርጉ።",
    om: "Gaaffiiwwan baqiisaa fi hayyamaa hojjettoota dirreetiin dhiyaatan yaada murtoo ifa ta'een gamaaggamaa, mirkaneessaa ykn kufaa godhaa.",
    ti: "ብሜዳ ኦፊሰራት ዝቐረቡ ናይ ዕረፍትን ፍቓድን ሕቶታት ብንጹር ናይ ውሳነ መብርሂ ገምግሙ፣ ኣጽድቑ ወይ ነጻጊ ገይርኩም ምለሱ።"
  },
  "Request Leave": {
    am: "የእረፍት ፍቃድ ጠይቅ",
    om: "Baqiisaa Gaafadhu",
    ti: "ናይ ዕረፍቲ ፍቓድ ሕተት"
  },
  "Request Permission": {
    am: "የስራ ሰዓት ፍቃድ ጠይቅ",
    om: "Hayyama Gaafadhu",
    ti: "ናይ ስራሕ ሰዓት ፍቓድ ሕተት"
  },
  "Submit Leave Request": {
    am: "የእረፍት ጥያቄ አስገባ",
    om: "Gaaffii Baqiisaa Galchi",
    ti: "ናይ ዕረፍቲ ሕቶ ኣእቱ"
  },
  "Submit Permission Request": {
    am: "የስራ ሰዓት ፍቃድ ጥያቄ አስገባ",
    om: "Gaaffii Hayyamaa Galchi",
    ti: "ናይ ስራሕ ሰዓት ፍቓድ ሕቶ ኣእቱ"
  },
  "Total Requests": {
    am: "አጠቃላይ ጥያቄዎች",
    om: "Gaaffiiwwan Waliigalaa",
    ti: "ጠቕላላ ሕቶታት"
  },
  "Pending": {
    am: "በመጠባበቅ ላይ",
    om: "Eeggannoo Irra",
    ti: "ኣብ ምጽባይ ዘሎ"
  },
  "Approved": {
    am: "የጸደቀ",
    om: "Mirkanaa'e",
    ti: "ዝጸደቐ"
  },
  "Rejected": {
    am: "ውድቅ የተደረገ",
    om: "Kufaa Ta'e",
    ti: "ዝተነጸገ"
  },
  "Cancelled": {
    am: "የተሰረዘ",
    om: "Haqame",
    ti: "ዝተሰረዘ"
  },
  "Leaves": {
    am: "የእረፍት ፈቃዶች",
    om: "Baqiisaa",
    ti: "ናይ ዕረፍቲ ፍቓዳት"
  },
  "Permissions": {
    am: "የስራ ሰዓት ፍቃዶች",
    om: "Hayyama",
    ti: "ናይ ስራሕ ሰዓት ፍቓዳት"
  },
  "Search reason or name...": {
    am: "ምክንያት ወይም ስም ይፈልጉ...",
    om: "Sababa ykn maqaa barbaadi...",
    ti: "ምኽንያት ወይ ሽም ድለዩ..."
  },
  "No requests found": {
    am: "ምንም ጥያቄ አልተገኘም",
    om: "Gaaffiin homaa hin argamne",
    ti: "ዝኾነ ሕቶ ኣይተረኽበን"
  },
  "You have not submitted any leave or permission requests in this category yet.": {
    am: "በዚህ ምድብ እስካሁን ምንም የእረፍት ወይም የፍቃድ ጥያቄ አላስገቡም።",
    om: "Hanga ammaatti ramaddii kanaan gaaffii baqiisaa ykn hayyamaa tokkollee hin galchine.",
    ti: "ኣብዚ ምድብ ክሳብ ሕጂ ዝኾነ ናይ ዕረፍቲ ወይ ናይ ፍቓድ ሕቶ ኣየእተዉን።"
  },
  "No requests matching the selected filters were found.": {
    am: "ከተመረጡት ማጣሪያዎች ጋር የሚዛመድ ጥያቄ አልተገኘም።",
    om: "Gaaffiin filannoo kanaan walgitu hin argamne.",
    ti: "ምስ ዝተመረጹ መጽረዪታት ዝሰማማዕ ሕቶ ኣይተረኽበን።"
  },
  "Workday Permission": {
    am: "የስራ ሰዓት ፍቃድ",
    om: "Hayyama Yeroo Hojii",
    ti: "ናይ ስራሕ ሰዓት ፍቓድ"
  },
  "Leave Type": {
    am: "የእረፍት አይነት",
    om: "Gosa Baqiisaa",
    ti: "ዓይነት ዕረፍቲ"
  },
  "Annual": {
    am: "ዓመታዊ",
    om: "Waggaa",
    ti: "ዓመታዊ"
  },
  "Sick": {
    am: "የህመም",
    om: "Dhukkubaa",
    ti: "ሕማም"
  },
  "Emergency": {
    am: "ድንገተኛ",
    om: "Balaa Tasgabbii",
    ti: "ድንገተኛ"
  },
  "Personal": {
    am: "የግል",
    om: "Dhuunfaa",
    ti: "ውልቃዊ"
  },
  "Annual Leave": {
    am: "የዓመት እረፍት",
    om: "Baqiisaa Waggaa",
    ti: "ናይ ዓመት ዕረፍቲ"
  },
  "Sick Leave": {
    am: "የህመም እረፍት",
    om: "Baqiisaa Dhukkubaa",
    ti: "ናይ ሕማም ዕረፍቲ"
  },
  "Emergency Leave": {
    am: "የድንገተኛ እረፍት",
    om: "Baqiisaa Balaa Tasgabbii",
    ti: "ናይ ድንገት ዕረፍቲ"
  },
  "Personal Leave": {
    am: "የግል እረፍት",
    om: "Baqiisaa Dhuunfaa",
    ti: "ናይ ውልቂ ዕረፍቲ"
  },
  "Other Leave": {
    am: "ሌላ አይነት እረፍት",
    om: "Baqiisaa Kan Biraa",
    ti: "ካልእ ዓይነት ዕረፍቲ"
  },
  "Start Date": {
    am: "የመጀመሪያ ቀን",
    om: "Guyyaa Jalqabaa",
    ti: "መበገሲ መዓልቲ"
  },
  "End Date": {
    am: "የማብቂያ ቀን",
    om: "Guyyaa Dhumaa",
    ti: "መወዳእታ መዓልቲ"
  },
  "Start Time": {
    am: "የመጀመሪያ ሰዓት",
    om: "Sa'aatii Jalqabaa",
    ti: "መበገሲ ሰዓት"
  },
  "End Time": {
    am: "የማብቂያ ሰዓት",
    om: "Sa'aatii Dhumaa",
    ti: "መወዳእታ ሰዓት"
  },
  "Stated Reason": {
    am: "የተገለጸው ምክንያት",
    om: "Sababa Dhiyaate",
    ti: "ዝተገልጸ ምኽንያት"
  },
  "Attached Document": {
    am: "የተያያዘ ሰነድ",
    om: "Sanada Qabsiifame",
    ti: "ዝተተሓሓዘ ሰነድ"
  },
  "Optional Attachment": {
    am: "አማራጭ ሰነድ ማያያዣ",
    om: "Sanada Dabalataa (Filannoo)",
    ti: "ተወሳኺ መተሓሓዚ (ኣማራጺ)"
  },
  "View / Preview": {
    am: "ይመልከቱ / ቅድመ እይታ",
    om: "Ilaali / Dursee Ilaali",
    ti: "ርአ / ቅድመ-ርእየት"
  },
  "Supervisor Decision: Approved": {
    am: "የሱፐርቫይዘር ውሳኔ፡ ጸድቋል",
    om: "Murtoo Tooftaa: Mirkanaa'eera",
    ti: "ውሳነ ሱፐርቫይዘር፡ ጸዲቑ"
  },
  "Supervisor Decision: Rejected": {
    am: "የሱፐርቫይዘር ውሳኔ፡ ውድቅ ተደርጓል",
    om: "Murtoo Tooftaa: Kufaa Ta'eera",
    ti: "ውሳነ ሱፐርቫይዘር፡ ተነጺጉ"
  },
  "Note / Reason": {
    am: "ማስታወሻ / ምክንያት",
    om: "Yaada / Sababa",
    ti: "መተሓሳሰቢ / ምኽንያት"
  },
  "Decided by": {
    am: "የወሰነው",
    om: "Kan Murteesse",
    ti: "ዝወሰኖ"
  },
  "Submitted": {
    am: "የቀረበበት ቀን",
    om: "Guyyaa Dhiyaate",
    ti: "ዝቐረበሉ ዕለት"
  },
  "Synced with server": {
    am: "ከአገልጋይ ጋር ተመሳስሏል",
    om: "Sarvaraa wajjin walqabateera",
    ti: "ምስ ሰርቨር ተሰማሚዑ"
  },
  "Saved locally": {
    am: "በመሳሪያው ላይ ተቀምጧል",
    om: "Meeqa irratti kuufameera",
    ti: "ኣብ መሳርሒ ተዓቂቡ"
  },
  "Cancel Request": {
    am: "ጥያቄውን ሰርዝ",
    om: "Gaaffii Haqi",
    ti: "ሕቶ ሰርዝ"
  },
  "Supervisor Decision": {
    am: "የሱፐርቫይዘር ውሳኔ",
    om: "Murtoo Tooftaa",
    ti: "ውሳነ ሱፐርቫይዘር"
  },
  "Decision Note / Feedback": {
    am: "የውሳኔ ማስታወሻ / አስተያየት",
    om: "Yaada Murtoo / Yaada",
    ti: "ናይ ውሳነ መተሓሳሰቢ / ርእይቶ"
  },
  "Provide reason or instructions...": {
    am: "ምክንያት ወይም መመሪያ ይጻፉ...",
    om: "Sababa ykn qajeelfama barreessi...",
    ti: "ምኽንያት ወይ መምርሒ ጸሓፉ..."
  },
  "Confirm Approval": {
    am: "ማጽደቁን አረጋግጥ",
    om: "Mirkaneessuu Mirkaneessi",
    ti: "ምጽዳቑ ኣረጋግጽ"
  },
  "Confirm Rejection": {
    am: "ውድቅ ማድረጉን አረጋግጥ",
    om: "Kufaa Taasisuu Mirkaneessi",
    ti: "ምንጻጉ ኣረጋግጽ"
  },
  "Are you sure you want to cancel this pending request?": {
    am: "ይህን በመጠባበቅ ላይ ያለ ጥያቄ መሰረዝ እርግጠኛ ነዎት?",
    om: "Gaaffii eeggannoo irra jiru kana haquuf mirkaneeffatteettaa?",
    ti: "ነዚ ኣብ ምጽባይ ዘሎ ሕቶ ክትስርዞ ርግጸኛ ዲኻ?"
  },
  "This action cannot be undone.": {
    am: "ይህ እርምጃ ሊመለስ አይችልም።",
    om: "Tarkaanfiin kun deebifamuu hin danda'u.",
    ti: "እዚ ስጉምቲ እዚ ክምለስ ኣይክእልን እዩ።"
  },
  "Yes, Cancel Request": {
    am: "አዎ፣ ጥያቄውን ሰርዝ",
    om: "Eeyyee, Gaaffii Haqi",
    ti: "እወ፣ ሕቶ ሰርዝ"
  },
  "No, Keep Request": {
    am: "አይ፣ ጥያቄው ይቆይ",
    om: "Lakki, Gaaffiin Hafee Haa Taa'u",
    ti: "ኣይፋል፣ ሕቶ ይጽናሕ"
  },
  "Working Hours Notice": {
    am: "የስራ ሰዓት ማስታወቂያ",
    om: "Beeksisa Sa'aatii Hojii",
    ti: "መተሓሳሰቢ ናይ ስራሕ ሰዓት"
  },
  "Official Working Hours: 08:30 AM – 05:30 PM (Lunch Break: 12:30 PM – 01:30 PM)": {
    am: "መደበኛ የስራ ሰዓት፡ 08:30 ጥዋት – 05:30 ከሰዓት (የምሳ እረፍት፡ 12:30 – 01:30 ከሰዓት)",
    om: "Sa'aatii Hojii Idilee: 08:30 WD – 05:30 WB (Boqonnaa Laaqanaa: 12:30 – 01:30 WB)",
    ti: "ስሩዕ ናይ ስራሕ ሰዓት፡ 08:30 ንጉሆ – 05:30 ድሕሪ ቀትሪ (ዕረፍቲ ምሳሕ፡ 12:30 – 01:30 ድሕሪ ቀትሪ)"
  },
  "Permission requests cannot fall entirely within the lunch break.": {
    am: "የፍቃድ ጥያቄ ሙሉ በሙሉ በምሳ እረፍት ሰዓት ውስጥ ሊሆን አይችልም።",
    om: "Gaaffiin hayyamaa guutummaatti yeroo boqonnaa laaqanaa keessatti ta'uu hin danda'u.",
    ti: "ናይ ፍቓድ ሕቶ ምሉእ ብምሉእ ኣብ ውሽጢ ናይ ምሳሕ ዕረፍቲ ክኸውን ኣይክእልን።"
  },
  "Select leave type": {
    am: "የእረፍት አይነት ይምረጡ",
    om: "Gosa baqiisaa filadhu",
    ti: "ዓይነት ዕረፍቲ ምረጽ"
  },
  "Please provide a detailed, meaningful reason (minimum 5 characters)...": {
    am: "እባክዎን ዝርዝር እና ትርጉም ያለው ምክንያት ያስገቡ (ቢያንስ 5 ፊደላት)...",
    om: "Mee sababa bal'aa fi hiika qabu galchaa (yoo xiqqaate qubee 5)...",
    ti: "ብኽብረትኩም ዝርዝርን ትርጉም ዘለዎን ምኽንያት ኣእትዉ (ብውሕዱ 5 ፊደላት)..."
  },
  "Provide a clear reason for your absence (e.g. medical appointment, urgent personal matter)...": {
    am: "ለቀሪዎ ግልጽ ምክንያት ያስቀምጡ (ለምሳሌ፡ የህክምና ቀጠሮ፣ አጣዳፊ የግል ጉዳይ)...",
    om: "Sababa ifa ta'e galchaa (fakkeenyaaf: beellama yaalaa, dhimma dhuunfaa ariifachiisaa)...",
    ti: "ንዘይምህላውኩም ንጹር ምኽንያት ኣቐምጡ (ንኣብነት፡ ናይ ሕክምና ቆጸራ፣ ህጹጽ ውልቃዊ ጉዳይ)..."
  },
  "Click to upload document or image (Max 5MB)": {
    am: "ሰነድ ወይም ምስል ለመስቀል ጠቅ ያድርጉ (እስከ 5ሜባ)",
    om: "Sanada ykn fakkii fe'uuf cuqqaali (Hanga 5MB)",
    ti: "ሰነድ ወይ ስእሊ ንምስቓል ጠውቑ (ክሳብ 5MB)"
  },
  "PDF, PNG, JPG, or DOC (Max 5MB)": {
    am: "PDF፣ PNG፣ JPG ወይም DOC (ከፍተኛ 5ሜባ)",
    om: "PDF, PNG, JPG ykn DOC (Hanga 5MB)",
    ti: "PDF፣ PNG፣ JPG ወይ DOC (ክሳብ 5MB)"
  },
  "Change file": {
    am: "ፋይል ቀይር",
    om: "Faayilii Jijjiiri",
    ti: "ፋይል ቀይር"
  },
  "Submitting...": {
    am: "በማስገባት ላይ...",
    om: "Galchaa jira...",
    ti: "የእቱ ኣሎ..."
  },
  "Processing...": {
    am: "በማስኬድ ላይ...",
    om: "Hojjechaa jira...",
    ti: "ይስራሕ ኣሎ..."
  },
  "Leave request submitted successfully! Sent to supervisor for review.": {
    am: "የእረፍት ጥያቄ በተሳካ ሁኔታ ቀርቧል! ለግምገማ ወደ ሱፐርቫይዘር ተልኳል።",
    om: "Gaaffiin baqiisaa milkaa'inaan dhiyaateera! Tooftaaf ergameera.",
    ti: "ናይ ዕረፍቲ ሕቶ ብዓወት ቀሪቡ! ንምግምጋም ናብ ሱፐርቫይዘር ተላኢኹ።"
  },
  "Permission request submitted successfully! Sent to supervisor for review.": {
    am: "የፍቃድ ጥያቄ በተሳካ ሁኔታ ቀርቧል! ለግምገማ ወደ ሱፐርቫይዘር ተልኳል።",
    om: "Gaaffiin hayyamaa milkaa'inaan dhiyaateera! Tooftaaf ergameera.",
    ti: "ናይ ፍቓድ ሕቶ ብዓወት ቀሪቡ! ንምግምጋም ናብ ሱፐርቫይዘር ተላኢኹ።"
  },
  "Request approved successfully!": {
    am: "ጥያቄው በተሳካ ሁኔታ ጸድቋል!",
    om: "Gaaffiin milkaa'inaan mirkanaa'eera!",
    ti: "ሕቶ ብዓወት ጸዲቑ!"
  },
  "Request rejected with reason note.": {
    am: "ጥያቄው ከምክንያት ማስታወሻ ጋር ውድቅ ተደርጓል።",
    om: "Gaaffiin sababa ibsameen kufaa ta'eera.",
    ti: "ሕቶ ምስ ናይ ምኽንያት መብርሂ ተነጺጉ።"
  },
  "Request cancelled successfully.": {
    am: "ጥያቄው በተሳካ ሁኔታ ተሰርዟል።",
    om: "Gaaffiin milkaa'inaan haqameera.",
    ti: "ሕቶ ብዓወት ተሰሪዙ።"
  },
  "Failed to submit leave request.": {
    am: "የእረፍት ጥያቄ ማስገባት አልተሳካም።",
    om: "Gaaffii baqiisaa galchuun hin danda'amne.",
    ti: "ናይ ዕረፍቲ ሕቶ ምእታው ኣይተኻእለን።"
  },
  "Failed to submit permission request.": {
    am: "የፍቃድ ጥያቄ ማስገባት አልተሳካም።",
    om: "Gaaffii hayyamaa galchuun hin danda'amne.",
    ti: "ናይ ፍቓድ ሕቶ ምእታው ኣይተኻእለን።"
  },
  "Failed to record decision.": {
    am: "ውሳኔውን መመዝገብ አልተሳካም።",
    om: "Murtoo galmeessuun hin danda'amne.",
    ti: "ውሳነ ምምዝጋብ ኣይተኻእለን።"
  },
  "Failed to cancel request.": {
    am: "ጥያቄውን መሰረዝ አልተሳካም።",
    om: "Gaaffii haquun hin danda'amne.",
    ti: "ሕቶ ምስራዝ ኣይተኻእለን።"
  },
  "A rejection reason / decision note is required when rejecting.": {
    am: "ጥያቄ ውድቅ ሲደረግ የማብራሪያ ምክንያት ማስታወሻ ማስገባት ግዴታ ነው።",
    om: "Yeroo kufaa gootan sababa murtoo ibsuun dirqama.",
    ti: "ሕቶ እንትትነጽጉ ናይ ውሳነ መብርሂ ምእታው ግዴታ እዩ።"
  },
  "File size exceeds 5MB limit. Please choose a smaller file.": {
    am: "የፋይሉ መጠን ከ5ሜባ ገደብ በላይ ነው። እባክዎ አነስ ያለ ፋይል ይምረጡ።",
    om: "Hangi faayilii 5MB caala. Mee faayilii xiqqaa filadhaa.",
    ti: "መጠን ፋይል ካብ 5MB ንላዕሊ እዩ። ብኽብረትኩም ዝነኣሰ ፋይል ምረጹ።"
  },
  "Attached": {
    am: "ተያይዟል",
    om: "Qabsiifameera",
    ti: "ተተሓሒዙ"
  },
  "Leave type is required.": {
    am: "የእረፍት አይነት መምረጥ ግዴታ ነው።",
    om: "Gosti baqiisaa barbaachisaadha.",
    ti: "ዓይነት ዕረፍቲ ምምራጽ ግዴታ እዩ።"
  },
  "Start date is required.": {
    am: "የመጀመሪያ ቀን ማስገባት ግዴታ ነው።",
    om: "Guyyaan jalqabaa barbaachisaadha.",
    ti: "መበገሲ መዓልቲ ምእታው ግዴታ እዩ።"
  },
  "End date is required.": {
    am: "የማብቂያ ቀን ማስገባት ግዴታ ነው።",
    om: "Guyyaan dhumaa barbaachisaadha.",
    ti: "መወዳእታ መዓልቲ ምእታው ግዴታ እዩ።"
  },
  "End date cannot be before start date.": {
    am: "የማብቂያ ቀን ከመጀመሪያው ቀን በፊት ሊሆን አይችልም።",
    om: "Guyyaan dhumaa guyyaa jalqabaa dura ta'uu hin danda'u.",
    ti: "መወዳእታ መዓልቲ ካብ መበገሲ መዓልቲ ኣቐዲሙ ክኸውን ኣይክእልን።"
  },
  "Start date must be a valid calendar date.": {
    am: "የመጀመሪያ ቀን ትክክለኛ የካላንደር ቀን መሆን አለበት።",
    om: "Guyyaan jalqabaa guyyaa dhugaa ta'uu qaba.",
    ti: "መበገሲ መዓልቲ ቅኑዕ ናይ ካላንደር መዓልቲ ክኸውን ኣለዎ።"
  },
  "End date must be a valid calendar date.": {
    am: "የማብቂያ ቀን ትክክለኛ የካላንደር ቀን መሆን አለበት።",
    om: "Guyyaan dhumaa guyyaa dhugaa ta'uu qaba.",
    ti: "መወዳእታ መዓልቲ ቅኑዕ ናይ ካላንደር መዓልቲ ክኸውን ኣለዎ።"
  },
  "Reason is required and must contain meaningful text (at least 5 characters).": {
    am: "ምክንያት ማስገባት ግዴታ ነው እና ትርጉም ያለው ጽሑፍ (ቢያንስ 5 ፊደላት) መያዝ አለበት።",
    om: "Sababni dirqama, jecha hiika qabu (yoo xiqqaate qubee 5) qabaachuu qaba.",
    ti: "ምኽንያት ግዴታ እዩ፣ ትርጉም ዘለዎ ጽሑፍ (ብውሕዱ 5 ፊደላት) ክህልዎ ኣለዎ።"
  },
  "Permission date is required.": {
    am: "የፍቃድ ቀን ማስገባት ግዴታ ነው።",
    om: "Guyyaan hayyamaa barbaachisaadha.",
    ti: "መዓልቲ ፍቓድ ምእታው ግዴታ እዩ።"
  },
  "Date must be a valid calendar date.": {
    am: "ቀኑ ትክክለኛ የካላንደር ቀን መሆን አለበት።",
    om: "Guyyaan guyyaa dhugaa ta'uu qaba.",
    ti: "እቲ ዕለት ቅኑዕ ናይ ካላንደር መዓልቲ ክኸውን ኣለዎ።"
  },
  "Start time is required.": {
    am: "የመጀመሪያ ሰዓት ማስገባት ግዴታ ነው።",
    om: "Sa'aatiin jalqabaa barbaachisaadha.",
    ti: "መበገሲ ሰዓት ምእታው ግዴታ እዩ።"
  },
  "End time is required.": {
    am: "የማብቂያ ሰዓት ማስገባት ግዴታ ነው።",
    om: "Sa'aatiin dhumaa barbaachisaadha.",
    ti: "መወዳእታ ሰዓት ምእታው ግዴታ እዩ።"
  },
  "End time must be later than start time.": {
    am: "የማብቂያ ሰዓት ከመጀመሪያው ሰዓት ዘግይቶ መሆን አለበት።",
    om: "Sa'aatiin dhumaa sa'aatii jalqabaa booda ta'uu qaba.",
    ti: "መወዳእታ ሰዓት ካብ መበገሲ ሰዓት ዝጸንሐ ክኸውን ኣለዎ።"
  },
  "Permission time must fall within official working hours (08:30 - 17:30).": {
    am: "የፍቃድ ሰዓቱ በመደበኛ የስራ ሰዓት (08:30 - 17:30) ውስጥ መሆን አለበት።",
    om: "Sa'aatiin hayyamaa sa'aatii hojii idilee (08:30 - 17:30) keessa ta'uu qaba.",
    ti: "ናይ ፍቓድ ሰዓት ኣብ ውሽጢ ስሩዕ ናይ ስራሕ ሰዓት (08:30 - 17:30) ክኸውን ኣለዎ።"
  },
  "Permission request cannot fall entirely within the lunch break (12:30 - 13:30).": {
    am: "የፍቃድ ጥያቄው ሙሉ በሙሉ በምሳ እረፍት (12:30 - 13:30) ውስጥ ሊሆን አይችልም።",
    om: "Gaaffiin hayyamaa guutummaatti boqonnaa laaqanaa (12:30 - 13:30) keessatti ta'uu hin danda'u.",
    ti: "ናይ ፍቓድ ሕቶ ምሉእ ብምሉእ ኣብ ውሽጢ ናይ ምሳሕ ዕረፍቲ (12:30 - 13:30) ክኸውን ኣይክእልን።"
  },
  "You already have a pending or approved leave covering this period.": {
    am: "ይህን ጊዜ የሚሸፍን በመጠባበቅ ላይ ያለ ወይም የጸደቀ የእረፍት ፍቃድ አለዎት።",
    om: "Yeroo kanaaf baqiisaa eeggannoo irra jiru ykn mirkanaa'e qabdu.",
    ti: "ነዚ እዋን ዝሽፍን ኣብ ምጽባይ ዘሎ ወይ ዝጸደቐ ናይ ዕረፍቲ ፍቓድ ኣለኩም።"
  },
  "You already have a pending or approved permission overlapping this time.": {
    am: "ይህን ሰዓት የሚደራረብ በመጠባበቅ ላይ ያለ ወይም የጸደቀ የፍቃድ ጥያቄ አለዎት።",
    om: "Sa'aatii kanaan wal-irra bu'u gaaffii hayyamaa eeggannoo ykn mirkanaa'e qabdu.",
    ti: "ምስዚ ሰዓት ዝደራረብ ኣብ ምጽባይ ዘሎ ወይ ዝጸደቐ ናይ ፍቓድ ሕቶ ኣለኩም።"
  },
  "You have an active or pending leave on this date. Permission request cannot overlap a leave day.": {
    am: "በዚህ ቀን ንቁ ወይም በመጠባበቅ ላይ ያለ የእረፍት ፈቃድ አለዎት። የፍቃድ ጥያቄ ከእረፍት ቀን ጋር ሊደራረብ አይችልም።",
    om: "Guyyaa kana baqiisaa qabdu. Gaaffiin hayyamaa guyyaa baqiisaa wajjin wal-irra bu'uu hin danda'u.",
    ti: "ኣብዚ መዓልቲ ዘሎ ወይ ኣብ ምጽባይ ዘሎ ናይ ዕረፍቲ ፍቓድ ኣለኩም። ናይ ፍቓድ ሕቶ ምስ ናይ ዕረፍቲ መዓልቲ ክደራረብ ኣይክእልን።"
  },
  "Category & Type": {
    am: "ምድብ እና አይነት",
    om: "Ramaddii fi Gosa",
    ti: "ምድብን ዓይነትን"
  },
  "Schedule / Date": {
    am: "መርሃ ግብር / ቀን",
    om: "Sagantaa / Guyyaa",
    ti: "መደብ / ዕለት"
  },
  "Schedule & Timing": {
    am: "መርሃ ግብር እና ሰዓት",
    om: "Sagantaa fi Yeroo",
    ti: "መደብን ግዜን"
  },
  "Submission Date": {
    am: "የቀረበበት ቀን",
    om: "Guyyaa Dhiyaate",
    ti: "ዝቐረበሉ ዕለት"
  },
  "Workday Permission Request": {
    am: "የስራ ሰዓት ፍቃድ ጥያቄ",
    om: "Gaaffii Hayyama Yeroo Hojii",
    ti: "ናይ ስራሕ ሰዓት ፍቓድ ሕቶ"
  },
  "Request Approved by You": {
    am: "በእርስዎ የጸደቀ ጥያቄ",
    om: "Gaaffii Isiniin Mirkanaa'e",
    ti: "ብኣኻትኩም ዝጸደቐ ሕቶ"
  },
  "Request Rejected by You": {
    am: "በእርስዎ ውድቅ የተደረገ ጥያቄ",
    om: "Gaaffii Isiniin Kufaa Ta'e",
    ti: "ብኣኻትኩም ዝተነጸገ ሕቶ"
  },
  "New Leave Request": {
    am: "አዲስ የእረፍት ጥያቄ",
    om: "Gaaffii Baqiisaa Haaraa",
    ti: "ሓድሽ ናይ ዕረፍቲ ሕቶ"
  },
  "New Permission Request": {
    am: "አዲስ የፍቃድ ጥያቄ",
    om: "Gaaffii Hayyamaa Haaraa",
    ti: "ሓድሽ ናይ ፍቓድ ሕቶ"
  },
  "Leave Request Submitted": {
    am: "የእረፍት ጥያቄ ቀርቧል",
    om: "Gaaffiin Baqiisaa Dhiyaateera",
    ti: "ናይ ዕረፍቲ ሕቶ ቀሪቡ"
  },
  "Permission Request Submitted": {
    am: "የፍቃድ ጥያቄ ቀርቧል",
    om: "Gaaffiin Hayyamaa Dhiyaateera",
    ti: "ናይ ፍቓድ ሕቶ ቀሪቡ"
  },
  "Request Approved": {
    am: "ጥያቄው ጸድቋል",
    om: "Gaaffiin Mirkanaa'eera",
    ti: "ሕቶ ጸዲቑ"
  },
  "Request Rejected": {
    am: "ጥያቄው ውድቅ ተደርጓል",
    om: "Gaaffiin Kufaa Ta'eera",
    ti: "ሕቶ ተነጺጉ"
  },
  "Request Cancelled": {
    am: "ጥያቄው ተሰርዟል",
    om: "Gaaffiin Haqameera",
    ti: "ሕቶ ተሰሪዙ"
  },
  "Request Cancelled by Officer": {
    am: "ጥያቄው በኦፊሰሩ ተሰርዟል",
    om: "Gaaffiin Hojjetaan Haqameera",
    ti: "ሕቶ ብኦፊሰር ተሰሪዙ"
  },
  "Request Details": {
    am: "የጥያቄው ዝርዝር",
    om: "Bal'ina Gaaffii",
    ti: "ዝርዝር ናይቲ ሕቶ"
  },
  "Requester Information": {
    am: "የጠያቂው መረጃ",
    om: "Oodeeffannoo Gaafataa",
    ti: "ሓበሬታ ሓታቲ"
  },
  "Total Duration": {
    am: "አጠቃላይ የጊዜ ርዝማኔ",
    om: "Turtii Waliigalaa",
    ti: "ጠቕላላ ግዜ"
  },
  "No attachment uploaded": {
    am: "ምንም ሰነድ አልተያያዘም",
    om: "Sanadni hin qabsiifamne",
    ti: "ዝኾነ ሰነድ ኣይተተሓሓዘን"
  },
  "Supervisor Remarks": {
    am: "የሱፐርቫይዘር አስተያየት",
    om: "Yaada Tooftaa",
    ti: "ርእይቶ ሱፐርቫይዘር"
  },
  "Officer / Requester": {
    am: "ኦፊሰር / ጠያቂ",
    om: "Hojjetaa / Gaafataa",
    ti: "ኦፊሰር / ሓታቲ"
  },
  "Update Profile Picture": {
    am: "የመገለጫ ፎቶ አዘምን",
    om: "Suuraa Piroofaayilii Haaromsi",
    ti: "ስእሊ ፕሮፋይል ሓድሽ"
  },
  "Profile Picture / Avatar": {
    am: "የመገለጫ ፎቶ / አምሳያ",
    om: "Suuraa Piroofaayilii / Avataarii",
    ti: "ስእሊ ፕሮፋይል / ኣቫታር"
  },
  "Upload Photo": {
    am: "ፎቶ ጫን",
    om: "Suuraa Olfe'i",
    ti: "ስእሊ ጸዓን"
  },
  "Remove Photo": {
    am: "ፎቶ አስወግድ",
    om: "Suuraa Haqii",
    ti: "ስእሊ ኣልዕል"
  },
  "Profile picture updated successfully": {
    am: "የመገለጫ ፎቶ በተሳካ ሁኔታ ተዘምኗል",
    om: "Suuraan piroofaayilii milkaa'inaan haaromfameera",
    ti: "ስእሊ ፕሮፋይል ብዓወት ተሓዲሱ"
  },
  "Official Information (Read-Only)": {
    am: "ይፋዊ መረጃ (ለንባብ ብቻ)",
    om: "Oodeeffannoo Idilee (Dubbisaaf Qofa)",
    ti: "ወግዓዊ ሓበሬታ (ንምንባብ ጥራይ)"
  },
  "Managed by Administration": {
    am: "በአስተዳዳሪ የሚተዳደር",
    om: "Bulchiinsaan Kan Bulu",
    ti: "ብምምሕዳር ዝመሓደር"
  },
  "Employee ID & Role": {
    am: "የሰራተኛ መለያ እና ሚና",
    om: "Waraqaa Eenyummaa fi Gahee Hojjetaa",
    ti: "መለለዪ ሰራሕተኛን ግደን"
  },
  "Official employee name, email, and phone number can only be updated by a system administrator or HR manager.": {
    am: "ይፋዊ የስራተኛ ስም፣ ኢሜይል እና ስልክ ቁጥር በሲስተም አስተዳዳሪ ወይም በሰው ኃይል ስራ አስኪያጅ ብቻ ሊሻሻሉ ይችላሉ።",
    om: "Maqaan hojjetaa, imeelii fi lakkoofsi bilbilaa idilee bulchaa sirnaa ykn hogganaa qabeenya namaatiin qofa haaromfamuu danda'a.",
    ti: "ወግዓዊ ስም ሰራሕተኛ፣ ኢመይልን ቁጽሪ ተሌፎንን ብኣመሓዳሪ ሲስተም ወይ ብኣካያዲ ሰብኣዊ ጸጋታት ጥራይ ክመሓየሽ ይኽእል።"
  },
  "Click to upload": {
    am: "ለመጫን ጠቅ ያድርጉ",
    om: "Olfe'uuf cuqqaasaa",
    ti: "ንምጽዓን ጠውቑ"
  },
  "or drag and drop": {
    am: "ወይም ጎትተው ይጣሉ",
    om: "yookiin harkisaatii buusaa",
    ti: "ወይ ስሒብኩም ኣእትዉ"
  },
  "up to 10MB": {
    am: "እስከ 10ሜባ",
    om: "hanga 10MB",
    ti: "ክሳብ 10ሜባ"
  },
  "Personalize your workspace avatar and identity": {
    am: "የስራ ቦታዎን አምሳያ እና መለያ ያብጁ",
    om: "Avataarii fi eenyummaa bakka hojii keessanii dhuunfeffadhaa",
    ti: "ናይ ስራሕ ቦታኹም ኣቫታርን መንነትን ብውልቂ ግበሩ"
  },
  "Send Alert": {
    am: "ማስጠንቀቂያ ላክ",
    om: "Akeekkachiisa Ergi",
    ti: "መጠንቀቕታ ስደድ"
  },
  "Send Alert to Officer": {
    am: "ለባለስልጣኑ ማስጠንቀቂያ ላክ",
    om: "Hojjetaadhaaf Akeekkachiisa Ergi",
    ti: "ንሰራሕተኛ መጠንቀቕታ ስደድ"
  },
  "Officer Telemetry & Status": {
    am: "የባለስልጣኑ ቴሌሜትሪ እና ሁኔታ",
    om: "Telemastirii fi Haala Hojjetaa",
    ti: "ቴሌሜትሪን ኩነታትን ሰራሕተኛ"
  },
  "Screen Time (Today)": {
    am: "የማያ ገጽ ጊዜ (ዛሬ)",
    om: "Yeroo Iskiiriinii (Har'a)",
    ti: "ናይ ስክሪን ግዜ (ሎሚ)"
  },
  "Verification History": {
    am: "የማረጋገጫ ታሪክ",
    om: "Seenaa Mirkaneessaa",
    ti: "ታሪኽ ምርግጋጽ"
  },
  "Quick Alert Templates": {
    am: "ፈጣን የማስጠንቀቂያ አብነቶች",
    om: "Qubannoo Akeekkachiisaa Saffisaa",
    ti: "ቅልጡፍ ናይ መጠንቀቕታ ቅጥዕታት"
  },
  "Low Screen Time": {
    am: "ዝቅተኛ የማያ ገጽ ጊዜ",
    om: "Yeroo Iskiiriinii Gadi-aanaa",
    ti: "ትሑት ናይ ስክሪን ግዜ"
  },
  "Missed Verif.": {
    am: "ያመለጡ ማረጋገጫዎች",
    om: "Mirkaneessa Darbe",
    ti: "ዝተሓለፈ ምርግጋጽ"
  },
  "Inactivity": {
    am: "እንቅስቃሴ-አልባ",
    om: "Hojii Dhaabuu",
    ti: "ዕረፍቲ / ስቕታ"
  },
  "Custom": {
    am: "ብጁ",
    om: "Kan Barame",
    ti: "ፍሉይ"
  },
  "Target hours warning": {
    am: "የዒላማ ሰዓታት ማስጠንቀቂያ",
    om: "Akeekkachiisa Sa'aatii",
    ti: "ናይ ዕላማ ሰዓታት መጠንቀቕታ"
  },
  "Missed prompts alert": {
    am: "ያመለጡ ጥያቄዎች ማስጠንቀቂያ",
    om: "Akeekkachiisa Gaaffii Darbee",
    ti: "ዝተሓለፉ ሕቶታት መጠንቀቕታ"
  },
  "Check active duty": {
    am: "ንቁ የስራ ግዴታን ይፈትሹ",
    om: "Hojii Qoradhaa",
    ti: "ንቑሕ ናይ ስራሕ ግዴታ ተዓዘብ"
  },
  "Compose message": {
    am: "መልእክት ይጻፉ",
    om: "Ergaa Barreessaa",
    ti: "መልእኽቲ ጽሓፍ"
  },
  "Alert Priority": {
    am: "የማስጠንቀቂያ ቅድሚያ",
    om: "Dursa Akeekkachiisaa",
    ti: "ቀዳምነት መጠንቀቕታ"
  },
  "Normal (Info)": {
    am: "መደበኛ (መረጃ)",
    om: "Idilee (Oodeeffannoo)",
    ti: "ስሩዕ (ሓበሬታ)"
  },
  "Important (Warning)": {
    am: "አስፈላጊ (ማስጠንቀቂያ)",
    om: "Barbaachisaa (Akeekkachiisa)",
    ti: "ኣገዳሲ (መጠንቀቕታ)"
  },
  "Urgent (Critical)": {
    am: "አስቸኳይ (ወሳኝ)",
    om: "Ariifachiisaa (Murteessaa)",
    ti: "ህጹጽ (ወሳኒ)"
  },
  "Alert Title": {
    am: "የማስጠንቀቂያ ርዕስ",
    om: "Mata-duree Akeekkachiisaa",
    ti: "ኣርእስቲ መጠንቀቕታ"
  },
  "Alert Message": {
    am: "የማስጠንቀቂያ መልእክት",
    om: "Ergaa Akeekkachiisaa",
    ti: "መልእኽቲ መጠንቀቕታ"
  },
  "e.g. Low Screen Time Notice": {
    am: "ለምሳሌ፡ ዝቅተኛ የማያ ገጽ ጊዜ ማስታወቂያ",
    om: "fk. Beeksisa Yeroo Iskiiriinii Gadi-aanaa",
    ti: "ንኣብነት፡ ትሑት ናይ ስክሪን ግዜ ምልክታ"
  },
  "Write a direct operational alert message to this field officer...": {
    am: "ለዚህ የመስክ ባለስልጣን ቀጥተኛ የአሰራር ማስጠንቀቂያ መልእክት ይጻፉ...",
    om: "Hojjetaa kanaaf ergaa akeekkachiisaa kallattiin barreessaa...",
    ti: "ንዚ ናይ መሮር ሰራሕተኛ ቀጥታዊ ናይ ኣሰራርሓ መጠንቀቕታ መልእኽቲ ጽሓፉ..."
  },
  "This alert will be delivered directly to the officer via In-App Notification and the Operational Alert Drawer. Stored offline and synced automatically.": {
    am: "ይህ ማስጠንቀቂያ በመተግበሪያ ውስጥ ማሳወቂያ እና በአሰራር ማስጠንቀቂያ ክፍል በቀጥታ ለባለስልጣኑ ይደርሳል። ከመስመር ውጭ ተቀምጦ በራስ-ሰር ይመሳሰላል።",
    om: "Akeekkachiisni kun kallattiin beeksisa keessaa fi saanduqa akeekkachiisaan hojjetaaf ergama. Toora alatti kuufamee ofumaan walsimata.",
    ti: "እዚ መጠንቀቕታ ብውሽጢ-መተግበሪ ምልክታን ብሳንዱቕ መጠንቀቕታን ቀጥታ ንሰራሕተኛ ይበጽሕ። ካብ መርበብ ወጻኢ ተዓቂቡ ብኣውቶማቲክ ይመሳሰል።"
  },
  "Send Alert Message": {
    am: "የማስጠንቀቂያ መልእክት ላክ",
    om: "Ergaa Akeekkachiisaa Ergi",
    ti: "ናይ መጠንቀቕታ መልእኽቲ ስደድ"
  },
  "Sending Alert...": {
    am: "ማስጠንቀቂያ በመላክ ላይ...",
    om: "Akeekkachiisa ergaa jira...",
    ti: "መጠንቀቕታ ይሰድድ ኣሎ..."
  },
  "Alert sent successfully to": {
    am: "ማስጠንቀቂያው በተሳካ ሁኔታ ተልኳል ለ",
    om: "Akeekkachiisni milkaa'inaan ergameeraaf",
    ti: "መጠንቀቕታ ብዓወት ተላኢኹ ን"
  },
  "Please enter an alert title and message": {
    am: "እባክዎን የማስጠንቀቂያ ርዕስ እና መልእክት ያስገቡ",
    om: "Mee mata-duree fi ergaa akeekkachiisaa galchaa",
    ti: "በጃኹም ኣርእስትን መልእኽትን መጠንቀቕታ ኣእትዉ"
  },
  "Failed to send alert. Please try again.": {
    am: "ማስጠንቀቂያ መላክ አልተሳካም። እባክዎ እንደገና ይሞክሩ።",
    om: "Akeekkachiisa erguun hin danda'amne. Mee irra deebi'aa yaalaa.",
    ti: "መጠንቀቕታ ምልኣኽ ኣይተዓወተን። በጃኹም ደጊምኩም ፈትኑ።"
  },
  "Low Screen Time Notice": {
    am: "የዝቅተኛ የማያ ገጽ ጊዜ ማስታወቂያ",
    om: "Beeksisa Yeroo Iskiiriinii Gadi-aanaa",
    ti: "ናይ ትሑት ስክሪን ግዜ ምልክታ"
  },
  "Urgent: Missed Verification Prompts": {
    am: "አስቸኳይ፡ ያመለጡ የማረጋገጫ ጥያቄዎች",
    om: "Ariifachiisaa: Gaaffii Mirkaneessaa Darbe",
    ti: "ህጹጽ፡ ዝተሓለፉ ናይ ምርግጋጽ ሕቶታት"
  },
  "Session Inactivity Notice": {
    am: "የክፍለ ጊዜ እንቅስቃሴ-አልባ ማስታወቂያ",
    om: "Beeksisa Hojii Dhaabuu",
    ti: "ናይ ስራሕ ዕረፍቲ/ስቕታ ምልክታ"
  },
  "total events": {
    am: "አጠቃላይ ክስተቶች",
    om: "waliigala taateewwan",
    ti: "ድምር ፍጻመታት"
  },
  "Send direct operational alert messages to field officers based on their screen time and verification history": {
    am: "በማያ ገጽ ጊዜ እና በማረጋገጫ ታሪክ ላይ በመመስረት በቀጥታ የአሰራር ማስጠንቀቂያ መልዕክቶችን ለመስክ ባለስልጣናት ይላኩ",
    om: "Yeroo iskiiriinii fi seenaa mirkaneessaa irratti hundaa'uun ergaa akeekkachiisaa kallattiin hojjettootaaf ergaa",
    ti: "ኣብ ናይ ስክሪን ግዜን ታሪኽ ምርግጋጽን ተመርኲስኩም ቀጥታዊ ናይ ኣሰራርሓ መጠንቀቕታታት ንሰራሕተኛታት ስደዱ"
  },
  "Search officer, employee ID, territory...": {
    am: "ባለስልጣን፣ የሰራተኛ መታወቂያ፣ ክልል ፈልግ...",
    om: "Hojjetaa, ID, naannoo barbaadi...",
    ti: "ሰራሕተኛ፣ መፍለዪ ቁጽሪ፣ ዞባ ድለ..."
  },
  "Loading officers telemetry...": {
    am: "የባለስልጣናት ቴሌሜትሪ በመጫን ላይ...",
    om: "Telemastirii hojjettootaa fe'aa jira...",
    ti: "ቴሌሜትሪ ሰራሕተኛታት ይጽዕን ኣሎ..."
  },
  "Territory": {
    am: "ግዛት / ዞባ",
    om: "Naannoo Hojii",
    ti: "ዞባ / ከባቢ"
  },
  "Report Submitted": {
    am: "ሪፖርት ገብቷል",
    om: "Gabaasni Dhiyaateera",
    ti: "ጸብጻብ ቀሪቡ"
  },
  "Report In Progress": {
    am: "ሪፖርት በሂደት ላይ",
    om: "Gabaasni Adeemsarra Jira",
    ti: "ጸብጻብ ኣብ መስርሕ ኣሎ"
  },
  "Low": {
    am: "ዝቅተኛ",
    om: "Gadi-aanaa",
    ti: "ትሑት"
  },
  "Alert notification sent to": {
    am: "የማስጠንቀቂያ ማሳወቂያ ተልኳል ለ",
    om: "Beeksisi akeekkachiisaa ergameeraaf",
    ti: "ናይ መጠንቀቕታ ምልክታ ተላኢኹ ን"
  },
  "This alert will be delivered directly to the officer as an in-app notification.": {
    am: "ይህ ማስጠንቀቂያ በመተግበሪያ ውስጥ ማሳወቂያ በቀጥታ ለባለስልጣኑ ይደርሳል።",
    om: "Akeekkachiisni kun kallattiin akka beeksisa keessaatti hojjetaaf ergama.",
    ti: "እዚ መጠንቀቕታ ብውሽጢ-መተግበሪ ምልክታ ቀጥታ ንሰራሕተኛ ይበጽሕ።"
  }
};



