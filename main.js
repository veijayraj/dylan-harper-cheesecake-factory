// ── Slide navigation ──────────────────────────────────────

const slides = document.querySelectorAll('.slide');
const totalSlides = slides.length;
let currentSlide = 0;

const dotsContainer = document.getElementById('dots');

for (let i = 0; i < totalSlides; i++) {
  const btn = document.createElement('button');
  btn.className = 'dot' + (i === 0 ? ' active' : '');
  btn.setAttribute('aria-label', 'Go to slide ' + (i + 1));
  btn.setAttribute('aria-current', i === 0 ? 'true' : 'false');
  btn.addEventListener('click', () => goTo(i));
  dotsContainer.appendChild(btn);
}

function goTo(index) {
  slides[currentSlide].classList.remove('active');
  currentSlide = index;
  slides[currentSlide].classList.add('active');

  const countEl = document.getElementById('slideCount');
  countEl.textContent = (currentSlide + 1) + ' / ' + totalSlides;

  document.getElementById('prevBtn').disabled = currentSlide === 0;
  document.getElementById('nextBtn').disabled = currentSlide === totalSlides - 1;

  document.querySelectorAll('button.dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === currentSlide);
    dot.setAttribute('aria-current', i === currentSlide ? 'true' : 'false');
  });

  if (currentSlide === 2) {
    buildScatterIfNeeded();
  }
}

function go(direction) {
  goTo(Math.max(0, Math.min(totalSlides - 1, currentSlide + direction)));
}

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') go(1);
  if (e.key === 'ArrowLeft')  go(-1);
});

// ── D3 scatter chart ──────────────────────────────────────

let scatterBuilt = false;
let scatterData = null;

function buildScatterIfNeeded() {
  if (scatterBuilt || !scatterData) return;
  scatterBuilt = true;
  d3.select('#rimScatter').selectAll('*').remove();
  buildScatter(scatterData);
}

function buildScatter(data) {
  const svg = d3.select('#rimScatter');
  const isMobile = window.innerWidth < 600;

  const W = 628;
  const H = isMobile ? 820 : 280;
  const margin = isMobile
    ? { top: 16, right: 16, bottom: 52, left: 44 }
    : { top: 16, right: 28, bottom: 40, left: 52 };

  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const fontSize      = isMobile ? 14 : 11;
  const labelFontSize = isMobile ? 15 : 13;
  const dotRadius     = isMobile ? 8  : 7;

  svg
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', W)
    .attr('height', H)
    .style('width', '100%')
    .style('height', 'auto');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const guards = data.guards || data.players;
  const harper = data.harper;

  const guardPlayers = guards.filter(d => d.player !== 'Dylan Harper');

  // Mobile swaps axes: x = FG%, y = FGA/36. Desktop: x = FGA/36, y = FG%.
  const getX = d => isMobile ? d.ra_fg_pct    : d.ra_fga_per36;
  const getY = d => isMobile ? d.ra_fga_per36 : d.ra_fg_pct;

  const allX = [...guardPlayers.map(getX), harper ? getX(harper) : 0];
  const allY = [...guardPlayers.map(getY), harper ? getY(harper) : 0];

  const xPad = (d3.max(allX) - d3.min(allX)) * (isMobile ? 0.04 : 0.10);
  const yPad = (d3.max(allY) - d3.min(allY)) * (isMobile ? 0.25 : 0.12);

  const xScale = d3.scaleLinear()
    .domain([d3.min(allX) - xPad, d3.max(allX) + xPad])
    .range([0, innerW]);

  const yScale = d3.scaleLinear()
    .domain([d3.min(allY) - yPad, d3.max(allY) + yPad])
    .range([innerH, 0]);

  // Horizontal grid lines
  g.append('g')
    .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(''))
    .call(gg => gg.select('.domain').remove())
    .call(gg => gg.selectAll('line').attr('stroke', 'rgba(156,93,65,0.12)'));

  const xFormat = isMobile ? v => (v * 100).toFixed(0) + '%' : v => v.toFixed(1);
  const yFormat = isMobile ? v => v.toFixed(1) : v => (v * 100).toFixed(0) + '%';
  const xLabel  = isMobile ? 'RA FG%' : 'RA FGA PER 36 MIN';
  const yLabel  = isMobile ? 'RA FGA PER 36 MIN' : 'RA FG%';

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(isMobile ? 5 : 6).tickFormat(xFormat))
    .call(gg => gg.select('.domain').attr('stroke', 'rgba(156,93,65,0.3)'))
    .call(gg => gg.selectAll('text').attr('fill', '#56412f').attr('font-size', fontSize).attr('font-family', 'Barlow, sans-serif'))
    .call(gg => gg.selectAll('line').attr('stroke', 'rgba(156,93,65,0.2)'));

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(yFormat))
    .call(gg => gg.select('.domain').attr('stroke', 'rgba(156,93,65,0.3)'))
    .call(gg => gg.selectAll('text').attr('fill', '#56412f').attr('font-size', fontSize).attr('font-family', 'Barlow, sans-serif'))
    .call(gg => gg.selectAll('line').attr('stroke', 'rgba(156,93,65,0.2)'));

  g.append('text')
    .attr('x', innerW / 2)
    .attr('y', innerH + (isMobile ? 42 : 34))
    .attr('text-anchor', 'middle')
    .attr('fill', '#56412f')
    .attr('font-size', fontSize)
    .attr('font-family', 'Barlow Condensed, sans-serif')
    .attr('letter-spacing', '0.12em')
    .text(xLabel);

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', isMobile ? -32 : -40)
    .attr('text-anchor', 'middle')
    .attr('fill', '#56412f')
    .attr('font-size', fontSize)
    .attr('font-family', 'Barlow Condensed, sans-serif')
    .attr('letter-spacing', '0.12em')
    .text(yLabel);

  // Named players get colored dots + labels. Others get faint dots.
  const namedPlayers = {
    'James Harden':            { label: 'Harden',  color: '#1a5276', dx:  9, dy:  4, anchor: 'start' },
    "De'Aaron Fox":            { label: 'Fox',      color: '#7b241c', dx:  9, dy: -4, anchor: 'start' },
    'Anthony Edwards':         { label: 'Edwards',  color: '#1e8449', dx:  8, dy: -3, anchor: 'start' },
    'Cade Cunningham':         { label: 'Cade',     color: '#6e2f8f', dx: -9, dy:  4, anchor: 'end'   },
    'Stephon Castle':          { label: 'Castle',   color: '#b7770d', dx:  9, dy:  4, anchor: 'start' },
    'Shai Gilgeous-Alexander': { label: 'SGA',      color: '#117a65', dx: -9, dy:  4, anchor: 'end'   },
    'Jalen Brunson':           { label: 'Brunson',  color: '#922b21', dx:  9, dy: 14, anchor: 'start' },
    'Tyrese Maxey':            { label: 'Maxey',    color: '#1f618d', dx:  8, dy: -3, anchor: 'start' },
    'Donovan Mitchell':        { label: 'Mitchell', color: '#7d6608', dx:  9, dy: 12, anchor: 'start' },
  };

  guardPlayers.forEach(d => {
    const config = namedPlayers[d.player];
    const cx = xScale(getX(d));
    const cy = yScale(getY(d));

    g.append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', config ? dotRadius : (isMobile ? 5 : 4))
      .attr('fill', config ? config.color : 'rgba(156,93,65,0.18)')
      .attr('stroke', 'none');

    if (config) {
      const labelDx = isMobile ? config.dy : config.dx;
      const labelDy = isMobile ? -config.dx : config.dy;
      const anchor  = isMobile ? (config.dy > 0 ? 'start' : 'end') : config.anchor;

      g.append('text')
        .attr('x', cx + labelDx)
        .attr('y', cy + labelDy)
        .attr('text-anchor', anchor)
        .attr('fill', config.color)
        .attr('font-size', labelFontSize)
        .attr('font-family', 'Barlow Condensed, sans-serif')
        .attr('font-weight', 700)
        .text(config.label);
    }
  });

  // Harper gets the cheesecake emoji treatment
  if (harper) {
    const hx = xScale(getX(harper));
    const hy = yScale(getY(harper));
    const emojiSize = isMobile ? 48 : 42;

    g.append('text')
      .attr('x', hx)
      .attr('y', hy + (isMobile ? 18 : 16))
      .attr('text-anchor', 'middle')
      .attr('font-size', emojiSize)
      .text('🍰');

    g.append('text')
      .attr('x', hx)
      .attr('y', hy - (isMobile ? 30 : 26))
      .attr('text-anchor', 'middle')
      .attr('fill', '#3d2e22')
      .attr('font-size', isMobile ? 16 : 14)
      .attr('font-weight', 700)
      .attr('font-family', 'Barlow Condensed, sans-serif')
      .text('Dylan Harper');

    g.append('text')
      .attr('x', hx)
      .attr('y', hy - (isMobile ? 14 : 13))
      .attr('text-anchor', 'middle')
      .attr('fill', '#3d2e22')
      .attr('font-size', isMobile ? 13 : 12)
      .attr('font-weight', 600)
      .attr('font-family', 'Barlow Condensed, sans-serif')
      .text(`${harper.ra_fga_per36.toFixed(1)} FGA/36 · ${(harper.ra_fg_pct * 100).toFixed(1)}% FG`);
  }
}

// ── Stat population helpers ───────────────────────────────

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function populateStats(data) {
  const harper = data.harper;
  const rank   = data.harper_rank_ra_fga_per36;
  if (!harper) return;

  setText('harperRank', rank ? '#' + rank : '—');
  setText('mFGA36',  harper.ra_fga_per36.toFixed(1));
  setText('mFGPCT',  (harper.ra_fg_pct * 100).toFixed(1) + '%');
  setText('mFGA',    Math.round(harper.ra_fga));
  setText('mGP',     harper.gp);
  setText('totalRA', Math.round(harper.ra_fga));

  // Kyrie comparison bars (sorted by FGA/36 descending)
  const kyrieRows = [...data.kyrie_historical].sort((a, b) => b.ra_fga_per36 - a.ra_fga_per36);
  const maxVal = Math.max(harper.ra_fga_per36, ...kyrieRows.map(k => k.ra_fga_per36));

  const harperWidth = ((harper.ra_fga_per36 / maxVal) * 100).toFixed(1);
  let html = `
    <div class="comp-row">
      <div class="comp-name hi">Harper '26 (Playoffs)</div>
      <div class="comp-track">
        <div class="comp-fill harper" style="width:${harperWidth}%">${harper.ra_fga_per36.toFixed(2)}</div>
      </div>
      <div class="comp-pct">${(harper.ra_fg_pct * 100).toFixed(1)}%</div>
    </div>`;

  kyrieRows.forEach(k => {
    const width = ((k.ra_fga_per36 / maxVal) * 100).toFixed(1);
    html += `
    <div class="comp-row">
      <div class="comp-name">${k.label}</div>
      <div class="comp-track">
        <div class="comp-fill kyrie" style="width:${width}%">${k.ra_fga_per36.toFixed(2)}</div>
      </div>
      <div class="comp-pct">${(k.ra_fg_pct * 100).toFixed(1)}%</div>
    </div>`;
  });

  document.getElementById('kyrieBars').innerHTML = html;
}

function buildRaTable(rookies) {
  const body = document.getElementById('raTableBody');
  if (!body) return;

  const sorted = [...rookies]
    .filter(r => r.name !== 'Cooper Flagg')
    .sort((a, b) => b.ra_fga_36 - a.ra_fga_36);

  body.innerHTML = sorted.map((r, i) => {
    const isHarper = r.name === 'Dylan Harper';
    const isLast   = i === sorted.length - 1;
    const border   = isLast ? '' : 'border-bottom:1px solid var(--border);';
    const rowBg    = isHarper ? 'background:rgba(139,74,51,0.08);' : '';

    const nameStyle  = `padding:9px 10px;${border}${isHarper ? 'font-weight:500;color:var(--rust);' : 'color:var(--dark2);'}`;
    const valStyle   = `padding:9px 10px;${border}text-align:right;font-family:'Barlow Condensed',sans-serif;${isHarper ? 'color:var(--dark);' : 'color:var(--dark2);'}`;
    const accentStyle = `padding:9px 10px;${border}text-align:right;font-family:'Barlow Condensed',sans-serif;${isHarper ? 'font-weight:600;color:var(--rust);' : 'color:var(--dark2);'}`;

    return `<tr style="${rowBg}">
      <td style="${nameStyle}">${r.name}</td>
      <td style="${valStyle}">${r.ra_fga}</td>
      <td style="${accentStyle}">${r.ra_fga_36.toFixed(2)}</td>
      <td style="${valStyle}">${(r.ra_fg_pct * 100).toFixed(1)}%</td>
    </tr>`;
  }).join('');
}

function buildDrivesTable(rookies) {
  const body = document.getElementById('drivesTableBody');
  if (!body) return;

  const sorted = [...rookies]
    .filter(r => r.name !== 'Cooper Flagg')
    .sort((a, b) => b.drive_fg_pct - a.drive_fg_pct);

  body.innerHTML = sorted.map((r, i) => {
    const isHarper = r.name === 'Dylan Harper';
    const isLast   = i === sorted.length - 1;
    const border   = isLast ? '' : 'border-bottom:1px solid var(--border);';
    const rowBg    = isHarper ? 'background:rgba(139,74,51,0.08);' : '';

    const nameStyle   = `padding:9px 10px;${border}${isHarper ? 'font-weight:500;color:var(--rust);' : 'color:var(--dark2);'}`;
    const valStyle    = `padding:9px 10px;${border}text-align:right;font-family:'Barlow Condensed',sans-serif;${isHarper ? 'color:var(--dark);' : 'color:var(--dark2);'}`;
    const accentStyle = `padding:9px 10px;${border}text-align:right;font-family:'Barlow Condensed',sans-serif;${isHarper ? 'font-weight:600;color:var(--rust);' : 'color:var(--dark2);'}`;

    return `<tr style="${rowBg}">
      <td style="${nameStyle}">${r.name}</td>
      <td style="${valStyle}">${r.drives_36}</td>
      <td style="${accentStyle}">${r.drive_pts_36}</td>
      <td style="${valStyle}">${(r.drive_fg_pct * 100).toFixed(1)}%</td>
    </tr>`;
  }).join('');
}

// ── Load data and initialize ──────────────────────────────

Promise.allSettled([
  fetch('harper_rim_data.json').then(r => {
    if (!r.ok) throw new Error('harper_rim_data.json returned ' + r.status);
    return r.json();
  }),
  fetch('rookie_data.json').then(r => {
    if (!r.ok) throw new Error('rookie_data.json returned ' + r.status);
    return r.json();
  })
]).then(([rimResult, rookieResult]) => {
  if (rimResult.status === 'fulfilled') {
    scatterData = rimResult.value;
    populateStats(scatterData);
    if (currentSlide === 2) buildScatterIfNeeded();
  } else {
    const chartWrap = document.querySelector('.chart-wrap');
    if (chartWrap) {
      chartWrap.insertAdjacentHTML('afterend',
        '<p style="color:red;font-size:12px;padding:8px">Could not load scatter data: ' + rimResult.reason + '</p>'
      );
    }
  }

  if (rookieResult.status === 'fulfilled') {
    buildRaTable(rookieResult.value);
    buildDrivesTable(rookieResult.value);
  } else {
    const raBody = document.getElementById('raTableBody');
    if (raBody) {
      raBody.innerHTML = '<tr><td colspan="4" style="padding:8px;color:red;font-size:12px">Could not load rookie data: ' + rookieResult.reason + '</td></tr>';
    }
  }
});
