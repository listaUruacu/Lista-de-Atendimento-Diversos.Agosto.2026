(function () {
  'use strict';

  const events = window.EVENTS.slice().sort((a, b) =>
    a.date.localeCompare(b.date) || (a.time || '99:99').localeCompare(b.time || '99:99')
  );
  events.forEach((event, index) => { event.id = index; });
  const roleConfig = {
    elder: { singular: 'ancião', plural: 'anciães', heading: 'AGENDA DO ANCIÃO', article: 'um', selection: 'um dos', none: 'Nenhum', named: 'nomeado', identified: 'identificado', found: 'encontrados', of: 'do', icon: '♙' },
    worker: { singular: 'encarregado', plural: 'encarregados', heading: 'AGENDA DO ENCARREGADO', article: 'um', selection: 'um dos', none: 'Nenhum', named: 'nomeado', identified: 'identificado', found: 'encontrados', of: 'do', icon: '♧' },
    deacon: { singular: 'diácono', plural: 'diáconos', heading: 'AGENDA DO DIÁCONO', article: 'um', selection: 'um dos', none: 'Nenhum', named: 'nomeado', identified: 'identificado', found: 'encontrados', of: 'do', icon: '♢' },
    examiner: { singular: 'examinadora', plural: 'examinadoras', heading: 'AGENDA DA EXAMINADORA', article: 'uma', selection: 'uma das', none: 'Nenhuma', named: 'nomeada', identified: 'identificada', found: 'encontradas', of: 'da', icon: '♪' }
  };
  const dateForm = document.querySelector('#date-form');
  const personForm = document.querySelector('#person-form');
  const cityForm = document.querySelector('#city-form');
  const subjectForm = document.querySelector('#subject-form');
  const keywordForm = document.querySelector('#keyword-form');
  const dateInput = document.querySelector('#event-date');
  const personSelect = document.querySelector('#person-name');
  const citySelect = document.querySelector('#city-name');
  const subjectList = document.querySelector('#subject-list');
  const keywordInput = document.querySelector('#keyword-search');
  const personLabel = document.querySelector('#person-label');
  const personSubmit = personForm.querySelector('button[type="submit"]');
  const dateActions = document.querySelector('#date-actions');
  const results = document.querySelector('#results');
  const total = document.querySelector('#event-total');
  let currentMode = 'subject';

  total.textContent = events.length;

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12);
  }

  function toInputDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDate(value, long = true) {
    const date = parseDate(value);
    if (!date) return value;
    return new Intl.DateTimeFormat('pt-BR', long
      ? { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: '2-digit' }
    ).format(date);
  }

  function formatWeekday(value) {
    const date = parseDate(value);
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
      .format(date)
      .toLocaleUpperCase('pt-BR');
  }

  function titleCaseFirst(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function normalizeText(value) {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  }

  function searchableEvent(event) {
    return normalizeText([
      event.category,
      event.location,
      event.detail,
      event.date,
      formatDate(event.date),
      formatWeekday(event.date),
      event.time
    ].join(' '));
  }

  function extractNames(detail, mode) {
    const patterns = {
      elder: /(?:Ancião|Anc\.)\s*:?\s*([^;—]+)/giu,
      worker: /Encs?\.\s*:?\s*([^;—]+)/giu,
      deacon: /(?:Diác\.?|Diácono)\s*:\s*([^;—]+)/giu,
      examiner: /\bExam(?:\.|:)\s*([^;—]+)/giu
    };
    const names = [];
    let match;
    const pattern = patterns[mode];
    if (!pattern) return names;
    while ((match = pattern.exec(detail)) !== null) {
      match[1].split(/,|\se\s/iu).forEach(value => {
        const name = value.trim().replace(/[.,]+$/, '');
        if (name && !names.includes(name)) names.push(name);
      });
    }
    return names;
  }

  function cityFor(event) {
    const location = event.location.trim();
    if (location.toLocaleLowerCase('pt-BR').startsWith('todas as congregações')) return null;
    if (location.toLocaleLowerCase('pt-BR') === 'online') return 'Online';
    return location.split(' - ')[0].trim();
  }

  const namesByRole = Object.fromEntries(Object.keys(roleConfig).map(mode => [
    mode,
    [...new Set(events.flatMap(event => extractNames(event.detail, mode)))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  ]));
  const cities = [...new Set(events.map(cityFor).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const subjectOrder = [
    'Batismos',
    'Reuniões para mocidade',
    'Ensaios regionais',
    'Assuntos musicais',
    'Reuniões diversas',
    'Viagens missionárias',
    'Avisos à irmandade',
    'Santas ceias'
  ];
  const subjects = subjectOrder.filter(subject => events.some(event => event.category === subject));

  cities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });

  subjects.forEach(subject => {
    const count = events.filter(event => event.category === subject).length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'subject-button';
    button.dataset.subject = subject;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<span>${escapeHtml(subject)}</span><strong>${count}</strong>`;
    subjectList.appendChild(button);
  });

  function fillPersonOptions(mode, selected = '') {
    const config = roleConfig[mode];
    const names = namesByRole[mode];
    personSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = names.length
      ? `Selecione ${config.article} ${config.singular}`
      : `${config.none} ${config.singular} ${config.identified} neste documento`;
    personSelect.appendChild(placeholder);
    names.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      personSelect.appendChild(option);
    });
    personSelect.value = names.includes(selected) ? selected : '';
    personSubmit.disabled = names.length === 0;
  }

  function eventCard(event) {
    const weekday = formatWeekday(event.date);
    const shortDate = formatDate(event.date, false);
    const timeLabel = event.time ? `${event.time} h` : 'sem horário';
    return `
      <article class="event-card">
        <div class="event-time"><span class="event-weekday">${escapeHtml(weekday)}</span><strong>${escapeHtml(shortDate)}</strong><span>${escapeHtml(timeLabel)}</span></div>
        <div class="event-content">
          <span class="event-category">${escapeHtml(event.category)}</span>
          <h3>${escapeHtml(event.location)}</h3>
          <div class="event-meta"><p><strong>Informações:</strong> ${escapeHtml(event.detail)}</p></div>
          <div class="event-actions">
            <button type="button" class="event-action" data-action="calendar" data-id="${event.id}"><span aria-hidden="true">⇩</span> Adicionar ao calendário</button>
            <button type="button" class="event-action" data-action="share" data-id="${event.id}"><span aria-hidden="true">↗</span> Compartilhar</button>
          </div>
        </div>
      </article>`;
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function icsEscape(value) {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  function icsTimestampNow() {
    const now = new Date();
    return `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;
  }

  function buildIcs(event) {
    const [year, month, day] = event.date.split('-');
    const summary = `${event.category} — ${event.location}`;
    let dtStartLine, dtEndLine;

    if (event.time && /^\d{2}:\d{2}$/.test(event.time)) {
      const [hour, minute] = event.time.split(':').map(Number);
      const start = new Date(Number(year), Number(month) - 1, Number(day), hour, minute);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const stamp = date => `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(date.getHours())}${pad2(date.getMinutes())}00`;
      dtStartLine = `DTSTART:${stamp(start)}`;
      dtEndLine = `DTEND:${stamp(end)}`;
    } else {
      const start = parseDate(event.date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const stamp = date => `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
      dtStartLine = `DTSTART;VALUE=DATE:${stamp(start)}`;
      dtEndLine = `DTEND;VALUE=DATE:${stamp(end)}`;
    }

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Agenda Regional Uruacu//PT-BR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:atendimento-${event.id}@agenda-uruacu`,
      `DTSTAMP:${icsTimestampNow()}`,
      dtStartLine,
      dtEndLine,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(event.detail)}`,
      `LOCATION:${icsEscape(event.location)}`,
      'END:VEVENT',
      'END:VCALENDAR',
      ''
    ].join('\r\n');
  }

  function downloadIcs(event) {
    const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atendimento-${event.date}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function shareText(event) {
    const readableDate = titleCaseFirst(formatDate(event.date));
    const timeLabel = event.time ? ` às ${event.time}` : '';
    return `${event.category} — ${event.location}\n${readableDate}${timeLabel}\n${event.detail}`;
  }

  async function shareEvent(event) {
    const text = shareText(event);
    if (navigator.share) {
      try {
        await navigator.share({ title: event.category, text });
      } catch (_) {
        // Usuário cancelou o compartilhamento.
      }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  function setUrlFilter(mode, value) {
    const url = new URL(window.location.href);
    ['data', 'pessoa', 'funcao', 'cidade', 'assunto', 'busca', 'avisos'].forEach(param => url.searchParams.delete(param));
    if (mode === 'date' && value) url.searchParams.set('data', value);
    if (roleConfig[mode] && value) {
      url.searchParams.set('funcao', mode);
      url.searchParams.set('pessoa', value);
    }
    if (mode === 'city' && value) url.searchParams.set('cidade', value);
    if (mode === 'subject' && value) url.searchParams.set('assunto', value);
    if (mode === 'search' && value) url.searchParams.set('busca', value);
    if (mode === 'notice' && value) url.searchParams.set('avisos', '1');
    try {
      history.replaceState(null, '', url);
    } catch (_) {
      // Alguns navegadores restringem o histórico quando o app abre por arquivo local.
    }
  }

  function setMode(mode, render = true, selected = '') {
    currentMode = mode === 'date' || mode === 'city' || mode === 'subject' || mode === 'notice' || roleConfig[mode] ? mode : 'date';
    const isDate = currentMode === 'date';
    const isCity = currentMode === 'city';
    const isSubject = currentMode === 'subject';
    const isPerson = Boolean(roleConfig[currentMode]);
    dateForm.hidden = !isDate;
    dateActions.hidden = !isDate;
    personForm.hidden = !isPerson;
    cityForm.hidden = !isCity;
    subjectForm.hidden = !isSubject;
    keywordInput.value = '';

    if (isPerson) {
      const config = roleConfig[currentMode];
      personLabel.textContent = `Nome ${config.of} ${config.singular}`;
      fillPersonOptions(currentMode, selected);
    }

    document.querySelectorAll('.mode-button').forEach(button => {
      const active = button.dataset.mode === currentMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (render && currentMode === 'notice') renderNotice();
    else if (render) renderWelcome();
  }

  function renderDate(value, scroll = false) {
    if (!parseDate(value)) return renderWelcome();
    dateInput.value = value;
    setUrlFilter('date', value);
    const matches = events.filter(event => event.date === value);
    const readableDate = titleCaseFirst(formatDate(value));
    if (!matches.length) {
      results.innerHTML = `<div class="empty-state"><div class="empty-icon" aria-hidden="true">✓</div><h2>Nenhum evento nesta data</h2><p>Não há registros para ${escapeHtml(readableDate)}. Use os botões de navegação para consultar outro dia.</p></div>`;
    } else {
      const label = matches.length === 1 ? '1 evento encontrado' : `${matches.length} eventos encontrados`;
      results.innerHTML = `<div class="results-heading"><div><h2>${escapeHtml(readableDate)}</h2><p>Programação registrada na lista</p></div><span class="count-pill">${label}</span></div><div class="event-list">${matches.map(event => eventCard(event)).join('')}</div>`;
    }
    if (scroll) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPerson(mode, name, scroll = false) {
    const config = roleConfig[mode];
    if (!config || !namesByRole[mode].includes(name)) return renderWelcome();
    personSelect.value = name;
    setUrlFilter(mode, name);
    const matches = events.filter(event => extractNames(event.detail, mode).includes(name));
    const label = matches.length === 1 ? '1 atendimento' : `${matches.length} atendimentos`;
    results.innerHTML = `<div class="results-heading"><div><span class="elder-summary">${config.heading}</span><h2>${escapeHtml(name)}</h2><p>Atendimentos em ordem cronológica</p></div><span class="count-pill">${label}</span></div><div class="event-list">${matches.map(event => eventCard(event)).join('')}</div>`;
    if (scroll) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderCity(city, scroll = false) {
    if (!cities.includes(city)) return renderWelcome();
    citySelect.value = city;
    setUrlFilter('city', city);
    const matches = events.filter(event => cityFor(event) === city || cityFor(event) === null);
    const label = matches.length === 1 ? '1 evento' : `${matches.length} eventos`;
    results.innerHTML = `<div class="results-heading"><div><span class="elder-summary">AGENDA DA LOCALIDADE</span><h2>${escapeHtml(city)}</h2><p>Inclui avisos destinados a toda a regional</p></div><span class="count-pill">${label}</span></div><div class="event-list">${matches.map(event => eventCard(event)).join('')}</div>`;
    if (scroll) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderSubject(subject, scroll = false) {
    if (!subjects.includes(subject)) return renderWelcome();
    setUrlFilter('subject', subject);
    const matches = events.filter(event => event.category === subject);
    const label = matches.length === 1 ? '1 evento' : `${matches.length} eventos`;
    subjectList.querySelectorAll('.subject-button').forEach(button => {
      const active = button.dataset.subject === subject;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    results.innerHTML = `<div class="results-heading"><div><span class="elder-summary">AGENDA POR ASSUNTO</span><h2>${escapeHtml(subject)}</h2><p>Eventos em ordem cronológica</p></div><span class="count-pill">${label}</span></div><div class="event-list">${matches.map(event => eventCard(event)).join('')}</div>`;
    if (scroll) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderNotice(scroll = false) {
    const matches = events.filter(event => event.category === 'Avisos à irmandade');
    setUrlFilter('notice', '1');
    const label = matches.length === 1 ? '1 aviso' : `${matches.length} avisos`;
    results.innerHTML = `<div class="results-heading"><div><span class="elder-summary">AVISOS À IRMANDADE</span><h2>Avisos</h2><p>Comunicados em ordem cronológica</p></div><span class="count-pill">${label}</span></div><div class="event-list">${matches.map(event => eventCard(event)).join('')}</div>`;
    if (scroll) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderSearch(query, scroll = false) {
    const cleanedQuery = query.trim();
    if (cleanedQuery.length < 2) return;
    const terms = normalizeText(cleanedQuery).split(/\s+/).filter(Boolean);
    const matches = events.filter(event => {
      const searchable = searchableEvent(event);
      return terms.every(term => searchable.includes(term));
    });

    currentMode = 'search';
    keywordInput.value = cleanedQuery;
    dateForm.hidden = true;
    dateActions.hidden = true;
    personForm.hidden = true;
    cityForm.hidden = true;
    subjectForm.hidden = true;
    document.querySelectorAll('.mode-button').forEach(button => {
      button.classList.remove('is-active');
      button.setAttribute('aria-pressed', 'false');
    });
    setUrlFilter('search', cleanedQuery);

    if (!matches.length) {
      results.innerHTML = `<div class="empty-state"><div class="empty-icon" aria-hidden="true">⌕</div><h2>Nenhum evento encontrado</h2><p>Não encontramos eventos relacionados a “${escapeHtml(cleanedQuery)}”. Tente outra palavra.</p></div>`;
    } else {
      const label = matches.length === 1 ? '1 evento encontrado' : `${matches.length} eventos encontrados`;
      results.innerHTML = `<div class="results-heading"><div><span class="elder-summary">RESULTADO DA PESQUISA</span><h2>“${escapeHtml(cleanedQuery)}”</h2><p>Eventos relacionados, em ordem cronológica</p></div><span class="count-pill">${label}</span></div><div class="event-list">${matches.map(event => eventCard(event)).join('')}</div>`;
    }
    if (scroll) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function nearbyDatesHtml() {
    const distinctDates = [...new Set(events.map(event => event.date))];
    const today = toInputDate(new Date());
    let recentDates = distinctDates.filter(date => date <= today).slice(-3);
    let nextDates = distinctDates.filter(date => date > today).slice(0, 3);
    if (recentDates.length < 3) nextDates = distinctDates.filter(date => date > today).slice(0, 6 - recentDates.length);
    if (nextDates.length < 3) recentDates = distinctDates.filter(date => date <= today).slice(-(6 - nextDates.length));
    const nearbyDates = [...recentDates, ...nextDates];
    return `<div class="upcoming"><h3>Últimas e próximas datas com eventos</h3><div class="date-chips">${nearbyDates.map(date => `<button class="date-chip" type="button" data-date="${date}">${formatDate(date, false)}</button>`).join('')}</div></div>`;
  }

  function renderWelcome() {
    setUrlFilter(currentMode, '');
    if (roleConfig[currentMode]) {
      const config = roleConfig[currentMode];
      const count = namesByRole[currentMode].length;
      const title = count ? `Consulte a agenda de ${config.article} ${config.singular}` : `${config.none} ${config.singular} ${config.named}`;
      const message = count
        ? `Selecione ${config.selection} ${count} ${config.plural} ${config.found} na lista para ver todos os seus atendimentos.`
        : `O documento atual menciona a função, mas não informa nomes de ${config.plural}. O filtro já está preparado para futuras listas.`;
      results.innerHTML = `<div class="welcome-state"><div class="empty-icon" aria-hidden="true">${config.icon}</div><h2>${title}</h2><p>${message}</p>${nearbyDatesHtml()}</div>`;
      return;
    }
    if (currentMode === 'city') {
      results.innerHTML = `<div class="welcome-state"><div class="empty-icon" aria-hidden="true">⌖</div><h2>Consulte por cidade</h2><p>Selecione uma das ${cities.length} cidades ou localidades identificadas na lista.</p>${nearbyDatesHtml()}</div>`;
      return;
    }
    if (currentMode === 'subject') {
      subjectList.querySelectorAll('.subject-button').forEach(button => {
        button.classList.remove('is-active');
        button.setAttribute('aria-pressed', 'false');
      });
      results.innerHTML = `<div class="welcome-state"><div class="empty-icon" aria-hidden="true">☷</div><h2>Consulte por assunto</h2><p>Escolha um dos ${subjects.length} assuntos acima para ver todos os eventos relacionados.</p>${nearbyDatesHtml()}</div>`;
      return;
    }
    dateInput.value = '';
    results.innerHTML = `<div class="welcome-state"><div class="empty-icon" aria-hidden="true">▦</div><h2>Agenda pronta para consulta</h2><p>Consulte por assunto, ancião, diácono, encarregado, examinadora, cidade, avisos ou data.</p>${nearbyDatesHtml()}</div>`;
  }

  document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  dateForm.addEventListener('submit', event => { event.preventDefault(); if (dateInput.reportValidity()) renderDate(dateInput.value, true); });
  personForm.addEventListener('submit', event => { event.preventDefault(); if (personSelect.reportValidity()) renderPerson(currentMode, personSelect.value, true); });
  cityForm.addEventListener('submit', event => { event.preventDefault(); if (citySelect.reportValidity()) renderCity(citySelect.value, true); });
  keywordForm.addEventListener('submit', event => { event.preventDefault(); if (keywordInput.reportValidity()) renderSearch(keywordInput.value, true); });
  subjectList.addEventListener('click', event => {
    const button = event.target.closest('[data-subject]');
    if (button) renderSubject(button.dataset.subject, true);
  });
  document.querySelectorAll('[data-shift]').forEach(button => button.addEventListener('click', () => {
    const base = parseDate(dateInput.value) || new Date(2026, 7, 9, 12);
    base.setDate(base.getDate() + Number(button.dataset.shift));
    renderDate(toInputDate(base));
  }));
  document.querySelector('#today-button').addEventListener('click', () => renderDate(toInputDate(new Date())));
  document.querySelector('#clear-button').addEventListener('click', renderWelcome);
  results.addEventListener('click', event => {
    const dateButton = event.target.closest('[data-date]');
    if (dateButton) { renderDate(dateButton.dataset.date); return; }
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const target = events.find(item => item.id === Number(actionButton.dataset.id));
    if (!target) return;
    if (actionButton.dataset.action === 'calendar') downloadIcs(target);
    if (actionButton.dataset.action === 'share') shareEvent(target);
  });

  const params = new URL(window.location.href).searchParams;
  const initialRole = params.get('funcao');
  const initialPerson = params.get('pessoa');
  const initialCity = params.get('cidade');
  const initialSubject = params.get('assunto');
  const initialDate = params.get('data');
  const initialSearch = params.get('busca');
  const initialNotice = params.get('avisos') === '1';
  if (initialSearch && initialSearch.trim().length >= 2) {
    renderSearch(initialSearch);
  } else if (initialNotice) {
    setMode('notice', false);
    renderNotice();
  } else if (roleConfig[initialRole] && namesByRole[initialRole].includes(initialPerson)) {
    setMode(initialRole, false, initialPerson);
    renderPerson(initialRole, initialPerson);
  } else if (cities.includes(initialCity)) {
    setMode('city', false);
    renderCity(initialCity);
  } else if (subjects.includes(initialSubject)) {
    setMode('subject', false);
    renderSubject(initialSubject);
  } else if (parseDate(initialDate)) {
    setMode('date', false);
    renderDate(initialDate);
  } else {
    setMode('subject', false);
    renderWelcome();
  }
})();
