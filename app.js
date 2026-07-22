'use strict';

const LIVE_API_BASE = 'https://api.github.com';
const params = new URLSearchParams(window.location.search);
const demoMode = params.get('demo') === '1';

const elements = {
  form: document.querySelector('#searchForm'),
  input: document.querySelector('#username'),
  button: document.querySelector('#searchButton'),
  modeBadge: document.querySelector('#modeBadge'),
  requestPanel: document.querySelector('#requestPanel'),
  requestUrl: document.querySelector('#requestUrl'),
  httpStatus: document.querySelector('#httpStatus'),
  responseTime: document.querySelector('#responseTime'),
  rateLimit: document.querySelector('#rateLimit'),
  message: document.querySelector('#message'),
  results: document.querySelector('#results'),
  avatar: document.querySelector('#avatar'),
  login: document.querySelector('#login'),
  displayName: document.querySelector('#displayName'),
  profileLink: document.querySelector('#profileLink'),
  bio: document.querySelector('#bio'),
  location: document.querySelector('#location'),
  company: document.querySelector('#company'),
  createdAt: document.querySelector('#createdAt'),
  repoCount: document.querySelector('#repoCount'),
  followers: document.querySelector('#followers'),
  following: document.querySelector('#following'),
  gists: document.querySelector('#gists'),
  repoGrid: document.querySelector('#repoGrid'),
  languageFilter: document.querySelector('#languageFilter')
};

let currentRepos = [];

if (demoMode) {
  elements.modeBadge.textContent = 'Demostración local';
  elements.modeBadge.classList.add('demo');
}

elements.avatar.addEventListener('error', () => {
  elements.avatar.src = 'assets/avatar-fallback.svg';
});

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = elements.input.value.trim();
  if (!username) {
    showMessage('Escribe un nombre de usuario de GitHub.');
    elements.input.focus();
    return;
  }
  await searchUser(username);
});

elements.languageFilter.addEventListener('change', () => {
  renderRepositories(currentRepos, elements.languageFilter.value);
});

async function searchUser(username) {
  setLoading(true);
  hideMessage();
  elements.results.classList.add('hidden');
  elements.requestPanel.classList.remove('hidden');
  elements.requestUrl.textContent = `GET ${LIVE_API_BASE}/users/${encodeURIComponent(username)}`;
  updateRequestStatus('Solicitando...', 'pending');
  const start = performance.now();

  try {
    const [profileResponse, reposResponse] = demoMode
      ? await getDemoResponses(username)
      : await getLiveResponses(username);

    const elapsed = Math.round(performance.now() - start);
    elements.responseTime.textContent = `${elapsed} ms`;

    if (!profileResponse.ok) {
      const errorData = await profileResponse.json().catch(() => ({}));
      throw new ApiError(errorData.message || 'No se encontró el usuario.', profileResponse.status);
    }

    if (!reposResponse.ok) {
      throw new ApiError('El perfil se encontró, pero no fue posible obtener sus repositorios.', reposResponse.status);
    }

    const profile = await profileResponse.json();
    const repos = await reposResponse.json();
    currentRepos = repos;

    const remaining = profileResponse.headers.get('x-ratelimit-remaining');
    elements.rateLimit.textContent = remaining !== null
      ? `Solicitudes restantes: ${remaining}`
      : demoMode ? 'Respuesta de prueba documentada' : 'Límite no informado';

    updateRequestStatus(`${profileResponse.status} OK`, 'ok');
    renderProfile(profile);
    populateLanguageFilter(repos);
    renderRepositories(repos, 'all');
    elements.results.classList.remove('hidden');
  } catch (error) {
    const elapsed = Math.round(performance.now() - start);
    elements.responseTime.textContent = `${elapsed} ms`;
    const status = error instanceof ApiError ? error.status : 'Error';
    updateRequestStatus(String(status), 'error');

    const friendlyMessage = error instanceof TypeError
      ? 'No fue posible conectarse con GitHub. Verifica tu conexión a Internet e inténtalo nuevamente.'
      : error.message;
    showMessage(friendlyMessage);
  } finally {
    setLoading(false);
  }
}

async function getLiveResponses(username) {
  const commonHeaders = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  return Promise.all([
    fetch(`${LIVE_API_BASE}/users/${encodeURIComponent(username)}`, { headers: commonHeaders }),
    fetch(`${LIVE_API_BASE}/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=12`, { headers: commonHeaders })
  ]);
}

async function getDemoResponses(username) {
  await delay(900);
  if (username.toLowerCase() !== 'octocat') {
    return [
      new Response(JSON.stringify({ message: 'En la demostración local utiliza el usuario octocat.' }), { status: 404 }),
      new Response(JSON.stringify([]), { status: 404 })
    ];
  }

  return Promise.all([
    fetch('data/octocat-profile.json'),
    fetch('data/octocat-repos.json')
  ]);
}

function renderProfile(profile) {
  elements.avatar.src = profile.avatar_url || 'assets/avatar-fallback.svg';
  elements.login.textContent = `@${profile.login}`;
  elements.displayName.textContent = profile.name || profile.login;
  elements.profileLink.href = profile.html_url;
  elements.bio.textContent = profile.bio || 'Sin biografía pública.';
  elements.location.textContent = profile.location ? `📍 ${profile.location}` : '📍 Ubicación no disponible';
  elements.company.textContent = profile.company ? `🏢 ${profile.company}` : '🏢 Organización no disponible';
  elements.createdAt.textContent = `📅 Miembro desde ${formatDate(profile.created_at)}`;
  elements.repoCount.textContent = formatNumber(profile.public_repos);
  elements.followers.textContent = formatNumber(profile.followers);
  elements.following.textContent = formatNumber(profile.following);
  elements.gists.textContent = formatNumber(profile.public_gists);
}

function populateLanguageFilter(repos) {
  const languages = [...new Set(repos.map(repo => repo.language).filter(Boolean))].sort();
  elements.languageFilter.innerHTML = '<option value="all">Todos</option>';
  languages.forEach(language => {
    const option = document.createElement('option');
    option.value = language;
    option.textContent = language;
    elements.languageFilter.appendChild(option);
  });
}

function renderRepositories(repos, language) {
  const filtered = language === 'all' ? repos : repos.filter(repo => repo.language === language);
  elements.repoGrid.innerHTML = '';

  if (filtered.length === 0) {
    elements.repoGrid.innerHTML = '<div class="empty-repos">No hay repositorios para el filtro seleccionado.</div>';
    return;
  }

  filtered.slice(0, 8).forEach(repo => {
    const card = document.createElement('article');
    card.className = 'repo-card';
    card.innerHTML = `
      <h3><a href="${escapeAttribute(repo.html_url)}" target="_blank" rel="noreferrer">${escapeHtml(repo.name)} ↗</a></h3>
      <p>${escapeHtml(repo.description || 'Repositorio público sin descripción.')}</p>
      <div class="repo-meta">
        <span><span class="language-dot"></span>${escapeHtml(repo.language || 'Sin lenguaje')}</span>
        <span>★ ${formatNumber(repo.stargazers_count)}</span>
        <span>⑂ ${formatNumber(repo.forks_count)}</span>
        <span>Actualizado ${formatDate(repo.updated_at)}</span>
      </div>`;
    elements.repoGrid.appendChild(card);
  });
}

function updateRequestStatus(text, state) {
  elements.httpStatus.textContent = text;
  elements.httpStatus.className = 'status-pill';
  if (state === 'ok') elements.httpStatus.classList.add('ok');
  if (state === 'error') elements.httpStatus.classList.add('error');
}

function setLoading(isLoading) {
  elements.button.disabled = isLoading;
  elements.button.classList.toggle('loading', isLoading);
}

function showMessage(text) {
  elements.message.textContent = text;
  elements.message.classList.remove('hidden');
}

function hideMessage() {
  elements.message.classList.add('hidden');
  elements.message.textContent = '';
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-MX').format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(value));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value || '#');
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
