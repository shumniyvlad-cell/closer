/* Теплее: страница нагревается при прокрутке, в первом экране идёт созвон с подсказками. */
(() => {
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;

  /* ---------- Движение: уважать системную настройку, но дать включить флагом ?motion=1 ---------- */
  const params = new URLSearchParams(location.search);
  try {
    if (params.get('motion') === '1') localStorage.setItem('teplee-motion', '1');
    if (params.get('motion') === '0') localStorage.removeItem('teplee-motion');
  } catch (e) { /* хранилище недоступно: работаем без запоминания */ }
  let forced = false;
  try { forced = localStorage.getItem('teplee-motion') === '1'; } catch (e) { forced = params.get('motion') === '1'; }
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches && !forced;

  /* ---------- Температура страницы ---------- */
  const COLD_TO_HOT = ['#CBDDF0', '#DDDDEA', '#F2DAD2', '#FFC7A1', '#FF9A66', '#FF5A2E'].map(hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
  const WORDS = ['холодно', 'холодно', 'теплее', 'теплее', 'жарко', 'горячо'];
  const steps = [...document.querySelectorAll('.step')];
  const segs = [...document.querySelectorAll('.scale a')];
  const theme = document.querySelector('meta[name="theme-color"]');
  const temp = $('temp');

  function heat() {
    // Точка отсчёта — чуть ниже шапки: какой шаг сейчас «под глазами» и насколько он пройден.
    const probe = innerHeight * 0.42;
    let pos = 0;
    steps.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.top <= probe) pos = i + Math.min(1, Math.max(0, (probe - r.top) / r.height));
    });
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    if (atEnd) pos = steps.length;
    const f = Math.min(steps.length - 1, Math.max(0, pos - 0.5));   // цвет меняется к середине шага
    const a = Math.floor(f), b = Math.min(steps.length - 1, a + 1), k = f - a;
    const mix = COLD_TO_HOT[a].map((v, i) => Math.round(v + (COLD_TO_HOT[b][i] - v) * k));
    const color = `rgb(${mix.join(' ')})`;
    root.style.setProperty('--bg', color);
    root.style.setProperty('--t', (pos / steps.length).toFixed(3));
    if (theme) theme.content = color;
    const current = Math.min(steps.length - 1, Math.floor(pos));
    segs.forEach((s, i) => {
      s.style.setProperty('--fill', Math.min(1, Math.max(0, pos - i)).toFixed(3));
      if (i === current) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
    });
    temp.textContent = WORDS[current];
  }
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { heat(); ticking = false; });
  }, { passive: true });
  addEventListener('resize', heat);
  heat();

  /* ---------- Созвон в первом экране ---------- */
  const STAGES = ['Задача', 'Цифры', 'Срок и бюджет', 'Предложение', 'Цена', 'Шаг'];
  const TAGS = { ask: 'Спроси', say: 'Скажи', fact: 'Факт', close: 'Закрывай' };

  // Реплики и подсказки взяты из настоящих прогонов Теплее на пробном созвоне.
  const CALL = [
    { who: 'k', text: 'Привет! У меня блог про недвижимость в Сочи, двенадцать тысяч подписчиков. А заявок две-три в месяц.' },
    { stage: 1, missing: ['цифра', 'срок'], tag: 'ask', hint: 'А что уже пробовала, чтобы заявок стало больше?' },
    { who: 'me', text: 'А что уже пробовала, чтобы заявок стало больше?' },
    { who: 'k', text: 'Снимаю рилсы сама, раз в неделю. Со сделки у меня выходит около трёхсот тысяч.' },
    { stage: 2, missing: ['срок'], tag: 'ask', hint: 'К какому сроку хочешь выйти на стабильные заявки?' },
    { who: 'me', text: 'К какому сроку хочешь выйти на стабильные заявки?' },
    { who: 'k', text: 'К весне. Сезон начинается в марте.' },
    { stage: 3, missing: [], tag: 'say', hint: 'Смотри, что я услышал: рилсы есть, а шагнуть человеку некуда. Вот как я это убираю.' },
    { who: 'me', text: 'Смотри, что я услышал: рилсы есть, а шагнуть человеку некуда. Вот как я это убираю…' },
    { who: 'k', text: 'Звучит хорошо. А сколько это стоит? Мне кажется, будет дорого.' },
    { stage: 5, missing: [], tag: 'fact', hint: 'Первый месяц 40 000 и 15% с продаж. Одна её сделка — 300 тысяч.' },
    { who: 'me', text: 'Первый месяц сорок тысяч и пятнадцать процентов с продаж. Одна твоя сделка это окупает.' },
    { who: 'k', text: 'Ну да, одна сделка окупает. А когда можно начать?' },
    { stage: 6, missing: [], tag: 'close', hint: 'Давай выберем день на этой неделе, ссылку на оплату пришлю сейчас.' },
  ];

  const REPLIES = {
    think:     [{ who: 'k', text: 'Мне надо подумать.' }, { stage: 6, missing: [], tag: 'ask', hint: 'Что осталось непонятным? И до какого числа дашь ответ?' }],
    guarantee: [{ who: 'k', text: 'А гарантии какие-то есть?' }, { stage: 5, missing: [], tag: 'say', hint: 'Гарантий дохода не даю. Скажу, что будет сделано и к какому сроку.' }],
    price:     [{ who: 'k', text: 'Слушай, это дорого.' }, { stage: 5, missing: [], tag: 'say', hint: 'Одна сделка у тебя 300 тысяч. Настройка окупается с первой.' }],
    weather:   [{ who: 'k', text: 'Кстати, а как у вас там погода? У нас в Сочи третий день льёт.' }, { stage: 6, cold: true, missing: [], tag: 'say', hint: 'Давай вернёмся: какой день на этой неделе ставим?' }],
  };

  const el = {
    capWho: $('capWho'), capText: $('capText'), tileK: $('tileK'), tileMe: $('tileMe'),
    lvK: $('lvK'), lvMe: $('lvMe'), timer: $('timer'),
    scale: $('pScale'), segs: [...document.querySelectorAll('.p-segs i')], stage: $('pStage'), miss: $('pMiss'),
    tag: $('pTag'), text: $('pText'), foot: $('pFoot'),
    play: $('play'), replies: [...document.querySelectorAll('[data-reply]')],
  };

  let run = 0;          // номер текущего проигрывания: новое отменяет старое
  let seconds = 0;
  let footer = [];
  let clock = null;

  const wait = (ms, id) => new Promise((ok, no) => setTimeout(() => (id === run ? ok() : no('cancel')), ms));

  function setStatus(s) {
    el.segs.forEach((seg, i) => {
      seg.classList.toggle('on', i < s.stage);
      seg.classList.toggle('now', i === s.stage - 1);
    });
    el.scale.classList.toggle('cold', !!s.cold);
    el.stage.textContent = `${s.stage}/6 ${STAGES[s.stage - 1]}`;
    el.miss.className = '';
    if (s.cold) { el.miss.textContent = 'холоднее: уходишь от продажи'; el.miss.className = 'cold'; }
    else if (s.stage <= 3 && s.missing.length === 0) { el.miss.textContent = 'ПОРА ПРЕДЛАГАТЬ'; el.miss.className = 'go'; }
    else if (s.stage <= 3) el.miss.textContent = 'до предложения: ' + s.missing.join(', ');
    else el.miss.textContent = s.stage === 6 ? 'горячо' : 'теплее';
  }

  // Короткие слова не должны повисать в конце строки подсказки.
  const glue = (t) => t.replace(/(^|\s)(в|во|с|со|к|у|о|и|а|но|не|на|по|за|из|до|от|для|что|как)\s/gi, '$1$2\u00a0');

  function setHint(tag, text) {
    text = glue(text);
    el.tag.hidden = false;
    el.tag.className = 'chip chip-' + tag;
    el.tag.textContent = TAGS[tag];
    el.text.className = '';
    el.text.textContent = text;
  }

  function pushFooter(who, text) {
    footer.push({ who, text });
    footer = footer.slice(-2);
    el.foot.replaceChildren();
    footer.forEach(row => {
      const p = document.createElement('p');
      if (row.who === 'me') p.className = 'me';
      const b = document.createElement('b');
      b.textContent = row.who === 'me' ? 'Я' : 'К';
      const tail = row.text.length > 62 ? '…' + row.text.slice(-60) : row.text;
      p.append(b, document.createTextNode(tail));
      el.foot.append(p);
    });
  }

  function level(node, v) { node.style.setProperty('--lv', v); }

  async function speak(who, text, id, instant) {
    const tile = who === 'k' ? el.tileK : el.tileMe;
    const meter = who === 'k' ? el.lvK : el.lvMe;
    el.capWho.textContent = who === 'k' ? 'Вика' : 'Ты';
    if (instant) { el.capText.textContent = text; pushFooter(who, text); return; }
    tile.classList.add('talk');
    el.capText.textContent = '';
    const words = text.split(' ');
    try {
      for (let i = 0; i < words.length; i++) {
        el.capText.textContent += (i ? ' ' : '') + words[i];
        level(meter, (0.35 + Math.random() * 0.6).toFixed(2));
        await wait(95 + words[i].length * 22, id);
      }
    } finally {
      level(meter, 0.06);
      tile.classList.remove('talk');
    }
    pushFooter(who, text);
  }

  async function playEvents(events, id, instant) {
    for (const ev of events) {
      if (ev.who) {
        await speak(ev.who, ev.text, id, instant);
        if (!instant) await wait(ev.who === 'k' ? 650 : 450, id);
      } else {
        if (!instant) { el.text.className = 'p-wait'; el.tag.hidden = true; el.text.textContent = 'Думаю…'; await wait(900, id); }
        setStatus(ev);
        setHint(ev.tag, ev.hint);
        if (!instant) await wait(1500, id);
      }
    }
  }

  function reset() {
    footer = [];
    seconds = 0;
    el.capWho.textContent = ''; el.capText.textContent = '';
    el.foot.replaceChildren();
    el.tag.hidden = true;
    el.text.className = 'p-wait'; el.text.textContent = 'Слушаю…';
    setStatus({ stage: 1, missing: ['задача', 'цифра', 'срок'] });
    el.timer.textContent = '00:00';
    el.replies.forEach(b => { b.disabled = true; b.setAttribute('aria-pressed', 'false'); });
  }

  function startClock(id) {
    clearInterval(clock);
    clock = setInterval(() => {
      if (id !== run) return clearInterval(clock);
      seconds += 7;   // созвон на двенадцать минут умещается в полминуты
      el.timer.textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
    }, 400);
  }

  async function playCall(instant) {
    const id = ++run;
    reset();
    el.play.textContent = instant ? 'Проиграть созвон' : 'Сначала';
    if (!instant) startClock(id);
    try {
      await playEvents(CALL, id, instant);
    } catch (e) { return; }
    clearInterval(clock);
    if (instant) el.timer.textContent = '12:17';
    el.replies.forEach(b => { b.disabled = false; });
  }

  async function reply(key, button) {
    const id = ++run;
    clearInterval(clock);
    el.replies.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    try {
      await playEvents(REPLIES[key], id, false);
    } catch (e) { /* нажали другой ответ: этот отменён */ }
  }

  el.play.addEventListener('click', () => {
    $('demo').scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
    playCall(false);
  });
  el.replies.forEach(b => b.addEventListener('click', () => reply(b.dataset.reply, b)));

  if (calm) {
    // Движение выключено в системе: показываем итог созвона, проиграть можно кнопкой.
    playCall(true);
  } else {
    reset();
    const seen = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { seen.disconnect(); playCall(false); }
    }, { threshold: 0.45 });
    seen.observe($('demo'));
  }
})();
