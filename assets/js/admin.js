// ============================================
// CARTOLA COACH - PAINEL ADMINISTRATIVO
// ============================================

let adminUser = null;
let jogadoresCache = [];
let timesCache = [];
let rodadasCache = [];

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔧 Painel Admin carregando...');
    
    adminUser = await verificarAutenticacao();
    if (!adminUser) {
        window.location.href = 'index.html';
        return;
    }
    
    const isAdmin = await verificarPermissaoAdmin();
    if (!isAdmin) return;
    
    await initializeAdmin();
});

async function verificarPermissaoAdmin() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            window.location.href = 'index.html';
            return false;
        }
        
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('is_admin, role')
            .eq('id', user.id)
            .single();
        
        if (userError || !userData || (!userData.is_admin && userData.role !== 'admin')) {
            alert('❌ Acesso negado! Você não é administrador.');
            window.location.href = 'dashboard.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Erro na verificação de permissões:', error);
        window.location.href = 'index.html';
        return false;
    }
}

async function initializeAdmin() {
    try {
        await Promise.all([
            carregarEstatisticas(),
            carregarJogadores(),
            carregarTimes(),
            carregarRodadas()
        ]);
        
        setupEventListeners();
        setupFiltros();
        setupTabs(); // ← ADICIONE ESTA LINHA
        
        console.log('✅ Painel admin inicializado');
    } catch (error) {
        console.error('Erro ao inicializar painel:', error);
    }
}

// ============================================
// ESTATÍSTICAS
// ============================================

async function carregarEstatisticas() {
    try {
        const { count: jogadores } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true });
        document.getElementById('total-jogadores').textContent = jogadores || 0;
        
        const { data: teams } = await supabase.from('teams').select('id');
        document.getElementById('total-times').textContent = teams?.length || 0;
        
        const { count: rodadas } = await supabase
            .from('rounds')
            .select('*', { count: 'exact', head: true });
        document.getElementById('total-rodadas').textContent = rodadas || 0;
        
        const { count: usuarios } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        document.getElementById('total-usuarios').textContent = usuarios || 0;
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// ============================================
// SISTEMA DE TABS - CORRIGIDO
// ============================================

function setupTabs() {
    console.log('🔧 Configurando sistema de tabs...');
    
    // Selecionar todos os botões de tab
    const tabButtons = document.querySelectorAll('[data-tab]');
    const tabContents = document.querySelectorAll('[data-content]');
    
    console.log('Tabs encontradas:', tabButtons.length);
    console.log('Conteúdos encontrados:', tabContents.length);
    
    // Adicionar evento de clique em cada botão
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            console.log('Tab clicada:', targetTab);
            
            // Remover classe 'active' de todos os botões
            tabButtons.forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
                btn.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
            });
            
            // Adicionar classe 'active' no botão clicado
            this.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
            this.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
            
            // Esconder todos os conteúdos
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            // Mostrar conteúdo da tab selecionada
            const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
                console.log('Conteúdo exibido:', targetTab);
            } else {
                console.error('Conteúdo não encontrado para tab:', targetTab);
            }
        });
    });
    
    // Ativar primeira tab por padrão
    if (tabButtons.length > 0) {
        tabButtons[0].click();
    }
    
    console.log('✅ Sistema de tabs configurado');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Jogadores
    document.getElementById('btn-adicionar-jogador')?.addEventListener('click', adicionarJogador);
    document.getElementById('btn-salvar-edicao-jogador')?.addEventListener('click', salvarEdicaoJogador);
    document.getElementById('btn-cancelar-edicao-jogador')?.addEventListener('click', () => {
        document.getElementById('modal-editar-jogador')?.classList.add('hidden');
    });
    
    // Times
    document.getElementById('btn-adicionar-time')?.addEventListener('click', adicionarTime);
    
    // Rodadas
    document.getElementById('btn-criar-rodada')?.addEventListener('click', criarRodada);
    document.getElementById('btn-iniciar-rodada')?.addEventListener('click', iniciarRodadaSelecionada);
    document.getElementById('btn-finalizar-rodada')?.addEventListener('click', finalizarRodadaSelecionada);
    
    // Scouts
    document.getElementById('btn-salvar-scout')?.addEventListener('click', salvarScout);
}

function setupFiltros() {
    const filtroPosicao = document.getElementById('filtro-posicao-jogadores');
    const filtroTime = document.getElementById('filtro-time-jogadores');
    
    if (filtroPosicao) {
        filtroPosicao.addEventListener('change', filtrarJogadores);
    }
    
    if (filtroTime) {
        filtroTime.addEventListener('change', filtrarJogadores);
    }
}

// ============================================
// JOGADORES
// ============================================

async function carregarJogadores() {
    try {
        const { data: jogadores, error } = await supabase
            .from('players')
            .select(`
                id, name, position, price, photo_url,
                team:teams(name, logo_url)
            `)
            .order('name');
        
        if (error) throw error;
        
        jogadoresCache = jogadores || [];
        renderizarTabelaJogadores(jogadoresCache);
        preencherSelectJogadores(jogadoresCache);
        preencherFiltroTimes();
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
    }
}

function renderizarTabelaJogadores(jogadores) {
    const tbody = document.getElementById('lista-jogadores');
    if (!tbody) return;
    
    if (!jogadores || jogadores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500 dark:text-gray-400">Nenhum jogador encontrado</td></tr>';
        return;
    }
    
    // Placeholder SVG
    const imgPlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' font-size='40' text-anchor='middle' dy='.3em'%3E👤%3C/text%3E%3C/svg%3E";
    
    tbody.innerHTML = jogadores.map(j => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                    <img src="${j.photo_url || imgPlaceholder}" 
                         class="w-10 h-10 rounded-full object-cover" 
                         alt="${j.name}"
                         onerror="this.onerror=null; this.src='${imgPlaceholder}'">
                    <div>
                        <div class="font-semibold text-gray-900 dark:text-white">${j.name}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">${j.team?.name || '-'}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded ${getCorPosicao(j.position)}">${j.position}</span></td>
            <td class="px-4 py-3 text-gray-900 dark:text-white">C$ ${j.price.toFixed(2)}</td>
            <td class="px-4 py-3">
                <button onclick="editarJogador(${j.id})" class="px-3 py-1 bg-blue-600 text-white rounded text-sm mr-2 hover:bg-blue-700">Editar</button>
                <button onclick="excluirJogador(${j.id})" class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function getCorPosicao(posicao) {
    const cores = {
        'GOL': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'FIX': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'ALA': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'PIV': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return cores[posicao] || 'bg-gray-100 text-gray-800';
}

async function adicionarJogador() {
    try {
        const nome = document.getElementById('nome-jogador')?.value.trim();
        const posicao = document.getElementById('posicao-jogador')?.value;
        const preco = parseFloat(document.getElementById('preco-jogador')?.value);
        const timeId = document.getElementById('time-jogador')?.value;
        const fotoUrl = document.getElementById('foto-jogador')?.value.trim();
        
        if (!nome || !posicao || !preco || !timeId) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }
        
        const { error } = await supabase
            .from('players')
            .insert([{ name: nome, position: posicao, price: preco, team_id: timeId, photo_url: fotoUrl || null }]);
        
        if (error) throw error;
        
        alert('Jogador adicionado com sucesso!');
        document.getElementById('form-adicionar-jogador')?.reset();
        await carregarJogadores();
    } catch (error) {
        console.error('Erro ao adicionar jogador:', error);
        alert('Erro ao adicionar jogador');
    }
}

async function editarJogador(id) {
    try {
        const { data: jogador, error } = await supabase
            .from('players')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        document.getElementById('edit-jogador-id').value = jogador.id;
        document.getElementById('edit-nome-jogador').value = jogador.name;
        document.getElementById('edit-posicao-jogador').value = jogador.position;
        document.getElementById('edit-preco-jogador').value = jogador.price;
        document.getElementById('edit-time-jogador').value = jogador.team_id;
        document.getElementById('edit-foto-jogador').value = jogador.photo_url || '';
        
        document.getElementById('modal-editar-jogador')?.classList.remove('hidden');
    } catch (error) {
        console.error('Erro ao carregar jogador:', error);
    }
}

async function salvarEdicaoJogador() {
    try {
        const id = document.getElementById('edit-jogador-id')?.value;
        const nome = document.getElementById('edit-nome-jogador')?.value.trim();
        const posicao = document.getElementById('edit-posicao-jogador')?.value;
        const preco = parseFloat(document.getElementById('edit-preco-jogador')?.value);
        const timeId = document.getElementById('edit-time-jogador')?.value;
        const fotoUrl = document.getElementById('edit-foto-jogador')?.value.trim();
        
        const { error } = await supabase
            .from('players')
            .update({ name: nome, position: posicao, price: preco, team_id: timeId, photo_url: fotoUrl || null })
            .eq('id', id);
        
        if (error) throw error;
        
        alert('Jogador atualizado!');
        document.getElementById('modal-editar-jogador')?.classList.add('hidden');
        await carregarJogadores();
    } catch (error) {
        console.error('Erro ao atualizar jogador:', error);
    }
}

async function excluirJogador(id) {
    if (!confirm('Excluir este jogador?')) return;
    
    try {
        const { error } = await supabase.from('players').delete().eq('id', id);
        if (error) throw error;
        
        alert('Jogador excluído!');
        await carregarJogadores();
    } catch (error) {
        console.error('Erro ao excluir jogador:', error);
    }
}

function filtrarJogadores() {
    const posicao = document.getElementById('filtro-posicao-jogadores')?.value;
    const time = document.getElementById('filtro-time-jogadores')?.value;
    
    let jogadoresFiltrados = [...jogadoresCache];
    
    if (posicao) {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => j.position === posicao);
    }
    
    if (time) {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => j.team?.name === time);
    }
    
    renderizarTabelaJogadores(jogadoresFiltrados);
}

function preencherSelectJogadores(jogadores) {
    const select = document.getElementById('scout-jogador');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um jogador</option>' +
        jogadores.map(j => `<option value="${j.id}">${j.name} - ${j.position}</option>`).join('');
}

function preencherFiltroTimes() {
    const times = [...new Set(jogadoresCache.map(j => j.team?.name).filter(Boolean))];
    times.sort();
    
    const filtro = document.getElementById('filtro-time-jogadores');
    if (!filtro) return;
    
    filtro.innerHTML = '<option value="">Todos</option>' +
        times.map(t => `<option value="${t}">${t}</option>`).join('');
}

// ============================================
// TIMES
// ============================================

async function carregarTimes() {
    try {
        const { data: times, error } = await supabase
            .from('teams')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        timesCache = times || [];
        renderizarTabelaTimes(timesCache);
        preencherSelectTimes(timesCache);
    } catch (error) {
        console.error('Erro ao carregar times:', error);
    }
}

function renderizarTabelaTimes(times) {
    const tbody = document.getElementById('lista-times');
    if (!tbody) return;
    
    if (!times || times.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center py-8 text-gray-500 dark:text-gray-400">Nenhum time cadastrado</td></tr>';
        return;
    }
    
    const logoPlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-size='40' text-anchor='middle' dy='.3em'%3E⚽%3C/text%3E%3C/svg%3E";
    
    tbody.innerHTML = times.map(t => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                    <img src="${t.logo_url || logoPlaceholder}" 
                         class="w-10 h-10 object-contain" 
                         alt="${t.name}"
                         onerror="this.onerror=null; this.src='${logoPlaceholder}'">
                    <span class="font-semibold text-gray-900 dark:text-white">${t.name}</span>
                </div>
            </td>
            <td class="px-4 py-3">
                <button onclick="excluirTime(${t.id})" class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function preencherSelectTimes(times) {
    const selects = document.querySelectorAll('#time-jogador, #edit-time-jogador');
    
    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">Selecione um time</option>' +
            times.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    });
}

async function adicionarTime() {
    try {
        const nome = document.getElementById('nome-time')?.value.trim();
        const logoUrl = document.getElementById('logo-time')?.value.trim();
        
        if (!nome) {
            alert('Digite o nome do time');
            return;
        }
        
        const { error } = await supabase
            .from('teams')
            .insert([{ name: nome, logo_url: logoUrl || null }]);
        
        if (error) throw error;
        
        alert('Time adicionado!');
        document.getElementById('form-adicionar-time')?.reset();
        await carregarTimes();
        await carregarJogadores();
    } catch (error) {
        console.error('Erro ao adicionar time:', error);
    }
}

async function excluirTime(id) {
    if (!confirm('Excluir este time? Isso afetará os jogadores.')) return;
    
    try {
        const { error } = await supabase.from('teams').delete().eq('id', id);
        if (error) throw error;
        
        alert('Time excluído!');
        await carregarTimes();
        await carregarJogadores();
    } catch (error) {
        console.error('Erro ao excluir time:', error);
    }
}

// ============================================
// RODADAS
// ============================================

async function carregarRodadas() {
    try {
        const { data: rodadas, error } = await supabase
            .from('rounds')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        rodadasCache = rodadas || [];
        renderizarTabelaRodadas(rodadasCache);
        preencherSelectRodadas(rodadasCache);
        preencherSelectGerenciarRodadas(rodadasCache);
    } catch (error) {
        console.error('Erro ao carregar rodadas:', error);
    }
}

function renderizarTabelaRodadas(rodadas) {
    const tbody = document.getElementById('lista-rodadas');
    if (!tbody) return;
    
    if (!rodadas || rodadas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-8 text-gray-500 dark:text-gray-400">Nenhuma rodada criada</td></tr>';
        return;
    }
    
    tbody.innerHTML = rodadas.map(r => {
        const statusClass = r.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                           r.status === 'finished' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                           'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        
        const statusText = r.status === 'active' ? 'Ativa' :
                          r.status === 'finished' ? 'Finalizada' : 'Pendente';
        
        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">${r.name}</td>
                <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded ${statusClass}">${statusText}</span></td>
                <td class="px-4 py-3">
                    ${r.status === 'pending' ? `<button onclick="iniciarRodada(${r.id})" class="px-3 py-1 bg-green-600 text-white rounded text-sm mr-2 hover:bg-green-700">Iniciar</button>` : ''}
                    ${r.status === 'active' ? `<button onclick="finalizarRodada(${r.id})" class="px-3 py-1 bg-blue-600 text-white rounded text-sm mr-2 hover:bg-blue-700">Finalizar</button>` : ''}
                    <button onclick="excluirRodada(${r.id})" class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">Excluir</button>
                </td>
            </tr>
        `;
    }).join('');
}

function preencherSelectRodadas(rodadas) {
    const select = document.getElementById('scout-rodada');
    if (!select) return;
    
    const rodadasAtivas = rodadas.filter(r => r.status === 'active');
    select.innerHTML = '<option value="">Selecione uma rodada</option>' +
        rodadasAtivas.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
}

function preencherSelectGerenciarRodadas(rodadas) {
    const select = document.getElementById('rodada-gerenciar');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione uma rodada...</option>' +
        rodadas.map(r => `<option value="${r.id}">${r.name} - ${r.status}</option>`).join('');
}

async function criarRodada() {
    try {
        const nome = document.getElementById('nome-rodada')?.value.trim();
        
        if (!nome) {
            alert('Digite o nome da rodada');
            return;
        }
        
        const { error } = await supabase
            .from('rounds')
            .insert([{ name: nome, status: 'pending' }]);
        
        if (error) throw error;
        
        alert('Rodada criada!');
        document.getElementById('form-criar-rodada')?.reset();
        await carregarRodadas();
    } catch (error) {
        console.error('Erro ao criar rodada:', error);
    }
}

async function iniciarRodada(id) {
    if (!confirm('Iniciar esta rodada? O mercado será fechado.')) return;
    
    try {
        const { error } = await supabase
            .from('rounds')
            .update({ status: 'active' })
            .eq('id', id);
        
        if (error) throw error;
        
        alert('Rodada iniciada! Mercado fechado.');
        await carregarRodadas();
    } catch (error) {
        console.error('Erro ao iniciar rodada:', error);
    }
}

async function finalizarRodada(id) {
    if (!confirm('Finalizar esta rodada?\n\n- O mercado será reaberto\n- As cartoletas serão restauradas\n\nDeseja continuar?')) {
        return;
    }
    
    try {
        console.log('═══════════════════════════════════════');
        console.log('🏁 INICIANDO FINALIZAÇÃO DA RODADA', id);
        console.log('═══════════════════════════════════════');
        
        // PASSO 1: Buscar informações da rodada
        const { data: rodada, error: errorRodada } = await supabase
            .from('rounds')
            .select('id, name, status')
            .eq('id', id)
            .single();
        
        if (errorRodada) {
            console.error('❌ Erro ao buscar rodada:', errorRodada);
            throw new Error('Rodada não encontrada');
        }
        
        console.log('📋 Rodada:', rodada.name, '- Status:', rodada.status);
        
        // PASSO 2: Buscar TODAS as escalações desta rodada
        const { data: escalacoes, error: errorEscalacoes } = await supabase
            .from('lineups')
            .select('id, user_id, round_id')
            .eq('round_id', id);
        
        if (errorEscalacoes) {
            console.error('❌ Erro ao buscar escalações:', errorEscalacoes);
            throw new Error('Erro ao buscar escalações');
        }
        
        console.log(`\n📊 Total de escalações encontradas: ${escalacoes?.length || 0}`);
        
        if (!escalacoes || escalacoes.length === 0) {
            console.log('ℹ️ Nenhuma escalação para restaurar');
            
            // Finalizar rodada mesmo sem escalações
            const { error: errorUpdate } = await supabase
                .from('rounds')
                .update({ status: 'finished' })
                .eq('id', id);
            
            if (errorUpdate) throw errorUpdate;
            
            alert('✅ Rodada finalizada!\n\nNenhuma escalação foi criada nesta rodada.');
            await carregarRodadas();
            return;
        }
        
        // PASSO 3: Para cada escalação, restaurar cartoletas
        let totalRestaurado = 0;
        let usuariosProcessados = 0;
        let erros = 0;
        
        for (const escalacao of escalacoes) {
            console.log(`\n─────────────────────────────────────`);
            console.log(`👤 Processando escalação ID: ${escalacao.id}`);
            console.log(`   Usuário ID: ${escalacao.user_id}`);
            
            try {
                // Buscar jogadores da escalação
                const { data: jogadoresEscalacao, error: errorJogadores } = await supabase
                    .from('lineup_players')
                    .select('player_id, players(id, name, price)')
                    .eq('lineup_id', escalacao.id);
                
                if (errorJogadores) {
                    console.error('   ❌ Erro ao buscar jogadores:', errorJogadores);
                    erros++;
                    continue;
                }
                
                // Calcular custo total
                let custoTotal = 0;
                console.log('   🎮 Jogadores escalados:');
                
                if (jogadoresEscalacao && jogadoresEscalacao.length > 0) {
                    jogadoresEscalacao.forEach(jp => {
                        if (jp.players) {
                            const preco = parseFloat(jp.players.price) || 0;
                            custoTotal += preco;
                            console.log(`      • ${jp.players.name}: C$ ${preco.toFixed(2)}`);
                        }
                    });
                }
                
                console.log(`   💵 Custo total da escalação: C$ ${custoTotal.toFixed(2)}`);
                
                if (custoTotal <= 0) {
                    console.log('   ⚠️ Custo zero, pulando restauração');
                    continue;
                }
                
                // Buscar saldo atual do usuário
                const { data: usuario, error: errorUsuario } = await supabase
                    .from('users')
                    .select('id, team_name, cartoletas')
                    .eq('id', escalacao.user_id)
                    .single();
                
                if (errorUsuario) {
                    console.error('   ❌ Erro ao buscar usuário:', errorUsuario);
                    erros++;
                    continue;
                }
                
                const saldoAtual = parseFloat(usuario.cartoletas) || 0;
                const novoSaldo = saldoAtual + custoTotal;
                
                console.log(`   📊 Saldo atual: C$ ${saldoAtual.toFixed(2)}`);
                console.log(`   ➕ Restaurando: C$ ${custoTotal.toFixed(2)}`);
                console.log(`   💰 Novo saldo: C$ ${novoSaldo.toFixed(2)}`);
                
                // Atualizar saldo
                const { error: errorUpdateSaldo } = await supabase
                    .from('users')
                    .update({ cartoletas: novoSaldo })
                    .eq('id', usuario.id);
                
                if (errorUpdateSaldo) {
                    console.error('   ❌ Erro ao atualizar saldo:', errorUpdateSaldo);
                    erros++;
                    continue;
                }
                
                console.log(`   ✅ Saldo restaurado com sucesso!`);
                
                totalRestaurado += custoTotal;
                usuariosProcessados++;
                
            } catch (erro) {
                console.error(`   ❌ Erro ao processar escalação ${escalacao.id}:`, erro);
                erros++;
            }
        }
        
        console.log(`\n═══════════════════════════════════════`);
        console.log('📊 RESUMO DA RESTAURAÇÃO:');
        console.log(`   • Usuários processados: ${usuariosProcessados}`);
        console.log(`   • Total restaurado: C$ ${totalRestaurado.toFixed(2)}`);
        console.log(`   • Erros: ${erros}`);
        console.log('═══════════════════════════════════════\n');
        
        // PASSO 4: Finalizar a rodada
        const { error: errorFinalizar } = await supabase
            .from('rounds')
            .update({ status: 'finished' })
            .eq('id', id);
        
        if (errorFinalizar) {
            console.error('❌ Erro ao finalizar rodada:', errorFinalizar);
            throw new Error('Erro ao atualizar status da rodada');
        }
        
        console.log('✅ Rodada finalizada com sucesso!');
        
        // Mensagem de sucesso
        alert(
            `✅ RODADA FINALIZADA COM SUCESSO!\n\n` +
            `📊 Resumo:\n` +
            `• ${usuariosProcessados} usuário(s) restaurado(s)\n` +
            `• Total: C$ ${totalRestaurado.toFixed(2)}\n` +
            `• Mercado: ABERTO\n\n` +
            (erros > 0 ? `⚠️ ${erros} erro(s) - verifique o console` : '✅ Sem erros')
        );
        
        // Recarregar lista
        await carregarRodadas();
        
    } catch (error) {
        console.error('═══════════════════════════════════════');
        console.error('❌ ERRO CRÍTICO NA FINALIZAÇÃO:', error);
        console.error('═══════════════════════════════════════');
        alert(`❌ Erro ao finalizar rodada:\n\n${error.message}\n\nVerifique o console (F12) para detalhes.`);
    }
}




// ============================================
// FUNÇÃO AUXILIAR: Verificar Restauração
// ============================================

/**
 * Função para verificar se as cartoletas foram restauradas corretamente
 * Útil para debug
 */
async function verificarRestauracao(roundId) {
    try {
        console.log('🔍 Verificando restauração da rodada:', roundId);
        
        const { data: escalacoes } = await supabase
            .from('lineups')
            .select(`
                user_id,
                users (
                    team_name,
                    cartoletas
                ),
                lineup_players (
                    players (
                        name,
                        price
                    )
                )
            `)
            .eq('round_id', roundId);
        
        console.log('📊 Relatório de Restauração:');
        console.log('================================');
        
        escalacoes?.forEach((esc, index) => {
            let custo = 0;
            esc.lineup_players?.forEach(lp => {
                custo += parseFloat(lp.players?.price || 0);
            });
            
            console.log(`\n${index + 1}. ${esc.users?.team_name}`);
            console.log(`   Custo da Escalação: C$ ${custo.toFixed(2)}`);
            console.log(`   Saldo Atual: C$ ${parseFloat(esc.users?.cartoletas || 0).toFixed(2)}`);
            console.log(`   Jogadores: ${esc.lineup_players?.length || 0}`);
        });
        
        console.log('\n================================');
        
    } catch (error) {
        console.error('Erro ao verificar restauração:', error);
    }
}

// ============================================
// FUNÇÃO AUXILIAR: Restauração Manual
// ============================================

/**
 * Função para restaurar cartoletas manualmente se houver algum problema
 * USE APENAS SE NECESSÁRIO
 */
async function restaurarCartoletasManual(roundId) {
    if (!confirm('⚠️ ATENÇÃO: Esta função restaura cartoletas manualmente.\n\n' +
                 'Use apenas se houve algum erro na restauração automática.\n\n' +
                 'Deseja continuar?')) {
        return;
    }
    
    try {
        console.log('🔧 Iniciando restauração manual...');
        
        const { data: escalacoes } = await supabase
            .from('lineups')
            .select(`
                id,
                user_id,
                lineup_players (
                    players (
                        price
                    )
                )
            `)
            .eq('round_id', roundId);
        
        let totalRestaurado = 0;
        let usuariosAfetados = 0;
        
        for (const escalacao of escalacoes || []) {
            let custoEscalacao = 0;
            
            escalacao.lineup_players?.forEach(lp => {
                custoEscalacao += parseFloat(lp.players?.price || 0);
            });
            
            if (custoEscalacao > 0) {
                const { data: usuario } = await supabase
                    .from('users')
                    .select('cartoletas')
                    .eq('id', escalacao.user_id)
                    .single();
                
                const novoSaldo = parseFloat(usuario?.cartoletas || 0) + custoEscalacao;
                
                await supabase
                    .from('users')
                    .update({ cartoletas: novoSaldo })
                    .eq('id', escalacao.user_id);
                
                totalRestaurado += custoEscalacao;
                usuariosAfetados++;
                
                console.log(`✅ Usuário ${escalacao.user_id}: +C$ ${custoEscalacao.toFixed(2)}`);
            }
        }
        
        alert(`✅ Restauração manual concluída!\n\n` +
              `👥 Usuários afetados: ${usuariosAfetados}\n` +
              `💰 Total restaurado: C$ ${totalRestaurado.toFixed(2)}`);
        
        console.log('✅ Restauração manual concluída');
        
    } catch (error) {
        console.error('❌ Erro na restauração manual:', error);
        alert('❌ Erro na restauração manual: ' + error.message);
    }
}

// ============================================
// FUNÇÃO: Resetar Saldo de Todos os Usuários
// ============================================

/**
 * Função para resetar o saldo de TODOS os usuários para C$ 40.00
 * USE APENAS NO INÍCIO DE UMA NOVA TEMPORADA
 */
async function resetarSaldoTodosUsuarios() {
    if (!confirm('⚠️ ATENÇÃO: Esta ação vai resetar o saldo de TODOS os usuários para C$ 40.00!\n\n' +
                 'Use apenas no início de uma nova temporada.\n\n' +
                 'Esta ação NÃO pode ser desfeita!\n\n' +
                 'Deseja continuar?')) {
        return;
    }
    
    if (!confirm('Você tem CERTEZA ABSOLUTA?\n\nDigite SIM para confirmar.') === 'SIM') {
        alert('Operação cancelada.');
        return;
    }
    
    try {
        console.log('🔄 Resetando saldo de todos os usuários...');
        
        const { data: usuarios, error: errorUsuarios } = await supabase
            .from('users')
            .select('id, team_name, cartoletas');
        
        if (errorUsuarios) throw errorUsuarios;
        
        for (const usuario of usuarios || []) {
            await supabase
                .from('users')
                .update({ cartoletas: 40.00 })
                .eq('id', usuario.id);
            
            console.log(`✅ ${usuario.team_name}: C$ ${usuario.cartoletas} → C$ 40.00`);
        }
        
        alert(`✅ Saldo resetado!\n\n${usuarios?.length || 0} usuários agora têm C$ 40.00`);
        
        console.log('✅ Reset de saldo concluído');
        
    } catch (error) {
        console.error('❌ Erro ao resetar saldos:', error);
        alert('❌ Erro: ' + error.message);
    }
}

async function excluirRodada(id) {
    if (!confirm('Excluir esta rodada? Isso é irreversível.')) return;
    
    try {
        const { error } = await supabase.from('rounds').delete().eq('id', id);
        if (error) throw error;
        
        alert('Rodada excluída!');
        await carregarRodadas();
    } catch (error) {
        console.error('Erro ao excluir rodada:', error);
    }
}

function iniciarRodadaSelecionada() {
    const select = document.getElementById('rodada-gerenciar');
    const rodadaId = select?.value;
    if (rodadaId) iniciarRodada(parseInt(rodadaId));
}

function finalizarRodadaSelecionada() {
    const select = document.getElementById('rodada-gerenciar');
    const rodadaId = select?.value;
    if (rodadaId) finalizarRodada(parseInt(rodadaId));
}

// ============================================
// SCOUTS
// ============================================

async function salvarScout() {
    try {
        const rodadaId = document.getElementById('scout-rodada')?.value;
        const jogadorId = document.getElementById('scout-jogador')?.value;
        
        if (!rodadaId || !jogadorId) {
            alert('Selecione rodada e jogador');
            return;
        }
        
        const scouts = {
            goals: parseInt(document.getElementById('scout-gols')?.value || 0),
            assists: parseInt(document.getElementById('scout-assistencias')?.value || 0),
            shots_on_target: parseInt(document.getElementById('scout-finalizacoes')?.value || 0),
            saves: parseInt(document.getElementById('scout-defesas')?.value || 0),
            clean_sheet: document.getElementById('scout-sem-gols')?.checked ? 1 : 0,
            own_goals: parseInt(document.getElementById('scout-gols-contra')?.value || 0),
            yellow_cards: parseInt(document.getElementById('scout-amarelos')?.value || 0),
            red_cards: parseInt(document.getElementById('scout-vermelhos')?.value || 0),
            fouls: parseInt(document.getElementById('scout-faltas')?.value || 0)
        };
        
        // Calcular pontos
        const pontos = (scouts.goals * 8) +
                      (scouts.assists * 5) +
                      (scouts.shots_on_target * 3) +
                      (scouts.saves * 7) +
                      (scouts.clean_sheet * 5) -
                      (scouts.own_goals * 3) -
                      (scouts.yellow_cards * 1) -
                      (scouts.red_cards * 5) -
                      (scouts.fouls * 0.3);
        
        // Salvar no banco
        const { error } = await supabase
            .from('player_stats')
            .insert([{
                round_id: rodadaId,
                player_id: jogadorId,
                ...scouts,
                points: pontos
            }]);
        
        if (error) throw error;
        
        alert(`Scout salvo! Pontuação: ${pontos.toFixed(2)}`);
        document.getElementById('form-scout')?.reset();
    } catch (error) {
        console.error('Erro ao salvar scout:', error);
        alert('Erro ao salvar scout');
    }
}

// Exportar funções globalmente
window.editarJogador = editarJogador;
window.excluirJogador = excluirJogador;
window.excluirTime = excluirTime;
window.iniciarRodada = iniciarRodada;
window.finalizarRodada = finalizarRodada;
window.excluirRodada = excluirRodada;

console.log('✅ admin.js carregado com sistema de tabs corrigido');
