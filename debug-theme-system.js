// Debug do sistema de temas
import 'dotenv/config';

async function debugThemeSystem() {
  console.log('🔍 DEBUG DO SISTEMA DE TEMAS');
  console.log('=' .repeat(60));

  const baseUrl = 'http://localhost:5000';

  try {
    // 1. Verificar se o servidor está rodando
    console.log('\n1️⃣ Verificando servidor...');
    
    try {
      const healthResponse = await fetch(baseUrl);
      console.log(`✅ Servidor rodando: ${healthResponse.status}`);
    } catch (error) {
      console.log(`❌ Servidor não está rodando: ${error.message}`);
      return;
    }

    // 2. Verificar se a página carrega
    console.log('\n2️⃣ Verificando carregamento da página...');
    
    const pageResponse = await fetch(baseUrl);
    if (pageResponse.ok) {
      const pageContent = await pageResponse.text();
      console.log(`✅ Página carregada: ${pageResponse.status}`);
      
      // Verificar se contém elementos de tema
      const hasThemeController = pageContent.includes('theme-controller') || 
                                pageContent.includes('ThemeController');
      const hasThemeCSS = pageContent.includes('themes.css') || 
                         pageContent.includes('--bg-primary');
      const hasDataTheme = pageContent.includes('data-theme');
      
      console.log(`📊 ELEMENTOS DE TEMA NA PÁGINA:`);
      console.log(`   ThemeController presente: ${hasThemeController ? 'SIM' : 'NÃO'}`);
      console.log(`   CSS de temas carregado: ${hasThemeCSS ? 'SIM' : 'NÃO'}`);
      console.log(`   Atributo data-theme: ${hasDataTheme ? 'SIM' : 'NÃO'}`);
      
    } else {
      console.log(`❌ Erro ao carregar página: ${pageResponse.status}`);
    }

    // 3. Verificar problemas potenciais
    console.log('\n3️⃣ Identificando problemas potenciais...');
    
    console.log(`🚨 PROBLEMAS IDENTIFICADOS:`);
    console.log(`   1. CSS conflitante no index.css`);
    console.log(`      - Variáveis CSS existentes podem sobrescrever as nossas`);
    console.log(`      - Classes .dark existentes podem conflitar`);
    console.log(`      - @layer base pode ter prioridade sobre nossos estilos`);
    
    console.log(`   2. Aplicação de classes pode não estar funcionando`);
    console.log(`      - useTheme hook pode não estar aplicando classes ao DOM`);
    console.log(`      - Componentes podem não estar usando as classes corretas`);
    
    console.log(`   3. CSS custom properties podem não estar sendo aplicadas`);
    console.log(`      - Especificidade CSS pode estar causando conflitos`);
    console.log(`      - Ordem de importação pode estar incorreta`);

    // 4. Soluções propostas
    console.log('\n4️⃣ Soluções a serem implementadas...');
    
    console.log(`🔧 CORREÇÕES NECESSÁRIAS:`);
    console.log(`   1. Reorganizar index.css para evitar conflitos`);
    console.log(`   2. Garantir que data-theme seja aplicado ao <html>`);
    console.log(`   3. Verificar se classes temáticas estão sendo aplicadas`);
    console.log(`   4. Ajustar especificidade CSS se necessário`);
    console.log(`   5. Testar aplicação de temas em tempo real`);

    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('   1. Corrigir conflitos CSS no index.css');
    console.log('   2. Verificar aplicação de data-theme no HTML');
    console.log('   3. Testar hook useTheme');
    console.log('   4. Verificar componentes modernos');
    console.log('   5. Testar mudanças de tema em tempo real');

  } catch (error) {
    console.error('\n❌ ERRO DURANTE DEBUG:', error);
  }
}

// Executar debug
debugThemeSystem().catch(console.error);
