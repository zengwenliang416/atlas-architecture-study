'use strict';

const screens = {
  'show-setup': 'screen-setup',
  'show-login': 'screen-login',
  'show-study': 'screen-study',
  'show-wrap': 'screen-study',
  'show-narrow': 'screen-study',
};

const copy = {
  'show-setup': '创建账号表单进入首屏',
  'show-login': '登录表单进入首屏',
  'show-study': '目录和题目标题同时可见',
  'show-wrap': '顶栏已换行且目录仍在题目旁',
  'show-narrow': '目录已收成单列',
  'reveal-answer': '解析和论文已揭晓',
  'mark-mastered': '本题已标记掌握',
};

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  if (node.removeAttribute) node.removeAttribute('hidden');
}

function showScreen(id) {
  for (const screenId of new Set(Object.values(screens))) {
    const screen = document.getElementById(screenId);
    if (!screen) continue;
    if (screenId === id) reveal(screen);
    else {
      screen.hidden = true;
      screen.setAttribute('hidden', '');
    }
  }
}

function setResult(name, text) {
  const node = document.querySelector(`[data-specnav-result="${name}"]`);
  if (node) node.textContent = text;
}

function applyWidth(mode) {
  const viewport = document.getElementById('study-viewport');
  const sidebar = document.querySelector('.sidebar');
  if (!viewport || !sidebar) return;
  viewport.classList.remove('viewport-1280', 'viewport-980', 'viewport-390');
  if (mode === 'wrap') viewport.classList.add('viewport-980');
  else if (mode === 'narrow') viewport.classList.add('viewport-390');
  else viewport.classList.add('viewport-1280');
  viewport.setAttribute('data-specnav-variant', mode === 'desktop' ? 'desktop-1280' : mode);
  sidebar.classList.remove('collapsed');
}

for (const id of Object.keys(copy)) {
  const button = document.querySelector(`[data-specnav-action="${id}"]`);
  if (!button) continue;
  button.addEventListener('click', () => {
    if (screens[id]) showScreen(screens[id]);
    if (id === 'show-study') applyWidth('desktop');
    if (id === 'show-wrap') applyWidth('wrap');
    if (id === 'show-narrow') applyWidth('narrow');
    if (id === 'reveal-answer') reveal(document.getElementById('revealed'));
    if (id === 'mark-mastered') {
      const label = document.getElementById('level-label');
      if (label) label.classList.add('on');
      reveal(document.querySelector('.toast'));
    }
    setResult(id, copy[id]);
  });
}
