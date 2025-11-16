// ============================================
// RESULTADOS DA LIGA
// ============================================

let currentUser = null;

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await verificarAutenticacao();
    if (currentUser) {
        await loadUserInfo();
        await loadResults();
        checkAdminStatus();
    }
});

/**
 * Carrega informações do usuário
 */
async function loadUserInfo() {
    try {
        const { data: userData, error } = await supabase
            .from('users')
            .select('team_name, cartoletas')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;

        // Atualizar informações no header
        document.getElementById('user-team-name').textContent = userData.team_name || 'Sem nome';
        document.getElementById('user-cartoletas').textContent = `C$ ${userData.cartoletas.toFixed(2)}`;
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
    }
}

/**
 * Verifica se usuário é admin
 */
async function checkAdminStatus() {
    try {
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', currentUser.id)
            .single();

        if (userData?.role === 'admin') {
            document.getElementById('link-admin').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Erro ao verificar status admin:', error);
    }
}

/**
 * Carrega todos os resultados das rodadas finalizadas
 */
async function loadResults() {
    const loadingState = document.getElementById('loading-state');
    const resultadosContainer = document.getElementById('resultados-container');
    const emptyState = document.getElementById('empty-state');

    try {
        // Buscar rodadas finalizadas
        const { data: rounds, error: roundsError } = await supabase
            .from('rounds')
            .select('*')
            .eq('status', 'finished')
            .order('number', { ascending: false });

        if (roundsError) throw roundsError;

        loadingState.classList.add('hidden');

        if (!rounds || rounds.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        resultadosContainer.classList.remove('hidden');

        // Renderizar cada rodada
        for (const round of rounds) {
            const roundElement = await createRoundElement(round);
            resultadosContainer.appendChild(roundElement);
        }

    } catch (error) {
        console.error('Erro ao carregar resultados:', error);
        loadingState.classList.add('hidden');
        showNotification('Erro ao carregar resultados', 'error');
    }
}

/**
 * Cria elemento HTML para uma rodada
 */
async function createRoundElement(round) {
    const roundDiv = document.createElement('div');
    roundDiv.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden';

    // Header da rodada
    const header = document.createElement('div');
    header.className = 'bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6';
    header.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-3xl font-bold">Rodada ${round.number}</h2>
                <p class="text-blue-100 mt-1">${formatDate(round.end_date)}</p>
            </div>
            <div class="text-5xl opacity-50">🏆</div>
        </div>
    `;
    roundDiv.appendChild(header);

    // Loading dos resultados
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'p-8 text-center';
    loadingDiv.innerHTML = `
        <div class="flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span class="text-gray-500 dark:text-gray-400">Carregando ranking...</span>
        </div>
    `;
    roundDiv.appendChild(loadingDiv);

    // Carregar ranking da rodada
    const ranking = await loadRoundRanking(round.id);
    loadingDiv.remove();

    if (ranking.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'p-8 text-center text-gray-500 dark:text-gray-400';
        emptyDiv.textContent = 'Nenhum time participou desta rodada';
        roundDiv.appendChild(emptyDiv);
    } else {
        // Tabela de ranking
        const tableDiv = document.createElement('div');
        tableDiv.className = 'overflow-x-auto';
        tableDiv.innerHTML = createRankingTable(ranking, round.id);
        roundDiv.appendChild(tableDiv);
    }

    return roundDiv;
}

/**
 * Carrega ranking de uma rodada específica
 */
async function loadRoundRanking(roundId) {
    try {
        // Buscar escalações da rodada com pontuação
        const { data: lineups, error } = await supabase
            .from('lineups')
            .select(`
                id,
                user_id,
                total_points,
                users (
                    team_name
                )
            `)
            .eq('round_id', roundId)
            .order('total_points', { ascending: false });

        if (error) throw error;

        return lineups || [];
    } catch (error) {
        console.error('Erro ao carregar ranking da rodada:', error);
        return [];
    }
}

/**
 * Cria HTML da tabela de ranking
 */
function createRankingTable(ranking, roundId) {
    const rows = ranking.map((lineup, index) => {
        const position = index + 1;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '';
        const isCurrentUser = lineup.user_id === currentUser.id;
        const highlightClass = isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20' : '';

        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${highlightClass}"
                onclick="toggleLineupDetails(${lineup.id}, ${roundId}, this)">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <span class="text-2xl mr-2">${medal}</span>
                        <span class="text-lg font-bold text-gray-900 dark:text-white">${position}º</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <span class="text-lg font-medium text-gray-900 dark:text-white">
                            ${lineup.users.team_name}
                        </span>
                        ${isCurrentUser ? '<span class="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Você</span>' : ''}
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <span class="text-xl font-bold text-green-600 dark:text-green-400">
                            ${lineup.total_points.toFixed(2)} pts
                        </span>
                        <svg class="w-5 h-5 ml-2 text-gray-400 dark:text-gray-500 chevron-icon transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                </td>
            </tr>
            <tr class="lineup-details hidden" id="details-${lineup.id}">
                <td colspan="3" class="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
                    <div class="flex items-center justify-center py-4">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                        <span class="text-gray-500 dark:text-gray-400">Carregando detalhes...</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Posição
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Time
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Pontuação
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                ${rows}
            </tbody>
        </table>
    `;
}

/**
 * Toggle detalhes da escalação
 */
async function toggleLineupDetails(lineupId, roundId, rowElement) {
    const detailsRow = document.getElementById(`details-${lineupId}`);
    const chevron = rowElement.querySelector('.chevron-icon');

    if (detailsRow.classList.contains('hidden')) {
        // Abrir detalhes
        detailsRow.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';

        // Carregar detalhes se ainda não foi carregado
        if (detailsRow.dataset.loaded !== 'true') {
            await loadLineupDetails(lineupId, roundId, detailsRow);
            detailsRow.dataset.loaded = 'true';
        }
    } else {
        // Fechar detalhes
        detailsRow.classList.add('hidden');
        chevron.style.transform = 'rotate(0deg)';
    }
}

/**
 * Carrega detalhes dos jogadores da escalação
 */
async function loadLineupDetails(lineupId, roundId, detailsRow) {
    try {
        // Buscar jogadores da escalação com estatísticas
        const { data: lineupPlayers, error } = await supabase
            .from('lineup_players')
            .select(`
                players (
                    id,
                    name,
                    position,
                    photo_url,
                    teams (
                        name,
                        logo_url
                    )
                )
            `)
            .eq('lineup_id', lineupId);

        if (error) throw error;

        // Buscar estatísticas de cada jogador nesta rodada
        const playersWithStats = await Promise.all(
            lineupPlayers.map(async (lp) => {
                const { data: stats } = await supabase
                    .from('player_stats')
                    .select('*')
                    .eq('player_id', lp.players.id)
                    .eq('round_id', roundId)
                    .single();

                return {
                    ...lp.players,
                    stats: stats || {}
                };
            })
        );

        // Renderizar detalhes
        const detailsHTML = createLineupDetailsHTML(playersWithStats);
        detailsRow.querySelector('td').innerHTML = detailsHTML;

    } catch (error) {
        console.error('Erro ao carregar detalhes da escalação:', error);
        detailsRow.querySelector('td').innerHTML = `
            <div class="text-center text-red-500 dark:text-red-400 py-4">
                Erro ao carregar detalhes
            </div>
        `;
    }
}

/**
 * Cria HTML dos detalhes da escalação
 */
function createLineupDetailsHTML(players) {
    const playersHTML = players.map(player => {
        const points = calculatePlayerPoints(player.stats);
        const statsBreakdown = getStatsBreakdown(player.stats);

        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
                <div class="flex items-start space-x-4">
                    <!-- Foto do jogador -->
                    <div class="flex-shrink-0">
                        <img src="${player.photo_url || 'https://via.placeholder.com/80'}"
                             alt="${player.name}"
                             class="w-20 h-20 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600">
                    </div>

                    <!-- Informações do jogador -->
                    <div class="flex-grow">
                        <div class="flex items-center justify-between mb-2">
                            <div>
                                <h4 class="text-lg font-bold text-gray-900 dark:text-white">${player.name}</h4>
                                <div class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span class="font-medium">${getPositionName(player.position)}</span>
                                    <span>•</span>
                                    <span>${player.teams.name}</span>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-2xl font-bold ${points >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                    ${points >= 0 ? '+' : ''}${points.toFixed(2)}
                                </div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">pontos</div>
                            </div>
                        </div>

                        <!-- Estatísticas detalhadas -->
                        <div class="mt-3">
                            <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">📊 Estatísticas:</div>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                                ${statsBreakdown.map(stat => `
                                    <div class="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded px-3 py-2">
                                        <span class="text-xs text-gray-600 dark:text-gray-400">${stat.label}</span>
                                        <div class="flex items-center space-x-2">
                                            <span class="font-bold text-gray-900 dark:text-white">${stat.value}</span>
                                            <span class="text-xs ${stat.points >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                                ${stat.points >= 0 ? '+' : ''}${stat.points.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="py-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span class="mr-2">⚽</span>
                Escalação e Pontuação
            </h3>
            <div class="grid grid-cols-1 gap-4">
                ${playersHTML}
            </div>
        </div>
    `;
}

/**
 * Retorna breakdown detalhado das estatísticas
 */
function getStatsBreakdown(stats) {
    const breakdown = [];

    // Estatísticas positivas
    if (stats.goals) {
        breakdown.push({
            label: '⚽ Gols',
            value: stats.goals,
            points: stats.goals * PONTOS_SCOUTS.goals
        });
    }
    if (stats.assists) {
        breakdown.push({
            label: '🎯 Assistências',
            value: stats.assists,
            points: stats.assists * PONTOS_SCOUTS.assists
        });
    }
    if (stats.shots_on_target) {
        breakdown.push({
            label: '🎪 Finalizações',
            value: stats.shots_on_target,
            points: stats.shots_on_target * PONTOS_SCOUTS.shots_on_target
        });
    }
    if (stats.saves) {
        breakdown.push({
            label: '🧤 Defesas',
            value: stats.saves,
            points: stats.saves * PONTOS_SCOUTS.saves
        });
    }
    if (stats.clean_sheet) {
        breakdown.push({
            label: '🛡️ Jogo sem gol',
            value: stats.clean_sheet,
            points: stats.clean_sheet * PONTOS_SCOUTS.clean_sheet
        });
    }

    // Estatísticas negativas
    if (stats.own_goals) {
        breakdown.push({
            label: '⛔ Gols contra',
            value: stats.own_goals,
            points: stats.own_goals * PONTOS_SCOUTS.own_goals
        });
    }
    if (stats.red_cards) {
        breakdown.push({
            label: '🟥 Cartões vermelhos',
            value: stats.red_cards,
            points: stats.red_cards * PONTOS_SCOUTS.red_cards
        });
    }
    if (stats.yellow_cards) {
        breakdown.push({
            label: '🟨 Cartões amarelos',
            value: stats.yellow_cards,
            points: stats.yellow_cards * PONTOS_SCOUTS.yellow_cards
        });
    }
    if (stats.fouls) {
        breakdown.push({
            label: '⚠️ Faltas',
            value: stats.fouls,
            points: stats.fouls * PONTOS_SCOUTS.fouls
        });
    }

    // Se não tiver nenhuma estatística
    if (breakdown.length === 0) {
        breakdown.push({
            label: '📊 Sem estatísticas',
            value: 0,
            points: 0
        });
    }

    return breakdown;
}

/**
 * Retorna nome da posição
 */
function getPositionName(position) {
    const positions = {
        'GOL': '🧤 Goleiro',
        'FIX': '🛡️ Fixo',
        'ALA': '⚡ Ala',
        'PIV': '🎯 Pivô'
    };
    return positions[position] || position;
}

/**
 * Formata data
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}
