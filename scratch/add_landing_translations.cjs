const fs = require('fs');
const path = require('path');

const dictPath = path.resolve(__dirname, '../src/services/translationDictionary.ts');

const newEntries = {
  // Navigation & General
  'Features': {
    am: 'ባህሪያት',
    om: 'Amaloota',
    ti: 'ባህርያት'
  },
  'How It Works': {
    am: 'እንዴት እንደሚሰራ',
    om: 'Akkaataa Inni Hojjetu',
    ti: 'ብኸመይ ይሰርሕ'
  },
  'Field Conditions': {
    am: 'የመስክ ሁኔታዎች',
    om: 'Haala Dirree',
    ti: 'ኩነታት መሮር'
  },
  'User Portals': {
    am: 'የተጠቃሚ ፖርታሎች',
    om: 'Poortaalota Fayyadamaa',
    ti: 'ናይ ተጠቀምቲ ፖርታላት'
  },
  'Operations': {
    am: 'ክንውኖች',
    om: 'Hojiiwwan',
    ti: 'ስርሒታት'
  },
  'Security': {
    am: 'ደህንነት',
    om: 'Nageenya',
    ti: 'ድሕንነት'
  },
  'Back to top': {
    am: 'ወደ ላይ ተመለስ',
    om: 'Gara Oliitti Deebi\'i',
    ti: 'ናብ ላዕሊ ተመለስ'
  },

  // Hero Section
  'Connecting Field Teams': {
    am: 'የመስክ ቡድኖችን በማገናኘት ላይ',
    om: 'Gareewwan Dirree Walqunnamsiisuu',
    ti: 'ናይ መሮር ጉጅለታት ምትእስሳር'
  },
  'to the National Registry': {
    am: 'ከብሔራዊ መዝገብ ቤት ጋር',
    om: 'gara Galmee Biyyooleessaatti',
    ti: 'ምስ ብሔራዊ መዝገብ'
  },
  'Connecting Field Teams to the National Registry': {
    am: 'የመስክ ቡድኖችን ከብሔራዊ መዝገብ ቤት ጋር ማገናኘት',
    om: 'Gareewwan Dirree gara Galmee Biyyooleessaatti Walqunnamsiisuu',
    ti: 'ናይ መሮር ጉጅለታት ምስ ብሔራዊ መዝገብ ምትእስሳር'
  },
  'Register citizens securely from anywhere — even without internet.': {
    am: 'ዜጎችን ከየትኛውም ቦታ በደህንነት ይመዝግቡ — ያለ በይነመረብም እንኳ።',
    om: 'Lammiilee bakka kamiyyuu nageenyaan galmeessaa — intarneetii maleeyyuu.',
    ti: 'ዜጋታት ካብ ዝኾነ ቦታ ብውሑስ መንገዲ መዝግቡ — ዋላ ብዘይ ኢንተርኔት።'
  },
  'FieldSync is an offline-first citizen registration platform built for field teams working in remote and low-connectivity areas.': {
    am: 'FieldSync በሩቅ እና ዝቅተኛ የኔትወርክ ግንኙነት ባላቸው አካባቢዎች ለሚሰሩ የመስክ ቡድኖች የተዘጋጀ ከመስመር ውጭ ቅድሚያ የሚሰጥ የዜጎች ምዝገባ መድረክ ነው።',
    om: 'FieldSync waltajjii galmeessa lammilee toora interneetii malee hojjetuudha, kan qophaa\'e gareewwan dirree naannoolee fagoo fi qunnamtii gadi aanaa qaban keessatti hojjetaniif.',
    ti: 'FieldSync ኣብ ርሑቕን ትሑት መርበብ ሓበሬታ ዘለዎምን ከባቢታት ንዝሰርሑ ናይ መሮር ጉጅለታት ዝተዳለወ ካብ መስመር ወጻኢ ቅድም ዝህብ መድረኽ ምዝገባ ዜጋታት እዩ።'
  },
  'Field officers can register citizens, securely store records on their devices, and automatically synchronize data with the central system when connectivity is restored.': {
    am: 'የመስክ መኮንኖች ዜጎችን መመዝገብ፣ መረጃዎችን በመሳሪያዎቻቸው ላይ በደህንነት ማከማቸት፣ እና የኔትወርክ ግንኙነት ሲመለስ መረጃዎችን ከማዕከላዊው ስርዓት ጋር በራስ-ሰር ማመሳሰል ይችላሉ።',
    om: 'Oofisaroonni dirree lammiilee galmeessuu, galmeewwan meeshaa isaanii irratti nageenyaan kuusuu, fi yeroo qunnamtiin deebi\'u odeeffannoo sirna giddugaleessaa waliin ofumaan walsimsiisuu danda\'u.',
    ti: 'ናይ መሮር መኮንናት ዜጋታት ክምዝግቡ፣ መዛግብቲ ኣብ መሳርሒታቶም ብውሑስ ክዕቅቡ፣ ከምኡ’ውን መርበብ ሓበሬታ ምስ ተመልሰ ሓበሬታ ምስ ማእከላይ ስርዓት ብኣውቶማቲክ ከሰማምዑ ይኽእሉ።'
  },

  // 3. Built for the Field
  'Built for the Field': {
    am: 'ለመስክ የተገነባ',
    om: 'Dirreef Kan Hojjetame',
    ti: 'ንመሮር ዝተሃነጸ'
  },
  'Core system capabilities designed for frontline reliability in remote operations.': {
    am: 'በሩቅ ስራዎች ውስጥ ለግንባር ቀደም አስተማማኝነት የተነደፉ ዋና የስርዓት አቅሞች።',
    om: 'Dandeettiiwwan sirnaa ijoo kanneen hojiiwwan fagootti amanamummaa sarara duraatiif qophaa\'an.',
    ti: 'ኣብ ርሑቕ ስርሒታት ንቀዳማይ መስመር ተኣማንነት ዝተነድፉ ቀንዲ ዓቕምታት ስርዓት።'
  },
  'Offline-First Mode': {
    am: 'ከመስመር ውጭ ቀዳሚ ሁነታ',
    om: 'Haala Toora Malee Duraa',
    ti: 'ካብ መስመር ወጻኢ ቀዳማይ ኩነታት'
  },
  'Continue registering citizens even when there is no internet connection.': {
    am: 'የበይነመረብ ግንኙነት በሌለበት ጊዜም እንኳ ዜጎችን መመዝገብዎን ይቀጥሉ።',
    om: 'Yeroo qunnamtiin interneetii hin jirreettillee lammiilee galmeessuu itti fufaa.',
    ti: 'ናይ ኢንተርኔት ርክብ ኣብ ዘይብሉ እዋን እውን እንተኾነ ዜጋታት ምምዝጋብ ቀጽሉ።'
  },
  'Secure Local Storage': {
    am: 'ደህንነቱ የተጠበቀ የአካባቢ ማከማቻ',
    om: 'Kuusaa Bakkaa Nageenya Qabu',
    ti: 'ውሑስ ናይ ከባቢ መኽዘን'
  },
  'Records are safely stored on the device until synchronization becomes available.': {
    am: 'ማመሳሰል እስኪገኝ ድረስ መዝገቦች በመሳሪያው ላይ በደህንነት ይቀመጣሉ።',
    om: 'Hanga walsimsiifamni argamutti galmeewwan meeshicharratti nageenyaan ni taa\'u.',
    ti: 'ምስምማዕ ክሳብ ዝርከብ መዛግብቲ ኣብቲ መሳርሒ ብውሑስ ይዕቀቡ።'
  },
  'Duplicate Prevention': {
    am: 'የተደጋገሙ ምዝገባዎችን መከላከል',
    om: 'Galmee Lammataa Ittisuu',
    ti: 'ተደጋጋሚ ምዝገባ ምክልኻል'
  },
  'Built-in validation helps detect repeated or conflicting registrations before records are saved.': {
    am: 'አብሮ የተሰራ ማረጋገጫ መዝገቦች ከመቀመጣቸው በፊት የተደጋገሙ ወይም የሚጋጩ ምዝገባዎችን ለመለየት ይረዳል።',
    om: 'Mirkaneessi keessaa galmeewwan osoo hin olkaa\'amin dura galmeewwan irra deddeebi\'aman ykn walfaallessan adda baasuuf gargaara.',
    ti: 'ውሽጣዊ መረጋገጺ መዛግብቲ ቅድሚ ምዕቃቦም ተደጋጋሚ ወይ ዝጋጮ ምዝገባታት ንምፍላይ ይሕግዝ።'
  },
  'Automatic Synchronization': {
    am: 'ራስ-ሰር ማመሳሰል',
    om: 'Ofumaan Walsimsiisuu',
    ti: 'ኣውቶማቲክ ምስምማዕ'
  },
  'When connectivity returns, pending records are securely synchronized with the central system.': {
    am: 'የኔትወርክ ግንኙነት ሲመለስ በመጠባበቅ ላይ ያሉ መዝገቦች ከማዕከላዊው ስርዓት ጋር በደህንነት ይመሳሰላሉ።',
    om: 'Yeroo qunnamtiin deebi\'u galmeewwan eeggatan sirna giddugaleessaa waliin nageenyaan ni walsimsiifamu.',
    ti: 'መርበብ ሓበሬታ ምስ ተመልሰ ዝጽበዩ መዛግብቲ ምስ ማእከላይ ስርዓት ብውሑስ መንገዲ ይሰማምዑ።'
  },

  // 4. How FieldSync Works
  'How FieldSync Works': {
    am: 'FieldSync እንዴት እንደሚሰራ',
    om: 'FieldSync Akkamitti Hojjeta',
    ti: 'FieldSync ብኸመይ ይሰርሕ'
  },
  'A dependable workflow designed for remote field environments.': {
    am: 'ለሩቅ የመስክ አካባቢዎች የተነደፈ አስተማማኝ የስራ ፍሰት።',
    om: 'Adeemsa hojii amansiisaa kan naannoolee dirree fagoof qophaa\'e.',
    ti: 'ንርሑቕ ናይ መሮር ከባቢታት ዝተነድፈ ዘተኣማምን ናይ ስራሕ ዋሕዚ።'
  },
  '01 — Register Offline': {
    am: '01 — ከመስመር ውጭ ይመዝግቡ',
    om: '01 — Toora Malee Galmeessi',
    ti: '01 — ካብ መስመር ወጻኢ መዝግብ'
  },
  'Field officers can register citizens from remote locations without requiring a continuous internet connection.': {
    am: 'የመስክ መኮንኖች ቀጣይነት ያለው የበይነመረብ ግንኙነት ሳያስፈልጋቸው ከሩቅ አካባቢዎች ዜጎችን መመዝገብ ይችላሉ።',
    om: 'Oofisaroonni dirree qunnamtii interneetii walirraa hin cinne osoo hin barbaachisin bakkeewwan fagoo irraa lammiilee galmeessuu danda\'u.',
    ti: 'ናይ መሮር መኮንናት ቀጻሊ ናይ ኢንተርኔት ርክብ ከየድለዮም ካብ ርሑቕ ቦታታት ዜጋታት ክምዝግቡ ይኽእሉ።'
  },
  '02 — Store Securely': {
    am: '02 — በደህንነት ያከማቹ',
    om: '02 — Nageenyaan Kuusi',
    ti: '02 — ብውሑስ ዓቅብ'
  },
  'Registration data is securely stored on the field device while the officer continues working offline.': {
    am: 'መኮንኑ ከመስመር ውጭ መስራቱን በሚቀጥልበት ጊዜ የምዝገባ መረጃ በመስክ መሳሪያው ላይ በደህንነት ይከማቻል።',
    om: 'Oofisarri toora malee hojii isaa yeroo itti fufu ragaan galmee meeshaa dirree irratti nageenyaan kuufama.',
    ti: 'እቲ መኮንን ካብ መስመር ወጻኢ ስርሑ እናቀጸለ እንከሎ ናይ ምዝገባ ሓበሬታ ኣብ ናይ መሮር መሳርሒ ብውሑስ ይዕቀብ።'
  },
  '03 — Sync Automatically': {
    am: '03 — በራስ-ሰር ያመሳስሉ',
    om: '03 — Ofumaan Walsimsiisi',
    ti: '03 — ብኣውቶማቲክ ኣሰማምዕ'
  },
  'When an internet connection becomes available, pending records are automatically synchronized with the central system.': {
    am: 'የበይነመረብ ግንኙነት ሲገኝ፣ በመጠባበቅ ላይ ያሉ መዝገቦች ከማዕከላዊው ስርዓት ጋር በራስ-ሰር ይመሳሰላሉ።',
    om: 'Yeroo qunnamtiin interneetii argamu, galmeewwan eegaa jiran ofumaan sirna giddugaleessaa waliin walsimsiifamu.',
    ti: 'ናይ ኢንተርኔት ርክብ ኣብ ዝርከበሉ እዋን፣ ዝጽበዩ ዘለዉ መዛግብቲ ምስ ማእከላይ ስርዓት ብኣውቶማቲክ ይሰማምዑ።'
  },
  '04 — Verify & Monitor': {
    am: '04 — ያረጋግጡ እና ይከታተሉ',
    om: '04 — Mirkaneessi & Hordofi',
    ti: '04 — ኣረጋግጽን ተኸታተልን'
  },
  'Supervisors and managers can review registrations, monitor field activity, and track synchronization status.': {
    am: 'ተቆጣጣሪዎች እና ስራ አስኪያጆች ምዝገባዎችን መገምገም፣ የመስክ እንቅስቃሴዎችን መከታተል እና የማመሳሰል ሁኔታን መከታተል ይችላሉ።',
    om: 'To\'attoonni fi manajeronni galmeewwan gamaaggamuu, sochii dirree to\'achuu fi haala walsimsiisaa hordofuu danda\'u.',
    ti: 'ተቖጻጸርትን መካየድትን ምዝገባታት ክግምግሙ፣ ናይ መሮር ምንቅስቓስ ክከታተሉን ኩነታት ምስምማዕ ክከታተሉን ይኽእሉ።'
  },

  // 5. Built for Real Field Conditions
  'Built for Real Field Conditions': {
    am: 'ለእውነተኛ የመስክ ሁኔታዎች የተገነባ',
    om: 'Haala Qabatamaa Dirreef Kan Hojjetame',
    ti: 'ንሓቀኛ ኩነታት መሮር ዝተሃነጸ'
  },
  'Technology designed around the challenges of field work.': {
    am: 'በመስክ ስራ ፈተናዎች ዙሪያ የተቀየሰ ቴክኖሎጂ።',
    om: 'Teeknoolojii rakkoolee hojii dirree irratti hundaa\'ee qophaa\'e.',
    ti: 'ኣብ ብድሆታት ናይ መሮር ስራሕ ተመርኲሱ ዝተነድፈ ቴክኖሎጂ።'
  },
  'No Internet? Keep Working.': {
    am: 'ኢንተርኔት የለም? መስራትዎን ይቀጥሉ።',
    om: 'Interneetii Hin Qabduu? Hojii Itti Fufi.',
    ti: 'ኢንተርኔት የለን? ስራሕካ ቀጽል።'
  },
  'Field officers can continue registering citizens in remote areas with limited or no connectivity.': {
    am: 'የመስክ መኮንኖች ውስን ወይም ምንም ግንኙነት በሌላቸው ሩቅ አካባቢዎች ዜጎችን መመዝገብ መቀጠል ይችላሉ።',
    om: 'Oofisaroonni dirree naannoolee fagoo qunnamtii muraasa qaban ykn hin qabne keessatti lammiilee galmeessuu itti fufuu danda\'u.',
    ti: 'ናይ መሮር መኮንናት ውሱን ወይ ርክብ ኣብ ዘይብሎም ርሑቓት ከባቢታት ዜጋታት ምምዝጋብ ክቕጽሉ ይኽእሉ።'
  },
  'Prevent Duplicate Records': {
    am: 'የተደጋገሙ መዝገቦችን መከላከል',
    om: 'Galmeewwan Lammataa Ittisi',
    ti: 'ተደጋጋሚ መዛግብቲ ምክልኻል'
  },
  'Validation and cross-checking help identify duplicate or conflicting citizen registrations.': {
    am: 'ማረጋገጫ እና አቋራጭ ምርመራ የተደጋገሙ ወይም የሚጋጩ የዜጎች ምዝገባዎችን ለመለየት ይረዳሉ።',
    om: 'Mirkaneessi fi qorannoon walxaxaa galmee lammiilee irra deddeebi\'ame ykn walitti bu\'u adda baasuuf gargaara.',
    ti: 'መረጋገጽን ምምርማርን ተደጋጋሚ ወይ ዝጋጮ ምዝገባታት ዜጋታት ንምፍላይ ይሕግዝ።'
  },
  'Never Lose Field Work': {
    am: 'የመስክ ስራን በጭራሽ አያጡ',
    om: 'Hojii Dirree Gonkumaa Hin Dhabinaa',
    ti: 'ናይ መሮር ስራሕ ፈጺምካ ኣይተጥፍእ'
  },
  'Offline records remain available on the device until they can be securely synchronized with the central system.': {
    am: 'ከመስመር ውጭ የሆኑ መዝገቦች ከማዕከላዊው ስርዓት ጋር በደህንነት እስኪመሳሰሉ ድረስ በመሳሪያው ላይ ተደራሽ ሆነው ይቆያሉ።',
    om: 'Galmeewwan toora malee jiran hanga sirna giddugaleessaa waliin nageenyaan walsimsiifamanitti meeshicharratti qophii ta\'anii turu.',
    ti: 'ካብ መስመር ወጻኢ ዝኾኑ መዛግብቲ ምስ ማእከላይ ስርዓት ብውሑስ ክሳብ ዝሰማምዑ ኣብቲ መሳርሒ ድሉዋት ኮይኖም ይጸንሑ።'
  },
  'Know What Is Happening': {
    am: 'ምን እየተካሄደ እንዳለ ይወቁ',
    om: 'Wanta Ta\'aa Jiru Beekaa',
    ti: 'እንታይ ይፍጸም ከምዘሎ ፍለጡ'
  },
  'Supervisors and managers can monitor registration progress, field activity, and synchronization status.': {
    am: 'ተቆጣጣሪዎች እና ስራ አስኪያጆች የምዝገባ ሂደትን፣ የመስክ እንቅስቃሴን እና የማመሳሰል ሁኔታን መከታተል ይችላሉ።',
    om: 'To\'attoonni fi manajeronni adeemsa galmee, sochii dirree fi haala walsimsiisaa to\'achuu danda\'u.',
    ti: 'ተቖጻጸርትን መካየድትን መስርሕ ምዝገባ፣ ናይ መሮር ምንቅስቓስን ኩነታት ምስምማዕን ክከታተሉ ይኽእሉ።'
  },

  // 6. One Platform. Three Roles
  'One Platform. Three Roles.': {
    am: 'አንድ መድረክ። ሶስት ሚናዎች።',
    om: 'Waltajjii Tokko. Gahee Hojii Sadii.',
    ti: 'ሓደ መድረኽ። ሰለስተ ግደታት።'
  },
  'Dedicated tools for every level of field operations.': {
    am: 'ለእያንዳንዱ የመስክ ስራዎች ደረጃ የተዘጋጁ መሳሪያዎች።',
    om: 'Meeshaalee addaa sadarkaa hundaa hojii dirreetiif qophaa\'an.',
    ti: 'ንነፍሲ ወከፍ ብርኪ ናይ መሮር ስርሒታት ዝተዳለዉ ፍሉያት መሳርሒታት።'
  },
  'Field Officer': {
    am: 'የመስክ መኮንን',
    om: 'Oofisara Dirree',
    ti: 'ናይ መሮር መኮንን'
  },
  'Register citizens, capture required information, and continue working offline from the field.': {
    am: 'ዜጎችን ይመዝግቡ፣ አስፈላጊውን መረጃ ይያዙ፣ እና ከመስክ ከመስመር ውጭ መስራትዎን ይቀጥሉ።',
    om: 'Lammiilee galmeessaa, odeeffannoo barbaachisu qabaa, fi dirree irraa toora malee hojjechuu itti fufaa.',
    ti: 'ዜጋታት መዝግቡ፣ ኣድላዪ ሓበሬታ ሓዙ፣ ካብ መሮር ድማ ካብ መስመር ወጻኢ ስራሕኩም ቀጽሉ።'
  },
  'Demographic & vital records intake': {
    am: 'የስነ-ሕዝብ እና የህይወት ክስተቶች ምዝገባ መቀበያ',
    om: 'Galmee uummataa fi ragaalee murteessoo fudhachuu',
    ti: 'ናይ ስነ-ህዝብን ወሰንቲ ኩነታትን ምዝገባ ምቕባል'
  },
  'Offline local storage with automatic sync': {
    am: 'ከመስመር ውጭ የአካባቢ ማከማቻ ከራስ-ሰር ማመሳሰል ጋር',
    om: 'Kuusaa naannoo toora malee walsimsiisa ofumaa waliin',
    ti: 'ካብ መስመር ወጻኢ ናይ ከባቢ ምዕቃብ ምስ ኣውቶማቲክ ምስምማዕ'
  },
  'Daily field attendance & activity logs': {
    am: 'የዕለት የመስክ ክትትል እና የእንቅስቃሴ መዝገቦች',
    om: 'Hordoffii argama guyyaa fi galmee sochii dirree',
    ti: 'ናይ መዓልቲ ናይ መሮር ህላወን ናይ ምንቅስቓስ መዛግብትን'
  },
  'Enter Field Officer Portal': {
    am: 'ወደ መስክ መኮንን ፖርታል ይግቡ',
    om: 'Gara Poortaalii Oofisara Dirreetti Seeni',
    ti: 'ናብ ናይ መሮር መኮንን ፖርታል እቶ'
  },
  'Zonal Supervisor': {
    am: 'የዞን ተቆጣጣሪ',
    om: 'To\'ataa Zoonii',
    ti: 'ናይ ዞባ ተቖጻጻሪ'
  },
  'Review registrations, monitor assigned field officers, verify records, and track activity across the zone.': {
    am: 'ምዝገባዎችን ይገምግሙ፣ የተመደቡ የመስክ መኮንኖችን ይቆጣጠሩ፣ መዝገቦችን ያረጋግጡ እና በመላው ዞኑ እንቅስቃሴዎችን ይከታተሉ።',
    om: 'Galmeewwan gamaaggamaa, oofisaroota dirree ramadaman to\'adhaa, galmeewwan mirkaneessaa, fi sochii zoonii keessaa hordofaa.',
    ti: 'ምዝገባታት ግምግሙ፣ ዝተመደቡ ናይ መሮር መኮንናት ተቖጻጸሩ፣ መዛግብቲ ኣረጋግጹን ኣብ ብምሉእ ዞባ ዘሎ ምንቅስቓስ ተኸታተሉን።'
  },
  'Registration queue review & validation': {
    am: 'የምዝገባ ተራ ግምገማ እና ማረጋገጫ',
    om: 'Tarree galmee gamaaggamuu fi mirkaneessuu',
    ti: 'ተራ ምዝገባ ምግምጋምን ምርግጋጽን'
  },
  'Duplicate detection & conflict resolution': {
    am: 'የተደጋገሙ መረጃዎችን መለየት እና ግጭቶችን መፍታት',
    om: 'Galmee lammataa adda baasuu fi waldhabdee hiikuu',
    ti: 'ተደጋጋሚ ምፍላይን ግጭት ምፍታሕን'
  },
  'Field officer monitoring & assignments': {
    am: 'የመስክ መኮንኖች ክትትል እና ምደባ',
    om: 'Hordoffii fi ramaddii oofisaroota dirree',
    ti: 'ክትትልን ምደባን ናይ መሮር መኮንናት'
  },
  'Enter Supervisor Portal': {
    am: 'ወደ ተቆጣጣሪ ፖርታል ይግቡ',
    om: 'Gara Poortaalii To\'ataatti Seeni',
    ti: 'ናብ ናይ ተቖጻጻሪ ፖርታል እቶ'
  },
  'National Manager': {
    am: 'ብሔራዊ ስራ አስኪያጅ',
    om: 'Manejara Biyyooleessaa',
    ti: 'ብሔራዊ መካየዲ'
  },
  'Monitor national operations, compare regions and zones, and oversee registration activity across the system.': {
    am: 'ብሔራዊ ስራዎችን ይቆጣጠሩ፣ ክልሎችን እና ዞኖችን ያወዳድሩ፣ እና በስርዓቱ ዙሪያ የምዝገባ እንቅስቃሴዎችን ይቆጣጠሩ።',
    om: 'Hojiiwwan biyyooleessaa to\'adhaa, naannoolee fi zoonota walbira qabaa, fi sochii galmee sirnicha keessaa hordofaa.',
    ti: 'ብሔራዊ ስርሒታት ተቖጻጸሩ፣ ክልላትን ዞባታትን ኣወዳድሩ፣ ከምኡ’ውን ኣብ ብምሉእ ስርዓት ዘሎ ናይ ምዝገባ ምንቅስቓስ ተዓዘቡ።'
  },
  'National registration dashboards & KPI tracking': {
    am: 'ብሔራዊ የምዝገባ ዳሽቦርዶች እና የKPI ክትትል',
    om: 'Daashboordii galmee biyyooleessaa fi hordoffii KPI',
    ti: 'ናይ ብሔር ምዝገባ ዳሽቦርድታትን ክትትል KPIን'
  },
  'Regional & zonal comparative metrics': {
    am: 'የክልል እና የዞን ንጽጽር መለኪያዎች',
    om: 'Safartuuwwan walbira qabinsa naannoo fi zoonii',
    ti: 'ናይ ክልልን ዞባን ምንጽጻር መለክዒታት'
  },
  'Staff provisioning & operational oversight': {
    am: 'የሰራተኞች ዝግጅት እና የአሰራር ቁጥጥር',
    om: 'Dhiyeessii hojjettootaa fi to\'annoo hojii',
    ti: 'ምድላው ሰራሕተኛታትን ምቁጽጻር ስርሒትን'
  },
  'Enter Manager Portal': {
    am: 'ወደ ስራ አስኪያጅ ፖርታል ይግቡ',
    om: 'Gara Poortaalii Manejaraatti Seeni',
    ti: 'ናብ ናይ መካየዲ ፖርታል እቶ'
  },

  // 7. Field Operations Across Ethiopia
  'Field Operations Across Ethiopia': {
    am: 'የመስክ ስራዎች በመላው ኢትዮጵያ',
    om: 'Hojiiwwan Dirree Guutuu Itoophiyaatti',
    ti: 'ናይ መሮር ስርሒታት ኣብ መላእ ኢትዮጵያ'
  },
  'A connected view of national field registration activity.': {
    am: 'የተገናኘ የብሔራዊ የመስክ ምዝገባ እንቅስቃሴ እይታ።',
    om: 'Ilaalcha walqabataa sochii galmee dirree biyyooleessaa.',
    ti: 'እተተኣሳሰረ ትርኢት ናይ ብሔራዊ መሮር ምዝገባ ምንቅስቓስ።'
  },
  'Regions': {
    am: 'ክልሎች',
    om: 'Naannoolee',
    ti: 'ክልላት'
  },
  'Zones': {
    am: 'ዞኖች',
    om: 'Zoonota',
    ti: 'ዞባታት'
  },
  'Districts': {
    am: 'ወረዳዎች',
    om: 'Aanoolee',
    ti: 'ወረዳታት'
  },
  'Registered Citizens': {
    am: 'የተመዘገቡ ዜጎች',
    om: 'Lammiilee Galmaa\'an',
    ti: 'ዝተመዝገቡ ዜጋታት'
  },
  'Field Staff': {
    am: 'የመስክ ሰራተኞች',
    om: 'Hojjettoota Dirree',
    ti: 'ናይ መሮር ሰራሕተኛታት'
  },

  // 8. Security Built Into Every Registration
  'Security Built Into Every Registration': {
    am: 'በእያንዳንዱ ምዝገባ ውስጥ የተገነባ ደህንነት',
    om: 'Nageenya Galmee Hunda Keessatti Ijaarame',
    ti: 'ኣብ ነፍሲ ወከፍ ምዝገባ ዝተሃነጸ ድሕንነት'
  },
  'Protecting citizen information from the field device to the central system.': {
    am: 'የዜጎችን መረጃ ከመስክ መሳሪያ እስከ ማዕከላዊው ስርዓት ድረስ መጠበቅ።',
    om: 'Odeeffannoo lammiilee meeshaa dirree irraa kaasee hanga sirna giddugaleessaatti eeguu.',
    ti: 'ሓበሬታ ዜጋታት ካብ ናይ መሮር መሳርሒ ክሳብ ማእከላይ ስርዓት ምሕላው።'
  },
  'Role-Based Access': {
    am: 'በሚና ላይ የተመሰረተ መዳረሻ',
    om: 'Gahiinsa Gahee Irratti Hundaa\'e',
    ti: 'ኣብ ግደ ዝተመርኮሰ ምብጻሕ'
  },
  'Users only access the information and actions permitted by their assigned role.': {
    am: 'ተጠቃሚዎች በተመደበላቸው ሚና የተፈቀደላቸውን መረጃ እና እርምጃዎችን ብቻ ያገኛሉ።',
    om: 'Fayyadamtoonni odeeffannoo fi tarkaanfiiwwan gahee isaaniitiin heyyamame qofa argatu.',
    ti: 'ተጠቀምቲ ብዝተመደበሎም ግደ ዝተፈቐደሎም ሓበሬታን ስጉምትታትን ጥራይ ይረኽቡ።'
  },
  'Offline records are protected while stored on field devices.': {
    am: 'ከመስመር ውጭ የሆኑ መዝገቦች በመስክ መሳሪያዎች ላይ ተከማችተው ሳሉ ጥበቃ ይደረግላቸዋል።',
    om: 'Galmeewwan toora malee meeshaalee dirree irratti yeroo kuufaman eegumsa qabu.',
    ti: 'ካብ መስመር ወጻኢ ዝኾኑ መዛግብቲ ኣብ ናይ መሮር መሳርሒታት ኣብ ዝዕቀቡሉ እዋን ውሑሳት እዮም።'
  },
  'Activity History': {
    am: 'የእንቅስቃሴ ታሪክ',
    om: 'Seenaa Gochaa',
    ti: 'ናይ ምንቅስቓስ ታሪኽ'
  },
  'Registration and review activities are recorded to provide a clear operational history.': {
    am: 'ግልጽ የአሰራር ታሪክ ለማቅረብ የምዝገባ እና የግምገማ እንቅስቃሴዎች ይመዘገባሉ።',
    om: 'Seenaa hojii ifa ta\'e kennuuf sochiileen galmee fi gamaaggamaa ni galmaa\'u.',
    ti: 'ንጹር ናይ ስርሒት ታሪኽ ንምሃብ ናይ ምዝገባን ግምገማን ምንቅስቓሳት ይምዝገቡ።'
  },
  'Protected Synchronization': {
    am: 'ጥበቃ የተደረገለት ማመሳሰል',
    om: 'Walsimsiisa Eegumsa Qabu',
    ti: 'ዕቁብ ምስምማዕ'
  },
  'Records are securely transferred and validated when synchronized with the central system.': {
    am: 'መዝገቦች ከማዕከላዊው ስርዓት ጋር ሲመሳሰሉ በደህንነት ይተላለፋሉ እንዲሁም ይረጋገጣሉ።',
    om: 'Galmeewwan yeroo sirna giddugaleessaa waliin walsimsiifaman nageenyaan darbu fi ni mirkanaa\'u.',
    ti: 'መዛግብቲ ምስ ማእከላይ ስርዓት ኣብ ዝሰማምዑሉ እዋን ብውሑስ መንገዲ ይተሓላለፉን ይረጋገጹን።'
  },
  'Secure by Design': {
    am: 'በንድፉ ደህንነቱ የተጠበቀ',
    om: 'Dizayiniin Nageenya Qabaachuuf Kan Qophaa\'e',
    ti: 'ብዲዛይን ውሑስ ዝኾነ'
  },
  'FieldSync is designed with privacy, controlled access, secure data handling, and operational accountability at every stage of the registration process.': {
    am: 'FieldSync በምዝገባ ሂደቱ በሙሉ ደረጃዎች ከግላዊነት፣ ቁጥጥር ከተደረገበት መዳረሻ፣ ደህንነቱ ከተጠበቀ የመረጃ አያያዝ እና የአሰራር ተጠያቂነት ጋር የተነደፈ ነው።',
    om: 'FieldSync sadarkaa hundaa adeemsa galmee keessatti icciitii, gahiinsa to\'atame, qabiinsa ragaa nageenya qabu, fi itti gaafatamummaa hojiitiin kan saxaxameedha.',
    ti: 'FieldSync ኣብ ነፍሲ ወከፍ ብርኪ መስርሕ ምዝገባ ምስ ምስጢራውነት፣ ቁጽጽር ዘለዎ ምብጻሕ፣ ውሑስ ኣተሓሕዛ ሓበሬታን ናይ ስርሒት ተሓታትነትን ተነዲፉ እዩ።'
  },

  // 9. Bottom CTA & Footer
  'Ready to Connect Your Field Operations?': {
    am: 'የመስክ ስራዎችዎን ለማገናኘት ዝግጁ ነዎት?',
    om: 'Hojiiwwan Dirree Keessan Walqunnamsiisuuf Qophiidhaa?',
    ti: 'ናይ መሮር ስርሒታትኩም ንምትእስሳር ድሉዋት ዲኹም?'
  },
  'Give your field teams the tools to register citizens securely — online or offline.': {
    am: 'ለመስክ ቡድኖችዎ ዜጎችን በደህንነት የሚመዘግቡባቸውን መሳሪያዎች ይስጡ — በመስመር ላይም ሆነ ከመስመር ውጭ።',
    om: 'Gareewwan dirree keessaniif meeshaalee lammiilee nageenyaan galmeessan kennaaf — toora irratti ykn toora malee.',
    ti: 'ንናይ መሮር ጉጅለታትኩም ዜጋታት ብውሑስ ዝምዝገቡሎም መሳርሒታት ሃቡ — ኣብ መስመር ይኹን ካብ መስመር ወጻኢ።'
  },
  'Enter FieldSync': {
    am: 'ወደ FieldSync ይግቡ',
    om: 'Gara FieldSync Seeni',
    ti: 'ናብ FieldSync እቶ'
  },
  'An offline-first platform designed for secure citizen registration, local data protection, and operational visibility across remote field environments.': {
    am: 'ለደህንነቱ የተጠበቀ የዜጎች ምዝገባ፣ ለአካባቢ መረጃ ጥበቃ እና በሩቅ የመስክ አካባቢዎች ለአሰራር ግልጽነት የተነደፈ ከመስመር ውጭ ቀዳሚ መድረክ።',
    om: 'Waltajjii toora malee duraa kan qophaa\'e galmee lammiilee nageenya qabuuf, eegumsa ragaa bakkaatiif, fi mul\'ata hojii naannoolee dirree fagoo keessatti.',
    ti: 'ንውሑስ ምዝገባ ዜጋታት፣ ንናይ ከባቢ ሓበሬታ ዕቝባን ኣብ ርሑቕ ናይ መሮር ከባቢታት ንናይ ስርሒት ርኡይነትን ዝተነድፈ ካብ መስመር ወጻኢ ቀዳማይ መድረኽ።'
  },
  'Platform': {
    am: 'መድረክ',
    om: 'Waltajjii',
    ti: 'መድረኽ'
  },
  'Key Features': {
    am: 'ቁልፍ ባህሪያት',
    om: 'Amaloota Ijoo',
    ti: 'ቀንዲ ባህርያት'
  },
  'User Roles': {
    am: 'የተጠቃሚ ሚናዎች',
    om: 'Gahee Fayyadamtootaa',
    ti: 'ናይ ተጠቀምቲ ግደታት'
  },
  'Field Operations': {
    am: 'የመስክ ስራዎች',
    om: 'Hojiiwwan Dirree',
    ti: 'ናይ መሮር ስርሒታት'
  },
  'Portals': {
    am: 'ፖርታሎች',
    om: 'Poortaalota',
    ti: 'ፖርታላት'
  },
  'Field Officer Portal': {
    am: 'የመስክ መኮንን ፖርታል',
    om: 'Poortaalii Oofisara Dirree',
    ti: 'ናይ መሮር መኮንን ፖርታል'
  },
  'Zonal Supervisor Portal': {
    am: 'የዞን ተቆጣጣሪ ፖርታል',
    om: 'Poortaalii To\'ataa Zoonii',
    ti: 'ናይ ዞባ ተቆጻጻሪ ፖርታል'
  },
  'National Manager Portal': {
    am: 'የብሔራዊ ስራ አስኪያጅ ፖርታል',
    om: 'Poortaalii Manejara Biyyooleessaa',
    ti: 'ናይ ብሔራዊ መካየዲ ፖርታል'
  },
  'Security & Data': {
    am: 'ደህንነት እና መረጃ',
    om: 'Nageenya & Ragaa',
    ti: 'ድሕንነትን ሓበሬታን'
  },
  '© 2026 FieldSync. National Citizen Registration & Field Operations Platform.': {
    am: '© 2026 FieldSync. ብሔራዊ የዜጎች ምዝገባ እና የመስክ ስራዎች መድረክ።',
    om: '© 2026 FieldSync. Waltajjii Galmee Lammiilee Biyyooleessaa & Hojiiwwan Dirree.',
    ti: '© 2026 FieldSync. ብሔራዊ ምዝገባ ዜጋታትን መድረኽ ናይ መሮር ስርሒታትን።'
  }
};

let content = fs.readFileSync(dictPath, 'utf8');

// Find last closing bracket
const lastClosing = content.lastIndexOf('};');
if (lastClosing === -1) {
  console.error("Couldn't find closing bracket }; in dictionary");
  process.exit(1);
}

const entriesCode = Object.entries(newEntries).map(([key, trans]) => {
  return `  ${JSON.stringify(key)}: {\n    am: ${JSON.stringify(trans.am)},\n    om: ${JSON.stringify(trans.om)},\n    ti: ${JSON.stringify(trans.ti)}\n  },`;
}).join('\n');

const newContent = content.slice(0, lastClosing) + '\n' + entriesCode + '\n' + content.slice(lastClosing);
fs.writeFileSync(dictPath, newContent, 'utf8');
console.log('Appended', Object.keys(newEntries).length, 'new entries to dictionary.');
