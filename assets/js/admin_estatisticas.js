// ============================================
// CARTOLA COACH - SISTEMA DE ESTATÍSTICAS INCREMENTAIS
// ============================================

console.log('🔄 Carregando sistema de estatísticas incrementais...');

// ============================================
// CONSTANTES DE PONTUAÇÃO
// ============================================

const PONTOS_SCOUTS_ADMIN = {
    goals: 8,
    assists: 5,
    shots_on_target: 3,
    saves: 7,
    clean_sheet: 5,
    own_goals: -3,
    red_cards: -5,
    yellow_cards: -1,
    fouls: -0.3
};

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function salvarScoutIncremental() {
    console.log('🎯 salvarScoutIncremental() chamada!');
    
    try {
        const rodadaId = document.getElementById('scout-rodada')?.value;
        const jogadorId = document.getElementById('scout-jogador')?.value;
        
        console.log('Rodada ID:', rodadaId);
        console.log('Jogador ID:', jogadorId);
        
        if (!rodadaId || !jogadorId) {
            alert('⚠️ Por favor, selecione a rodada e o jogador');
            return;
        }
        
        if (typeof supabase === 'undefined') {
            alert('❌ Erro: Supabase não está carregado');
            console.error('Supabase não está definido');
            return;
        }
        
        const novosScouts = {
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
        
        console.log('📝 Novos scouts:', novosScouts);
        
        const temAlgumValor = Object.values(novosScouts).some(v => v > 0);
        if (!temAlgumValor) {
            alert('⚠️ Adicione pelo menos uma estatística (gol, assistência, etc.)');
            return;
        }
        
        console.log('🔍 Buscando estatística existente...');
        
        const { data: estatisticaExistente, error: errorBusca } = await supabase
            .from('player_stats')
            .select('*')
            .eq('round_id', rodadaId)
            .eq('player_id', jogadorId)
            .maybeSingle();
        
        if (errorBusca) {
            console.error('Erro ao buscar:', errorBusca);
            throw errorBusca;
        }
        
        console.log('Estatística existente:', estatisticaExistente);
        
        let scoutsFinais;
        let pontosFinais;
        
        if (estatisticaExistente) {
            console.log('♻️ Acumulando valores...');
            
            scoutsFinais = {
                goals: (estatisticaExistente.goals || 0) + novosScouts.goals,
                assists: (estatisticaExistente.assists || 0) + novosScouts.assists,
                shots_on_target: (estatisticaExistente.shots_on_target || 0) + novosScouts.shots_on_target,
                saves: (estatisticaExistente.saves || 0) + novosScouts.saves,
                clean_sheet: novosScouts.clean_sheet || estatisticaExistente.clean_sheet || 0,
                own_goals: (estatisticaExistente.own_goals || 0) + novosScouts.own_goals,
                yellow_cards: (estatisticaExistente.yellow_cards || 0) + novosScouts.yellow_cards,
                red_cards: (estatisticaExistente.red_cards || 0) + novosScouts.red_cards,
                fouls: (estatisticaExistente.fouls || 0) + novosScouts.fouls
            };
            
            pontosFinais = calcularPontosAdmin(scoutsFinais);
            
            const { error: errorUpdate } = await supabase
                .from('player_stats')
                .update({
                    ...scoutsFinais,
                    points: pontosFinais
                })
                .eq('id', estatisticaExistente.id);
            
            if (errorUpdate) throw errorUpdate;
            
            console.log('✅ Estatística atualizada!');
            
        } else {
            console.log('✨ Criando nova estatística...');
            
            scoutsFinais = novosScouts;
            pontosFinais = calcularPontosAdmin(scoutsFinais);
            
            const { error: errorInsert } = await supabase
                .from('player_stats')
                .insert([{
                    round_id: rodadaId,
                    player_id: jogadorId,
                    ...scoutsFinais,
                    points: pontosFinais
                }]);
            
            if (errorInsert) throw errorInsert;
            
            console.log('✅ Estatística criada!');
        }
        
        const { data: jogador } = await supabase
            .from('players')
            .select('name')
            .eq('id', jogadorId)
            .single();
        
        alert(`✅ Estatísticas ${estatisticaExistente ? 'atualizadas' : 'criadas'} com sucesso!\n\n` +
              `Jogador: ${jogador?.name || 'Desconhecido'}\n` +
              `Pontuação: ${pontosFinais.toFixed(2)} pontos\n\n` +
              `Totais na rodada:\n` +
              `⚽ ${scoutsFinais.goals} gol(s)\n` +
              `🎯 ${scoutsFinais.assists} assistência(s)\n` +
              `🟨 ${scoutsFinais.yellow_cards} amarelo(s)\n` +
              `🟥 ${scoutsFinais.red_cards} vermelho(s)`);
        
        document.getElementById('scout-gols').value = '0';
        document.getElementById('scout-assistencias').value = '0';
        document.getElementById('scout-finalizacoes').value = '0';
        document.getElementById('scout-defesas').value = '0';
        document.getElementById('scout-sem-gols').checked = false;
        document.getElementById('scout-gols-contra').value = '0';
        document.getElementById('scout-amarelos').value = '0';
        document.getElementById('scout-vermelhos').value = '0';
        document.getElementById('scout-faltas').value = '0';
        
        console.log('✅ Processo concluído com sucesso!');
        
    } catch (error) {
        console.error('❌ ERRO:', error);
        alert('❌ Erro ao salvar estatísticas: ' + error.message);
    }
}

function calcularPontosAdmin(scouts) {
    let pontos = 0;
    
    pontos += (scouts.goals || 0) * PONTOS_SCOUTS_ADMIN.goals;
    pontos += (scouts.assists || 0) * PONTOS_SCOUTS_ADMIN.assists;
    pontos += (scouts.shots_on_target || 0) * PONTOS_SCOUTS_ADMIN.shots_on_target;
    pontos += (scouts.saves || 0) * PONTOS_SCOUTS_ADMIN.saves;
    pontos += (scouts.clean_sheet || 0) * PONTOS_SCOUTS_ADMIN.clean_sheet;
    pontos += (scouts.own_goals || 0) * PONTOS_SCOUTS_ADMIN.own_goals;
    pontos += (scouts.red_cards || 0) * PONTOS_SCOUTS_ADMIN.red_cards;
    pontos += (scouts.yellow_cards || 0) * PONTOS_SCOUTS_ADMIN.yellow_cards;
    pontos += (scouts.fouls || 0) * PONTOS_SCOUTS_ADMIN.fouls;
    
    return parseFloat(pontos.toFixed(2));
}

async function visualizarEstatisticasAtuais() {
    console.log('👁️ visualizarEstatisticasAtuais() chamada!');
    
    try {
        const rodadaId = document.getElementById('scout-rodada')?.value;
        const jogadorId = document.getElementById('scout-jogador')?.value;
        
        if (!rodadaId || !jogadorId) {
            alert('⚠️ Selecione a rodada e o jogador primeiro');
            return;
        }
        
        const { data: stats, error } = await supabase
            .from('player_stats')
            .select(`
                *,
                players (name),
                rounds (name)
            `)
            .eq('round_id', rodadaId)
            .eq('player_id', jogadorId)
            .maybeSingle();
        
        if (error) throw error;
        
        if (!stats) {
            alert('ℹ️ Ainda não há estatísticas para este jogador nesta rodada.');
            return;
        }
        
        alert(`📊 ESTATÍSTICAS ATUAIS\n\n` +
              `Jogador: ${stats.players.name}\n` +
              `Rodada: ${stats.rounds.name}\n\n` +
              `⚽ Gols: ${stats.goals || 0}\n` +
              `🎯 Assistências: ${stats.assists || 0}\n` +
              `🎯 Finalizações: ${stats.shots_on_target || 0}\n` +
              `🧤 Defesas: ${stats.saves || 0}\n` +
              `🛡️ Jogo sem gol: ${stats.clean_sheet ? 'Sim' : 'Não'}\n` +
              `😬 Gols contra: ${stats.own_goals || 0}\n` +
              `🟨 Amarelos: ${stats.yellow_cards || 0}\n` +
              `🟥 Vermelhos: ${stats.red_cards || 0}\n` +
              `⚠️ Faltas: ${stats.fouls || 0}\n\n` +
              `💯 PONTUAÇÃO TOTAL: ${stats.points.toFixed(2)} pontos`);
        
    } catch (error) {
        console.error('❌ Erro:', error);
        alert('❌ Erro ao carregar estatísticas: ' + error.message);
    }
}

window.salvarScoutIncremental = salvarScoutIncremental;
window.visualizarEstatisticasAtuais = visualizarEstatisticasAtuais;

console.log('✅ Sistema de estatísticas incrementais carregado com sucesso!');
console.log('✅ Funções disponíveis: salvarScoutIncremental(), visualizarEstatisticasAtuais()');