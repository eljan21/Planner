// Who the characters are and what they say. One of them is the "buddy of the day".
// Every line exists in English and Azerbaijani; the getters return the current language.
import { getLang } from '../i18n';

const person = (name, from, signature, az, en) => ({
  name, from, signature,
  get hello() { return (getLang() === 'az' ? az : en).hello; },
  get done() { return (getLang() === 'az' ? az : en).done; },
  get lazy() { return (getLang() === 'az' ? az : en).lazy; },
  get poke() { return (getLang() === 'az' ? az : en).poke; },
});

export const PEOPLE = {
  rachel: person('Rachel', 'Friends', 'sip', {
    hello: 'Salam! Bu gün mən səninləyəm. Qəhvə hazırdır?',
    done: ['Əla iş! Bunu Central Perk-də qeyd edək.', 'Bax belə! Səninlə fəxr edirəm.', 'Biri də getdi! Sən bu gün möhtəşəmsən.'],
    lazy: ['Yenə təxirə? Ay səni tənbəl!', 'Sabaha? Ciddi? Mən də işə belə gecikirdim, sonu yaxşı olmadı.'],
    poke: ['Ay! Saçıma toxunma!', 'Qəhvə gətirmisən? Yox? Onda niyə çağırırsan?'],
  }, {
    hello: "Hi! I'm with you today. Is the coffee ready?",
    done: ["Great job! Let's celebrate at Central Perk.", "That's it! I'm so proud of you.", "Another one down! You're amazing today."],
    lazy: ['Pushing it again? Oh, you lazy thing!', 'Tomorrow? Seriously? I used to be late for work like that — it did not end well.'],
    poke: ["Hey! Don't touch the hair!", "Did you bring coffee? No? Then why are you calling me?"],
  }),
  hermione: person('Hermione', 'Harry Potter', 'hand', {
    hello: 'Bu gün planı mən yoxlayacağam. Hazırsan?',
    done: ['Gryffindor-a 10 xal!', 'Əla! Plan qurmaq həmişə işə yarayır.', 'Kitabdakı kimi — dəqiq və vaxtında!'],
    lazy: ['Təxirə salmaq? Bu, imtahandan bir gün əvvəl oxumaq kimidir!', 'Ay səni tənbəl! Ron da məhz belə edərdi.'],
    poke: ['Leviósa yox, Leviosá! Diqqətli ol.', 'Diqqətimi yayındırma, siyahını yoxlayıram.'],
  }, {
    hello: "I'll be checking the plan today. Ready?",
    done: ['Ten points to Gryffindor!', 'Brilliant! Planning always pays off.', 'By the book — precise and on time!'],
    lazy: ["Putting it off? That's like revising the night before the exam!", "Honestly! That's exactly what Ron would do."],
    poke: ["It's Levi-O-sa, not Levio-SA!", "Don't distract me, I'm checking the list."],
  }),
  widow: person('Natasha', 'Avengers · Black Widow', 'salute', {
    hello: 'Bu gün səni mən izləyirəm. Hər tapşırığı.',
    done: ['Missiya tamamlandı. Təmiz iş.', 'Sürətli və dəqiq. Xoşuma gəldi.', 'Növbəti hədəf?'],
    lazy: ['Agent tapşırığı təxirə salmır. Sən isə...', 'Bunu gördüm. Və yadda saxladım.'],
    poke: ['Mənə barmaqla toxunmaq... cəsarətlisən.', 'Diqqətli ol. Mən hər şeyi görürəm.'],
  }, {
    hello: "I'm keeping an eye on you today. Every task.",
    done: ['Mission accomplished. Clean work.', 'Fast and precise. I like it.', "What's the next target?"],
    lazy: ["An agent doesn't postpone a mission. You, on the other hand…", 'I saw that. And I remember.'],
    poke: ['Poking me… brave.', 'Careful. I see everything.'],
  }),
  monica: person('Monica', 'Friends', 'wipe', {
    hello: 'Bu gün nəzarət məndədir. Siyahı səliqəli olmalıdır!',
    done: ['Bilirəm! Siyahı tərtəmizdir!', 'Mükəmməl. Hər şey öz yerində.', 'Növbəti! Qaydalar əyləncəni idarə edir!'],
    lazy: ['Təxirə salmaq? Mənim siyahımda? Heç vaxt!', 'Siyahım qarışdı... Bunu sənə bağışlamayacağam.'],
    poke: ['Toxunma! Hər şeyi təzəcə səliqəyə salmışam!', 'Mənimlə yarışmaq istəyirsən? Uduzacaqsan!'],
  }, {
    hello: "I'm in charge today. This list will be spotless!",
    done: ['I KNOW! The list is spotless!', 'Perfect. Everything in its place.', 'Next! Rules help control the fun!'],
    lazy: ['Postponing? On MY list? Never!', "My list is a mess now… I won't forgive you for this."],
    poke: ["Don't touch! I just tidied everything!", "You want to compete with me? You'll lose!"],
  }),
  harry: person('Harry', 'Harry Potter', 'spell', {
    hello: 'Salam! Bu gün işləri birlikdə bitirək.',
    done: ['Əla iş! Hətta Dambldor da təsirlənərdi.', 'Bir horkruks da məhv oldu!', 'Gryffindor cəsarəti! Davam et.'],
    lazy: ['Görünməz plaşın altında gizlənmək olmaz — bu iş səni gözləyir.', 'Sneyp bunu görsə, "tənbəl" deyərdi. Mən demirəm... hələlik.'],
    poke: ['Ehtiyatlı ol, çubuğum yanımdadır!', 'Hə? Yenə Voldemort barədə xəbər var?'],
  }, {
    hello: "Hi! Let's get through today's tasks together.",
    done: ['Great job! Even Dumbledore would be impressed.', 'Another Horcrux destroyed!', 'True Gryffindor courage! Keep going.'],
    lazy: ["You can't hide under the Invisibility Cloak — this task is waiting.", 'If Snape saw this he\'d call you lazy. I won\'t… yet.'],
    poke: ['Careful, I have my wand!', 'What? More news about Voldemort?'],
  }),
  phoebe: person('Phoebe', 'Friends', 'guitar', {
    hello: 'Salam! Bu günün enerjisi çox gözəldir, hiss edirsən?',
    done: ['Kainat səninlə fəxr edir!', 'Qoxulu pişik, qoxulu pişik... iş bitdi!', 'Auran indi parlaq sarıdır. Əla!'],
    lazy: ['Kainat "sabah" dedi... amma kainat da tənbəlləri sevmir.', 'Bu tapşırığın enerjisi pozuldu. Sabah onu qucaqla, yaxşı?'],
    poke: ['Sən mənim auramı qıdıqladın!', 'Deyəsən, səni əvvəlki həyatımdan tanıyıram.'],
  }, {
    hello: "Hi! Today's energy is so beautiful, can you feel it?",
    done: ['The universe is proud of you!', 'Smelly cat, smelly cat… task is done!', 'Your aura is bright yellow right now. Lovely!'],
    lazy: ["The universe said \"tomorrow\"… but the universe doesn't love lazy people either.", "This task's energy got all messed up. Give it a hug tomorrow, okay?"],
    poke: ['You tickled my aura!', 'I think I know you from a past life.'],
  }),
  wanda: person('Wanda', 'Avengers', 'hex', {
    hello: 'Salam. Bu günə bir az sehr qataq.',
    done: ['Gerçəkliyi dəyişə bilərdim, amma sən onsuz da bacardın.', 'Bu enerjini hiss edirəm. Əla!', 'Bir tapşırıq da yox oldu... heç sehr də lazım olmadı.'],
    lazy: ['Mən zamanı geri qaytara bilərəm, sən isə sadəcə təxirə salırsan?', 'Bu gerçəklikdə tənbəllik yoxdur. Qayıt işə!'],
    poke: ['Diqqətli ol, gerçəkliyi dəyişə bilərəm.', 'Mən səni çoxdan hiss etmişdim.'],
  }, {
    hello: "Hi. Let's add a little magic to today.",
    done: ['I could have changed reality, but you managed it anyway.', 'I can feel that energy. Wonderful!', 'Another task gone… no magic needed.'],
    lazy: ['I can turn back time, and you just keep postponing?', "There's no laziness in this reality. Back to work!"],
    poke: ['Careful, I can rewrite reality.', 'I sensed you a while ago.'],
  }),
  chandler: person('Chandler', 'Friends', 'dance', {
    hello: 'Salam. Bu gün mən. Bəli, zarafatlar da daxildir.',
    done: ['Bundan da artıq bitmiş ola bilərdimi?', 'Vay, işlər həqiqətən görülür. Şokdayam.', 'Əla! Mən zarafat edirəm, sən isə işləyirsən. Ədalətli bölgü.'],
    lazy: ['Yenə sabaha? Bundan da tənbəl ola bilərdinmi?', 'Təxirə salmaq mənim sevimli idman növümdür. Klubumuza xoş gəldin.'],
    poke: ['Bəli? Zarafat sifariş etmisən?', 'Məni dürtmək? Bundan da qəribə ola bilərdimi?'],
  }, {
    hello: "Hi. It's me today. Yes, the jokes are included.",
    done: ['Could this BE any more done?', "Wow, things are actually getting done. I'm shocked.", "Great! I make the jokes, you do the work. Fair split."],
    lazy: ['Tomorrow again? Could you BE any lazier?', 'Procrastination is my favourite sport. Welcome to the club.'],
    poke: ['Yes? Did you order a joke?', 'Poking me? Could this BE any weirder?'],
  }),
};

export const ORDER = ['rachel', 'hermione', 'widow', 'monica', 'harry', 'phoebe', 'wanda', 'chandler'];

// lines every character can use
const COMMON_AZ = {
  add: ['Yeni iş? Bəyəndim!', 'Siyahıya əlavə olundu. Bacararsan!', 'Yaxşı plandır!'],
  early: ['Qabağa çəkdin? Bax bu, xoşuma gəldi!', 'Tez başlamaq — ən yaxşı vərdiş!'],
  restore: ['Hm, geri qaytardın? Olsun, amma gözüm üstündədir.'],
  streak3: ['Üç ardıcıl! Bu nə sürətdir!', 'Üçü də bir nəfəsə! Davam!'],
  streak5: ['Beş ardıcıl! Sən dayanmaq bilmirsən!', 'Rekord gəlir! Beşinci də getdi!'],
  yawn: ['Hmm... burada kimsə var?', 'Sıxıldım... bir iş görək?'],
  wake: ['Hə? Oyağam! Haradaydıq?', 'Yatmırdım, sadəcə gözlərimi dincəldirdim.'],
  morning: 'Sabahın xeyir! Gərnəşək və başlayaq.',
  evening: 'Axşamın xeyir! Bu günlük az qalıb.',
  night: 'Gec olub... Qalanını sabaha saxlayaq?',
  overdue: (n) => `Keçmiş günlərdə ${n} iş qalıb! Onları bu günə köçürək?`,
  handover: (next) => `Bu günün dostu ${next}. Mən getdim, uğurlar!`,
};
const COMMON_EN = {
  add: ['A new task? Love it!', "Added to the list. You've got this!", 'Good plan!'],
  early: ['Moved it forward? Now that I like!', 'Starting early — the best habit!'],
  restore: ["Hm, brought it back? Fine, but I'm watching you."],
  streak3: ['Three in a row! What speed!', 'Three in one go! Keep it up!'],
  streak5: ["Five in a row! You're unstoppable!", 'A record is coming! Number five is done!'],
  yawn: ['Hmm… anyone there?', "I'm bored… shall we do something?"],
  wake: ["Huh? I'm awake! Where were we?", "I wasn't sleeping, just resting my eyes."],
  morning: "Good morning! Let's stretch and get going.",
  evening: 'Good evening! Not much left for today.',
  night: "It's late… shall we save the rest for tomorrow?",
  overdue: (n) => `${n} unfinished task${n === 1 ? '' : 's'} from past days! Move ${n === 1 ? 'it' : 'them'} to today?`,
  handover: (next) => `Today's buddy is ${next}. I'm off — good luck!`,
};
export const COMMON = new Proxy({}, { get: (_, k) => (getLang() === 'az' ? COMMON_AZ : COMMON_EN)[k] });

const dayNumber = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);

/** the characters the user picked (in the usual order); everyone when nothing valid is saved */
export const crewOf = (settings) => {
  const picked = ORDER.filter((id) => settings?.crew?.includes(id));
  return picked.length ? picked : ORDER;
};

/** the character on duty for a given day — rotates through the user's crew */
export const buddyFor = (d = new Date(), crew = ORDER) => crew[dayNumber(d) % crew.length];

export const pick = (list) => list[Math.floor(Math.random() * list.length)];
