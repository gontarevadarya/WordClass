// Небольшой набор эмодзи для карточек со словами. Любой другой эмодзи можно вставить вручную.
const RAW_GROUPS = [
  ['Еда', '🍎🍌🍇🍓🍉🍊🍋🍍🥭🍑🍒🥝🍅🥕🌽🥔🥦🍞🥐🧀🥚🥓🍔🍕🌭🍟🍝🍜🍣🍰🎂🍪🍫🍦🍩🥛☕🍵🧃🥤'],
  ['Животные', '🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🦆🦉🐴🦄🐝🦋🐢🐍🐟🐬🐳🦈🐙🐘🦒🦓🐑🐄'],
  ['Предметы', '📚✏️📖🎒✂️📏🖊️💻📱⌚🔑🚪🪑🛏️🛋️💡🕯️🧸🎈🎁⚽🏀🎸🎹🎨📷🔔🧳☂️👓'],
  ['Одежда', '👕👖👗👟👠🧢🎩🧥🧦🧤🧣👜👔🩳'],
  ['Транспорт', '🚗🚕🚌🚎🚓🚑🚒🚲🛵🏍️🚆🚂✈️🚀🚁⛵🚢🚜'],
  ['Природа и места', '☀️🌙⭐☁️🌧️❄️⛄🌈🔥💧🌳🌲🌸🌻🌹🍁⛰️🏖️🏠🏫🏥🏰🌍'],
  ['Люди и эмоции', '😀😂😍😢😡😴😮🤔👨👩👦👧👶👵👴👮👋👍👏🙏💪👀👂👃👄🖐️🦷'],
];

function splitGraphemes(str) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(str), (s) => s.segment).filter(
      (g) => g.trim()
    );
  }
  return Array.from(str).filter((g) => g.trim());
}

export const EMOJI_GROUPS = RAW_GROUPS.map(([title, str]) => ({ title, items: splitGraphemes(str) }));

// Берём из введённой строки первый эмодзи/символ целиком.
export function firstGrapheme(str) {
  const g = splitGraphemes((str || '').trim());
  return g[0] || '';
}
