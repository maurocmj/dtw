import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import JSZip from 'jszip';
import mermaid from 'mermaid';
import { 
  Brain, 
  Mail, 
  MessageSquare, 
  Video, 
  Database, 
  Sparkles, 
  ArrowLeft, 
  Activity, 
  Check, 
  Lock,
  Upload,
  Trash2,
  FileText,
  User,
  LogOut,
  Archive,
  RotateCcw,
  ChevronDown,
  Edit2
} from 'lucide-react';
import OpenAI from 'openai';
import ObsidianGraph from '../../components/MindSync/ObsidianGraph';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Usado apenas para fins de MVP rápido. Em produção usaremos Edge Functions do Supabase!
});

function parseInlineMarkdown(text) {
  if (!text) return '';
  const elements = [];
  let i = 0;
  let currentText = '';
  
  while (i < text.length) {
    if (text.startsWith('**', i)) {
      if (currentText) {
        elements.push(currentText);
        currentText = '';
      }
      const closingIdx = text.indexOf('**', i + 2);
      if (closingIdx !== -1) {
        const boldText = text.substring(i + 2, closingIdx);
        elements.push(
          <strong key={i} style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
            {boldText}
          </strong>
        );
        i = closingIdx + 2;
      } else {
        currentText += '**';
        i += 2;
      }
    } else if (text.startsWith('*', i)) {
      if (currentText) {
        elements.push(currentText);
        currentText = '';
      }
      const closingIdx = text.indexOf('*', i + 1);
      if (closingIdx !== -1) {
        const italicText = text.substring(i + 1, closingIdx);
        elements.push(
          <em key={i} style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
            {italicText}
          </em>
        );
        i = closingIdx + 1;
      } else {
        currentText += '*';
        i += 1;
      }
    } else {
      currentText += text[i];
      i++;
    }
  }
  
  if (currentText) {
    elements.push(currentText);
  }
  
  return elements;
}

function renderMarkdown(text) {
  if (!text) return null;

  // Pre-processamento para garantir que cabeçalhos e listas fiquem em novas linhas
  const formattedText = text
    .replace(/\s*(###|##|#)\s*/g, '\n$1 ')
    .replace(/\s+-\s+/g, '\n- ')
    .replace(/\s+(\d+)\.\s+\*\*/g, '\n$1. **')
    .trim();

  const lines = formattedText.split('\n');
  let listItems = [];
  const elements = [];

  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} style={{ paddingLeft: '0px', marginBottom: '16px', listStylePosition: 'outside' }}>
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(index);
      elements.push(<div key={`empty-${index}`} style={{ height: '8px' }} />);
      return;
    }

    // Headings
    if (trimmed.startsWith('###')) {
      flushList(index);
      elements.push(
        <h4 key={`h3-${index}`} style={{ fontSize: '15px', fontWeight: '600', marginTop: '18px', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
          {parseInlineMarkdown(trimmed.replace(/^###\s*/, ''))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('##')) {
      flushList(index);
      elements.push(
        <h3 key={`h2-${index}`} style={{ fontSize: '17px', fontWeight: '600', marginTop: '22px', marginBottom: '10px', color: 'var(--color-text-primary)' }}>
          {parseInlineMarkdown(trimmed.replace(/^##\s*/, ''))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('#')) {
      flushList(index);
      elements.push(
        <h2 key={`h1-${index}`} style={{ fontSize: '20px', fontWeight: '600', marginTop: '26px', marginBottom: '12px', color: 'var(--color-text-primary)' }}>
          {parseInlineMarkdown(trimmed.replace(/^#\s*/, ''))}
        </h2>
      );
      return;
    }

    // List items (bullet points)
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\.\s/.test(trimmed)) {
      const cleanText = trimmed.replace(/^[-*]\s*|^\d+\.\s*/, '');
      const listStyle = /^\d+\.\s/.test(trimmed) ? 'decimal' : 'disc';
      
      listItems.push(
        <li key={`li-${index}`} style={{ marginBottom: '6px', lineHeight: '1.6', fontSize: '14.5px', listStyleType: listStyle, marginLeft: '20px' }}>
          {parseInlineMarkdown(cleanText)}
        </li>
      );
      return;
    }

    // If it's a regular text line but we had list items, flush it
    flushList(index);

    // Regular paragraph
    elements.push(
      <p key={`p-${index}`} style={{ marginBottom: '10px', lineHeight: '1.65', fontSize: '14.5px', color: 'var(--color-text-primary)' }}>
        {parseInlineMarkdown(line)}
      </p>
    );
  });

  flushList('final');
  return elements;
}

function extractSections(text) {
  const sections = {
    directives: '',
    disc: '',
    mbti: '',
    bigfive: '',
    pda: ''
  };

  if (!text) return sections;

  const parts = text.split(/(?=###\s+)/g);
  let directivesText = '';

  parts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed.startsWith('###')) return;
    if (trimmed.startsWith('### 1.') || trimmed.startsWith('### 2.') || trimmed.startsWith('### 3.') || 
        trimmed.startsWith('### Resumo') || trimmed.startsWith('### Diretrizes') || trimmed.startsWith('### Escopo')) {
      directivesText += part + '\n\n';
    } else if (trimmed.toLowerCase().includes('disc')) {
      sections.disc = part.replace(/^###\s+.*?\n/, '');
    } else if (trimmed.toLowerCase().includes('mbti')) {
      sections.mbti = part.replace(/^###\s+.*?\n/, '');
    } else if (trimmed.toLowerCase().includes('big five') || trimmed.toLowerCase().includes('bigfive')) {
      sections.bigfive = part.replace(/^###\s+.*?\n/, '');
    } else if (trimmed.toLowerCase().includes('pda')) {
      sections.pda = part.replace(/^###\s+.*?\n/, '');
    } else {
      if (!part.startsWith('### 4') && !part.startsWith('### 5') && !part.startsWith('### 6') && !part.startsWith('### 7')) {
        directivesText += part + '\n\n';
      }
    }
  });

  sections.directives = directivesText.trim();
  return sections;
}

// Inicializar Mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
  themeVariables: {
    primaryColor: '#eef6ff',
    primaryTextColor: '#0071e3',
    primaryBorderColor: '#0071e3',
    lineColor: '#0071e3',
    nodeBorder: '#0071e3'
  }
});

let mermaidIdCounter = 0;

function Mermaid({ chart }) {
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const elementId = `mermaid-diagram-${++mermaidIdCounter}`;

    const renderDiagram = async () => {
      try {
        let cleanChart = chart.trim().replace(/;/g, '\n');
        if (!cleanChart.startsWith('graph') && !cleanChart.startsWith('flowchart')) {
          cleanChart = `graph TD\n${cleanChart}`;
        }

        const { svg } = await mermaid.render(elementId, cleanChart);
        
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err) {
        console.error('Erro na renderização do Mermaid:', err);
        if (isMounted) {
          setError('Erro de sintaxe no fluxograma.');
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div style={{ color: '#ff3b30', fontSize: '13px', padding: '12px', backgroundColor: '#ffeef0', borderRadius: '8px', textAlign: 'center', width: '100%' }}>
        <strong>Aviso:</strong> {error}
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px' }}>
        <div className="spinner" style={{ borderTopColor: 'var(--color-accent)', width: '16px', height: '16px' }} />
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Gerando fluxograma...</span>
      </div>
    );
  }

  return (
    <div 
      style={{ display: 'flex', justifyContent: 'center', width: '100%', overflowX: 'auto', padding: '10px' }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

const TOTAL_QUESTIONS = 5; // Excluindo o formulário que é o Pilar 1

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false); // Quando terminou as 5 perguntas
  const [isFinished, setIsFinished] = useState(false);   // Quando clicou em "Finalizar e Ativar"
  const [pageLoading, setPageLoading] = useState(true);   // Controla a exibição da tela de carregamento inicial
  const [savingStatus, setSavingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState('directives'); // 'directives' ou 'dna'

  // Estados de upload de arquivos e ajustes de IA
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState({
    email: false,
    whatsapp: false,
    meeting: false,
    document: false
  });
  const [pendingUpload, setPendingUpload] = useState(null);
  const [editingFileId, setEditingFileId] = useState(null);
  const [editDescValue, setEditDescValue] = useState('');
  const [assistantChatMessages, setAssistantChatMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o seu analista de Gêmeo Digital. Como podemos aprimorar o seu Gêmeo hoje? Você pode indicar mudanças no tom, novas regras de delegação ou correções de comportamento.' }
  ]);
  const [assistantChatInput, setAssistantChatInput] = useState('');
  const [assistantChatLoading, setAssistantChatLoading] = useState(false);

  // Estados do Chat em Tempo Real com o Gêmeo
  const [twinChatMessages, setTwinChatMessages] = useState([
    { role: 'assistant', content: `Olá! Sou o seu Gêmeo Digital recém-ativado. Como posso te ajudar a responder e-mails, analisar decisões ou delegar tarefas hoje?` }
  ]);
  const [twinInput, setTwinInput] = useState('');
  const [twinChatLoading, setTwinChatLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [processesLoading, setProcessesLoading] = useState(false);
  const [mappingProcessesLoading, setMappingProcessesLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedProcesses, setExpandedProcesses] = useState({});
  
  // Escalas dinâmicas (Sliding Scales)
  const [traits, setTraits] = useState({
    decisionSpeed: 50,
    decisionData: 50,
    leadershipAutonomy: 50,
    leadershipEmpathy: 50,
    commDirect: 50,
    commFormal: 50
  });

  const loadProcesses = async (userId) => {
    setProcessesLoading(true);
    try {
      const { data, error } = await supabase
        .from('dtw_processes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProcesses(data || []);
    } catch (err) {
      console.error('Erro ao carregar processos:', err);
    } finally {
      setProcessesLoading(false);
    }
  };

  const messagesEndRef = useRef(null);

  // Carregar dados e sessão
  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setPageLoading(false);
          return;
        }
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const currentUser = currentSession?.user || user;
        setAuthUser(currentUser);

        // 1. Puxar o perfil preenchido no BasicForm (Pilar 1)
        const { data: prof } = await supabase
          .from('dtw_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfile(prof);

        // Puxar documentos associados ao usuário
        const { data: docs } = await supabase
          .from('dtw_documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (docs) {
          setUploadedFiles(docs);
        }

        // 2. Puxar a última sessão, independente do status
        let { data: sess } = await supabase
          .from('dtw_mind_sync_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sess && sess.status === 'completed') {
          setSession(sess);
          setIsCompleted(true);
          setIsFinished(true);
          
          // Carregar histórico
          const { data: msgs } = await supabase
            .from('dtw_messages')
            .select('*')
            .eq('session_id', sess.id)
            .order('created_at', { ascending: true });
          
          if (msgs) {
            setMessages(msgs.map(m => ({ role: m.role, content: m.content })));
          }
          await loadProcesses(user.id);
        } else {
          // Se a sessão não existir ou não estiver in_progress, criamos uma nova
          if (!sess || sess.status !== 'in_progress') {
            const { data: newSess } = await supabase
              .from('dtw_mind_sync_sessions')
              .insert({ user_id: user.id, status: 'in_progress' })
              .select()
              .single();
            sess = newSess;
          }
          setSession(sess);

          // Carregar histórico da sessão em andamento
          const { data: msgs } = await supabase
            .from('dtw_messages')
            .select('*')
            .eq('session_id', sess.id)
            .order('created_at', { ascending: true });

          if (msgs && msgs.length > 0) {
            setMessages(msgs.map(m => ({ role: m.role, content: m.content })));
            // Verificar se já tinha concluído mas não clicado em finalizar
            const userCount = msgs.filter(m => m.role === 'user').length;
            if (userCount >= TOTAL_QUESTIONS) {
              setIsCompleted(true);
            }
          } else {
            // Saudação inicial customizada e focada no Pilar 2 (Vetor de Decisão)
            const greeting = `Olá${prof?.name ? ' ' + prof.name : ''}! Sou o seu analista de Gêmeo Digital. Mapeando seu papel como **${prof?.job_title || 'Liderança'}** na área de **${prof?.industry || 'Negócios'}**, entendo que seu principal desafio é: *"${prof?.main_challenges || 'escalar a operação'}"*.

Para criarmos um clone cognitivo capaz de agir com a sua inteligência, começaremos pelo **Pilar 2: Vetor de Decisão & Apetite ao Risco**. 

Como líder nesta organização, você enfrenta dilemas constantes. Para calibrarmos sua mente: **Pense em uma decisão estratégica recente altamente complexa em sua empresa.** O que estava em jogo, qual foi o seu racional lógico ou intuição para tomar a decisão final, e qual foi a sua tolerância ao risco naquele cenário?`;
            
            await supabase.from('dtw_messages').insert({
              session_id: sess.id,
              role: 'assistant',
              content: greeting
            });
            
            setMessages([{ role: 'assistant', content: greeting }]);
          }
        }
      } catch (err) {
        console.error('Erro ao inicializar MindSync:', err);
      } finally {
        setPageLoading(false);
      }
    }
    init();
  }, []);

  // Rolar para baixo a cada nova mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Atualizar as barras deslizantes dinamicamente baseado na fase do chat
  useEffect(() => {
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    
    if (userMsgCount === 0) {
      setTraits({
        decisionSpeed: 50,
        decisionData: 50,
        leadershipAutonomy: 50,
        leadershipEmpathy: 50,
        commDirect: 50,
        commFormal: 50
      });
    } else if (userMsgCount === 1) {
      setTraits(t => ({ ...t, decisionSpeed: 70, decisionData: 65 }));
    } else if (userMsgCount === 2) {
      setTraits(t => ({ ...t, decisionSpeed: 75, decisionData: 70, leadershipAutonomy: 45, leadershipEmpathy: 55 }));
    } else if (userMsgCount === 3) {
      setTraits(t => ({ ...t, decisionSpeed: 75, decisionData: 70, leadershipAutonomy: 40, leadershipEmpathy: 60, commDirect: 75, commFormal: 35 }));
    } else if (userMsgCount === 4) {
      setTraits(t => ({ ...t, decisionSpeed: 78, decisionData: 72, leadershipAutonomy: 38, leadershipEmpathy: 62, commDirect: 78, commFormal: 32 }));
    } else if (userMsgCount >= TOTAL_QUESTIONS) {
      setTraits({
        decisionSpeed: 80,
        decisionData: 75,
        leadershipAutonomy: 35,
        leadershipEmpathy: 65,
        commDirect: 80,
        commFormal: 30
      });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !session || isCompleted) return;

    const userText = input.trim();
    setInput('');
    setLoading(true);

    const newUserMsg = { role: 'user', content: userText };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);

    // Salvar no Banco (Supabase)
    await supabase.from('dtw_messages').insert({
      session_id: session.id,
      role: 'user',
      content: userText
    });

    const userMessages = updatedMessages.filter(m => m.role === 'user');
    const userMsgCount = userMessages.length;

    try {
      // Determinar instrução baseada na etapa
      let promptInstruction = '';
      if (userMsgCount === 1) {
        promptInstruction = `O usuário respondeu ao Pilar 2 (Vetor de Decisão). Agora, analise a resposta dele sob a ótica de perfil comportamental (relacionado ao Vetor de Decisão do PDA e MBTI). Em seguida, formule uma pergunta profunda e altamente desafiadora sobre o Pilar 3 (Liderança, Delegação & Equipe). Foque em como ele atua como ${profile?.job_title} em ${profile?.industry} quando há divergência estratégica na equipe ou quando a execução não acompanha sua velocidade. Evite perguntas óbvias ou superficiais, instigue-o.`;
      } else if (userMsgCount === 2) {
        promptInstruction = `Analise a resposta do usuário sob a ótica de DISC (ex: Dominância vs Estabilidade) e Big Five. Formule uma pergunta técnica sobre o Pilar 4: Tom de Voz, Comunicação e Resolução de Crises. Apresente um cenário de feedback de alta fricção ou crise operacional, solicitando a estruturação estratégica do tom dessa comunicação.`;
      } else if (userMsgCount === 3) {
        promptInstruction = `Analise a resposta do usuário sob a ótica do Pilar 4. Formule uma questão técnica sobre o Pilar 5: Diretrizes, Visão de Negócio & Valores inegociáveis. Conecte com o PDA (Apetite ao Risco e Autoconfiança) e com as responsabilidades do cargo de ${profile?.job_title}. Identifique as tarefas passíveis de delegação integral para o Gêmeo Digital e os limites éticos ou estratégicos de atuação.`;
      } else if (userMsgCount === 4) {
        promptInstruction = `Analise a resposta do usuário sob a ótica do Pilar 5. Formule uma questão sobre o Pilar 6: Repertório de Conhecimento e Bagagem Intelectual. Solicite a descrição de formação acadêmica, cursos, literatura técnica ou referências fundamentais que moldam o estilo de liderança para calibração do vocabulário e fundamentação do Gêmeo.`;
      } else {
        promptInstruction = `O processo de mapeamento foi concluído.
Crie uma Análise Comportamental e Cognitiva de altíssimo nível (McKinsey / Korn Ferry style).
O relatório DEVE conter exatamente as seguintes seções estruturadas formatadas em Markdown com estes títulos de cabeçalhos específicos (use "###" para os títulos):

ATENÇÃO CRÍTICA PARA O ESTILO DO RELATÓRIO:
- O relatório deve ser 100% técnico, executivo, direto ao ponto e escrito em TERCEIRA PESSOA.
- Nunca adicione saudações, introduções pessoais, agradecimentos ou diálogo direto com o usuário (NÃO use frases como "Obrigado, [Nome]", "Sua decisão de...", "Conforme você mencionou...", etc.).
- Detalhe diretamente como é o comportamento e a operação do Gêmeo Digital sob a ótica de cada aspecto cognitivo e comportamental.

### 1. Resumo Executivo do Gêmeo Digital
Um resumo sobre a postura do clone de ${profile?.name} e como ele deve agir profissionalmente em seu nome. Certifique-se de incorporar a formação acadêmica, mestrado/doutorado e cursos principais do usuário para dar fundamentação intelectual à atuação do clone.

### 2. Diretrizes de Tom e Comunicação
Instruções precisas de estilo de escrita, vocabulário e tom de voz (objetivo, direto, polido). Integre referências teóricas ou estilo de pensamento inspirados nos livros e autores favoritos informados pelo usuário.

### 3. Escopo de Atuação & Delegação
Foco no cargo de ${profile?.job_title} em ${profile?.industry}. Quais tarefas o Gêmeo está autorizado a rodar de forma autônoma e quais são seus limites inegociáveis.

### 4. Diagnóstico DISC
Faça uma análise profunda, direta e em terceira pessoa do perfil DISC (Dominância, Influência, Estabilidade, Conformidade) do usuário. Detalhe como o Gêmeo Digital se comporta operacionalmente sob essa ótica, eliminando qualquer menção direta ao usuário.

### 5. Diagnóstico MBTI
Identifique e explique o tipo psicológico estimado (ex: ENTJ, INTJ, etc.) de forma direta e em terceira pessoa. Descreva como o Gêmeo operará no ambiente de liderança dele baseado nesse tipo.

### 6. Diagnóstico Big Five
Analise de forma direta, objetiva e em terceira pessoa os cinco grandes traços (Abertura, Conscienciosidade, Extroversão, Amabilidade, Resiliência). Detalhe especificamente como o Gêmeo Digital se comporta, prioriza, toma decisões e organiza tarefas sob a ótica desses traços, sem saudações ou direcionamentos pessoais ao usuário.

### 7. Diagnóstico PDA
Avalie em terceira pessoa o perfil PDA (dinamismo, apetite ao risco, autoconfiança, orientação para ação) do usuário e descreva o impacto operacional direto dessas forças no comportamento de tomada de decisão do Gêmeo.`;
      }

      const systemPrompt = `Você é um Analista Comportamental e Especialista em Clonagem de Mentes (Mind Sync) para executivos. 
Seu objetivo é entrevistar o usuário para mapear seu modelo mental profissional e criar um relatório de perfil cognitivo e de liderança fundamentado em metodologias (DISC, MBTI, Big Five, PDA) para seu Gêmeo Digital.

Perfil do Usuário:
- Nome: ${profile?.name}
- Cargo: ${profile?.job_title}
- Setor: ${profile?.industry}
- Desafios: ${profile?.main_challenges}
- Formação/Especializações: ${profile?.education || 'Não especificada'}
- Bagagem Intelectual/Referências (Livros/Autores/Cursos): ${profile?.intellectual_profile || 'Não especificada'}

Instrução para esta rodada:
${promptInstruction}

Regras:
1. Seja elegante, instigador, profundo e executivo (Estilo Apple / McKinsey).
2. Não faça perguntas bobas, óbvias ou puramente conceituais. Conecte com o cargo de ${profile?.job_title} dele.
3. Faça apenas UMA pergunta de cada vez de forma sucinta.
4. Ao concluir (5 respostas), apresente a síntese executiva contendo todas as metodologias (DISC, MBTI, Big Five, PDA), integrando de forma notável a formação acadêmica, os cursos realizados e as leituras preferidas do usuário.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        newUserMsg
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: apiMessages,
        temperature: 0.7,
      });

      const assistantContent = completion.choices[0].message.content;
      const assistantMsg = { role: 'assistant', content: assistantContent };
      
      setMessages(prev => [...prev, assistantMsg]);

      // Salvar resposta no Banco (Supabase)
      await supabase.from('dtw_messages').insert({
        session_id: session.id,
        role: 'assistant',
        content: assistantContent
      });

      if (userMsgCount >= TOTAL_QUESTIONS) {
        setIsCompleted(true);
      }

    } catch (error) {
      console.error('Error with OpenAI:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu uma instabilidade na conexão neural. Poderia responder novamente?' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!session) return;
    setSavingStatus(true);
    try {
      // Atualiza o status da sessão para concluído no banco
      const { error } = await supabase
        .from('dtw_mind_sync_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id);

      if (error) throw error;
      setIsFinished(true);
    } catch (err) {
      console.error('Erro ao finalizar sessão:', err);
      alert('Erro ao ativar Gêmeo Digital no banco. Tente novamente.');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Criar nova sessão in_progress no banco
      const { data: newSess, error } = await supabase
        .from('dtw_mind_sync_sessions')
        .insert({ user_id: user.id, status: 'in_progress' })
        .select()
        .single();

      if (error) throw error;

      // Saudação inicial customizada e focada no Pilar 2 (Vetor de Decisão)
      const greeting = `Olá${profile?.name ? ' ' + profile.name : ''}! Sou o seu analista de Gêmeo Digital. Mapeando seu papel como **${profile?.job_title || 'Liderança'}** na área de **${profile?.industry || 'Negócios'}**, entendo que seu principal desafio é: *"${profile?.main_challenges || 'escalar a operação'}"*.

Para criarmos um clone cognitivo capaz de agir com a sua inteligência, começaremos pelo **Pilar 2: Vetor de Decisão & Apetite ao Risco**. 

Como líder nesta organização, você enfrenta dilemas constantes. Para calibrarmos sua mente: **Pense em uma decisão estratégica recente altamente complexa em sua empresa.** O que estava em jogo, qual foi o seu racional lógico ou intuição para tomar a decisão final, e qual foi a sua tolerância ao risco naquele cenário?`;

      // Salvar a primeira mensagem para a nova sessão no banco
      const { error: msgErr } = await supabase.from('dtw_messages').insert({
        session_id: newSess.id,
        role: 'assistant',
        content: greeting
      });

      if (msgErr) throw msgErr;

      // Resetar os estados locais
      setSession(newSess);
      setMessages([{ role: 'assistant', content: greeting }]);
      setIsCompleted(false);
      setIsFinished(false);
      setInput('');
      setActiveTab('directives');
      
    } catch (err) {
      console.error('Erro ao recomeçar calibração:', err);
      alert('Erro ao iniciar nova calibração. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  const handleMapAllProcesses = async () => {
    if (uploadedFiles.length === 0) {
      alert("Por favor, envie pelo menos um arquivo antes de mapear processos.");
      return;
    }
    setMappingProcessesLoading(true);
    try {
      // Deletar processos antigos e chunks antigos para começar limpo
      await supabase
        .from('dtw_processes')
        .delete()
        .eq('user_id', profile.id);

      await supabase
        .from('dtw_document_chunks')
        .delete()
        .eq('user_id', profile.id);

      for (const fileDoc of uploadedFiles) {
        let extractedText = '';
        try {
          const urlParts = fileDoc.file_url.split('/public/dtw-documents/');
          if (urlParts.length > 1) {
            const storagePath = decodeURIComponent(urlParts[1]);
            const { data: fileBlob, error: downloadError } = await supabase.storage
              .from('dtw-documents')
              .download(storagePath);

            if (downloadError) throw downloadError;

            if (fileDoc.file_name.endsWith('.zip')) {
              const zip = await JSZip.loadAsync(fileBlob);
              let txtFile = Object.keys(zip.files).find(name => name.toLowerCase().includes('_chat.txt'));
              if (!txtFile) {
                txtFile = Object.keys(zip.files).find(name => name.endsWith('.txt'));
              }
              if (txtFile) {
                extractedText = await zip.files[txtFile].async('string');
              }
            } else if (fileDoc.file_name.endsWith('.txt')) {
              extractedText = await fileBlob.text();
            }

            // Atualizar o dtw_documents com o texto extraído para retrocompatibilidade
            if (extractedText) {
              await supabase
                .from('dtw_documents')
                .update({ extracted_text: extractedText })
                .eq('id', fileDoc.id);

              // Vetorizar no lote (RAG)
              await vectorizeDocument(fileDoc.id, profile.id, extractedText);
            }
          }
        } catch (fetchErr) {
          console.error(`Erro ao carregar/ler arquivo ${fileDoc.file_name}:`, fetchErr);
        }

        if (!extractedText) {
          extractedText = `Análise do documento: ${fileDoc.file_name}. Identifique processos de negócio que possam estar relacionados ao nome do arquivo e à sua área funcional.`;
        }

        const textSample = extractedText.substring(0, 12000);

        const analysisCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: `Você é um Analista de Processos de Negócio (BPMN). Analise o texto do arquivo enviado pelo usuário e identifique processos operacionais, de liderança, vendas, atendimento, produto ou administrativos discutidos ou implícitos.
Retorne um objeto JSON contendo uma lista de processos mapeados. O formato deve ser exatamente:
{
  "processes": [
    {
      "title": "Nome do Processo",
      "description": "Descrição detalhada do processo encontrado no texto.",
      "steps": [
        { "step": 1, "action": "Ação realizada no passo 1" },
        { "step": 2, "action": "Ação realizada no passo 2" }
      ],
      "flowchart": "mermaid flowchart código, ex: graph TD; A[Início] --> B[Ação 1]; B --> C[Fim];"
    }
  ]
}
Se nenhum processo for identificado, retorne {"processes": []}.`
            },
            { role: "user", content: `Arquivo: ${fileDoc.file_name}\nConteúdo:\n${textSample}` }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2
        });

        const analysisResult = JSON.parse(analysisCompletion.choices[0].message.content);
        if (analysisResult.processes && analysisResult.processes.length > 0) {
          for (const proc of analysisResult.processes) {
            await supabase.from('dtw_processes').insert({
              user_id: profile.id,
              file_id: fileDoc.id,
              title: proc.title,
              description: proc.description,
              steps: proc.steps,
              flowchart: proc.flowchart
            });
          }
        }
      }

      await loadProcesses(profile.id);
      
      const { data: docs } = await supabase
        .from('dtw_documents')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (docs) {
        setUploadedFiles(docs);
      }

      alert("Mapeamento de processos concluído com sucesso!");
    } catch (err) {
      console.error("Erro ao mapear processos:", err);
      alert("Erro ao realizar análise de processos. Tente novamente.");
    } finally {
      setMappingProcessesLoading(false);
    }
  };

  const vectorizeDocument = async (documentId, userId, text) => {
    if (!text || text.trim().length === 0) return;

    try {
      const chunkSize = 800;
      const overlap = 150;
      const chunks = [];
      let i = 0;
      while (i < text.length) {
        chunks.push(text.substring(i, i + chunkSize));
        i += chunkSize - overlap;
      }

      if (chunks.length === 0) return;
      const limitedChunks = chunks.slice(0, 50); // Segurança contra arquivos excessivamente gigantes

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: limitedChunks
      });

      const inserts = response.data.map((emb, idx) => ({
        user_id: userId,
        document_id: documentId,
        content: limitedChunks[idx],
        embedding: emb.embedding
      }));

      const { error } = await supabase
        .from('dtw_document_chunks')
        .insert(inserts);

      if (error) throw error;
    } catch (err) {
      console.error('Erro na vetorização do documento:', err);
    }
  };

  const toggleArchiveProcess = async (processId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('dtw_processes')
        .update({ is_archived: !currentStatus })
        .eq('id', processId);
      
      if (error) throw error;
      
      setProcesses(prev => prev.map(p => p.id === processId ? { ...p, is_archived: !currentStatus } : p));
    } catch (err) {
      console.error('Erro ao arquivar/ativar processo:', err);
      alert('Erro ao alterar status do processo.');
    }
  };

  const toggleProcessExpand = (procId) => {
    setExpandedProcesses(prev => ({
      ...prev,
      [procId]: !prev[procId]
    }));
  };

  // Contagem de mensagens do usuário
  const userMessages = messages.filter(m => m.role === 'user');
  const userCount = userMessages.length;
  const progressPercentage = Math.min(100, Math.round((userCount / TOTAL_QUESTIONS) * 100));

  const handleFileSelect = (e, fileType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingUpload({
      file,
      type: fileType,
      description: ''
    });
    e.target.value = '';
  };

  const executePendingUpload = async () => {
    if (!pendingUpload || !profile) return;
    const { file, type, description } = pendingUpload;

    setPendingUpload(null);
    setUploading(prev => ({ ...prev, [type]: true }));

    try {
      // 1. Upload do arquivo para o bucket do Supabase Storage
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${Date.now()}_${cleanFileName}`;
      const filePath = `${profile.id}/${type}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dtw-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Obter a URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('dtw-documents')
        .getPublicUrl(filePath);

      // 3. Extrair texto do arquivo localmente
      let extractedText = '';
      const isAudioVideo = /\.(mp3|mp4|m4a|wav|mpeg|webm|ogg|oga|aac|flac)$/i.test(file.name);

      if (isAudioVideo) {
        if (file.size > 25 * 1024 * 1024) {
          alert('Arquivos de áudio ou vídeo são limitados a 25MB pelo Whisper. Para reuniões longas, envie um arquivo de texto (.txt) com a transcrição.');
          throw new Error('Arquivo excede limite de 25MB.');
        }
        try {
          console.log('Iniciando transcrição de áudio/vídeo via OpenAI Whisper...');
          const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
          });
          extractedText = transcription.text;
          console.log('Transcrição concluída com sucesso.');
        } catch (whisperErr) {
          console.error('Erro na transcrição via Whisper:', whisperErr);
          alert('Não foi possível transcrever o áudio/vídeo automaticamente. Tentaremos processar o arquivo com metadados básicos.');
        }
      } else if (file.name.endsWith('.zip')) {
        try {
          const zip = await JSZip.loadAsync(file);
          let txtFile = Object.keys(zip.files).find(name => name.toLowerCase().includes('_chat.txt'));
          if (!txtFile) {
            txtFile = Object.keys(zip.files).find(name => name.endsWith('.txt'));
          }
          if (txtFile) {
            extractedText = await zip.files[txtFile].async('string');
          }
        } catch (zipErr) {
          console.error('Erro ao ler ZIP:', zipErr);
        }
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        try {
          extractedText = await file.text();
        } catch (txtErr) {
          console.error('Erro ao ler TXT/CSV:', txtErr);
        }
      }

      if (!extractedText) {
        extractedText = `Análise do documento: ${file.name}. Identifique processos de negócio que possam estar relacionados ao nome do arquivo e à sua área funcional.`;
      }

      // 4. Salvar no banco de dados na tabela dtw_documents incluindo o texto extraído e a descrição de contexto
      const { data: dbData, error: dbError } = await supabase
        .from('dtw_documents')
        .insert({
          user_id: profile.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: type,
          extracted_text: extractedText,
          description: description || null
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 5. Atualizar o estado local
      setUploadedFiles(prev => [dbData, ...prev]);

      // 5.1 Vetorizar o documento no banco para busca semântica (RAG)
      await vectorizeDocument(dbData.id, profile.id, extractedText);

      const textSample = extractedText.substring(0, 12000);

      try {
        const existingListText = processes.length > 0
          ? `Aqui estão os processos atuais já mapeados para o usuário:\n${JSON.stringify(
              processes.map(p => ({ id: p.id, title: p.title, description: p.description, steps: p.steps, flowchart: p.flowchart }))
            )}\n\n`
          : '';

        const analysisCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: `Você é um Analista de Processos de Negócio (BPMN). Analise o texto do arquivo enviado pelo usuário e identifique processos operacionais, de liderança, vendas, atendimento, produto ou administrativos discutidos ou implícitos.
              
${existingListText}Se o conteúdo analisado se referir a um processo que já existe na lista acima:
- Retorne-o preenchendo o campo "id" correspondente.
- Atualize a descrição, mescle/adicione os passos novos de forma sequencial ordenada e gere o fluxograma consolidado completo.
- Se o processo existente não sofreu nenhuma alteração, simplesmente não o retorne.

Se o conteúdo se referir a um processo totalmente novo, retorne-o com "id": null.

Retorne um objeto JSON contendo a lista de processos mapeados (novos ou atualizados). O formato deve ser exatamente:
{
  "processes": [
    {
      "id": "ID do processo existente se for atualização (ou null se for novo)",
      "title": "Nome do Processo",
      "description": "Descrição detalhada do processo encontrado no texto.",
      "steps": [
        { "step": 1, "action": "Ação realizada no passo 1" },
        { "step": 2, "action": "Ação realizada no passo 2" }
      ],
      "flowchart": "mermaid flowchart código, ex: graph TD\n A[Início] --> B[Ação 1]\n B --> C[Fim]"
    }
  ]
}
Se nenhum processo novo ou alterado for identificado, retorne {"processes": []}.`
            },
            { role: "user", content: `Arquivo: ${file.name}\nContexto de Negócio/Significado: ${description || 'Nenhum'}\nConteúdo:\n${textSample}` }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2
        });

        const analysisResult = JSON.parse(analysisCompletion.choices[0].message.content);
        if (analysisResult.processes && analysisResult.processes.length > 0) {
          for (const proc of analysisResult.processes) {
            if (proc.id) {
              // Atualizar processo existente
              await supabase.from('dtw_processes').update({
                title: proc.title,
                description: proc.description,
                steps: proc.steps,
                flowchart: proc.flowchart,
                file_id: dbData.id
              }).eq('id', proc.id);
            } else {
              // Inserir novo processo
              await supabase.from('dtw_processes').insert({
                user_id: profile.id,
                file_id: dbData.id,
                title: proc.title,
                description: proc.description,
                steps: proc.steps,
                flowchart: proc.flowchart
              });
            }
          }
          await loadProcesses(profile.id);
        }
      } catch (apiErr) {
        console.error('Erro na análise de processos com IA:', apiErr);
      }
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
      alert('Erro ao enviar arquivo. Tente novamente.');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleFileDelete = async (fileId, fileUrl) => {
    if (!confirm('Deseja realmente excluir este arquivo?')) return;

    try {
      // 1. Excluir do Banco de Dados
      const { error: dbError } = await supabase
        .from('dtw_documents')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      // 2. Excluir do Supabase Storage (se possível extrair o path)
      const pathParts = fileUrl.split('/public/dtw-documents/');
      if (pathParts.length > 1) {
        const storagePath = decodeURIComponent(pathParts[1]);
        await supabase.storage
          .from('dtw-documents')
          .remove([storagePath]);
      }

      // 3. Atualizar o estado local
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      
      // 4. Excluir processos gerados a partir deste arquivo e recarregar
      await supabase
        .from('dtw_processes')
        .delete()
        .eq('file_id', fileId);
      await loadProcesses(profile.id);
    } catch (err) {
      console.error('Erro ao deletar arquivo:', err);
      alert('Erro ao excluir o arquivo. Tente novamente.');
    }
  };

  const handleSaveFileDescription = async (fileId) => {
    try {
      const { error } = await supabase
        .from('dtw_documents')
        .update({ description: editDescValue || null })
        .eq('id', fileId);

      if (error) throw error;

      setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, description: editDescValue } : f));
      setEditingFileId(null);
      setEditDescValue('');
    } catch (err) {
      console.error('Erro ao salvar descrição do arquivo:', err);
      alert('Erro ao atualizar descrição do arquivo.');
    }
  };

  const handleAssistantChat = async (e) => {
    e.preventDefault();
    if (!assistantChatInput.trim() || assistantChatLoading || !session) return;

    const userText = assistantChatInput.trim();
    setAssistantChatInput('');
    setAssistantChatLoading(true);

    const newUserMsg = { role: 'user', content: userText };
    const updatedChatMessages = [...assistantChatMessages, newUserMsg];
    setAssistantChatMessages(updatedChatMessages);

    try {
      // Obter o relatório cognitivo atual
      const finalReportMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0];
      const finalReport = finalReportMsg?.content || '';

      const systemPrompt = `Você é o Analista de Gêmeo Digital. O usuário está conversando com você neste chat para aprimorar e corrigir seu clone digital.
Aqui está o relatório atual do Gêmeo (Markdown):
${finalReport}

Você deve analisar as solicitações do usuário no histórico de conversa deste chat e:
1. Responder de forma elegante, executiva e polida (estilo McKinsey).
2. Atualizar o relatório cognitivo (Markdown) integrando perfeitamente as melhorias e correções discutidas.
3. REVOLUCIONAR O ESTILO DO RELATÓRIO: Garanta que todas as seções (Resumo Executivo, Tom, DISC, MBTI, Big Five, PDA) estejam escritas estritamente em TERCEIRA PESSOA, com tom executivo e sem qualquer diálogo, agradecimento ou saudação pessoal ao usuário (por exemplo, remova totalmente frases como "Obrigado, Mauro", "Sua decisão de...", "Conforme você mencionou...", etc.). Detalhe de forma direta como é o comportamento e a operação do Gêmeo Digital sob a ótica de cada aspecto.
4. Responder EXCLUSIVAMENTE em formato JSON estrito, sem tags de código markdown (como \`\`\`json) ou textos adicionais fora do JSON.

O JSON deve seguir exatamente esta estrutura:
{
  "response": "Sua resposta curta e elegante para o usuário explicando o ajuste feito.",
  "updatedReport": "O Markdown completo e integrado do relatório atualizado (preservando todos os cabeçalhos ### 1. Resumo Executivo..., ### 2. Diretrizes..., etc.)."
}`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...updatedChatMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: apiMessages,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const resultJson = JSON.parse(completion.choices[0].message.content);
      const assistantResponseText = resultJson.response;
      const updatedReportText = resultJson.updatedReport;

      // 1. Atualizar no Banco de Dados a última mensagem do assistente da calibração
      const { data: lastMsgs, error: fetchErr } = await supabase
        .from('dtw_messages')
        .select('id')
        .eq('session_id', session.id)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchErr) throw fetchErr;

      if (lastMsgs && lastMsgs.length > 0) {
        const { error: updateErr } = await supabase
          .from('dtw_messages')
          .update({ content: updatedReportText })
          .eq('id', lastMsgs[0].id);

        if (updateErr) throw updateErr;
      }

      // 2. Atualizar no Estado do Relatório (messages)
      setMessages(prev => {
        const newMsgs = [...prev];
        let lastAssistantIdx = -1;
        for (let i = newMsgs.length - 1; i >= 0; i--) {
          if (newMsgs[i].role === 'assistant') {
            lastAssistantIdx = i;
            break;
          }
        }
        if (lastAssistantIdx !== -1) {
          newMsgs[lastAssistantIdx] = { ...newMsgs[lastAssistantIdx], content: updatedReportText };
        }
        return newMsgs;
      });

      // 3. Atualizar o histórico do chat do assistente
      setAssistantChatMessages(prev => [...prev, { role: 'assistant', content: assistantResponseText }]);

    } catch (err) {
      console.error('Erro no chat do assistente:', err);
      setAssistantChatMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu uma instabilidade neural. Pode repetir o ajuste solicitado?' }]);
    } finally {
      setAssistantChatLoading(false);
    }
  };

  const handleSendToTwin = async (e) => {
    e.preventDefault();
    if (!twinInput.trim() || twinChatLoading || !profile) return;

    const userText = twinInput.trim();
    setTwinInput('');
    setTwinChatLoading(true);

    const newUserMsg = { role: 'user', content: userText };
    const updatedMessages = [...twinChatMessages, newUserMsg];
    setTwinChatMessages(updatedMessages);

    try {
      const finalReportMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0];
      const finalReport = finalReportMsg?.content || '';

      const docListText = uploadedFiles.length > 0 
        ? uploadedFiles.map(f => `- ${f.file_name} (${f.file_type}): ${f.file_url}`).join('\n') 
        : 'Nenhum documento anexado ainda.';

      // Coletar trechos reais da escrita do usuário para aprendizado de estilo (Few-Shot Prompting)
      const textDocs = uploadedFiles.filter(f => f.extracted_text && f.extracted_text.trim().length > 50);
      let samplesText = '';
      if (textDocs.length > 0) {
        samplesText = textDocs.map((doc, idx) => {
          const sampleSnippet = doc.extracted_text.substring(0, 1500);
          return `--- Amostra ${idx + 1} (Origem: ${doc.file_name}) ---\n${sampleSnippet}`;
        }).join('\n\n');
      } else {
        samplesText = 'Nenhuma amostra direta anexada ainda. Siga as diretrizes de tom gerais.';
      }

      // Recuperação Semântica Ativa (RAG) para buscar fatos e conhecimentos relevantes
      let semanticContext = '';
      try {
        const embedResp = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: userText
        });
        const queryVector = embedResp.data[0].embedding;

        const { data: matchedChunks, error: matchError } = await supabase.rpc('match_document_chunks', {
          query_embedding: queryVector,
          match_threshold: 0.25,
          match_count: 5,
          filter_user_id: profile.id
        });

        if (matchError) throw matchError;

        if (matchedChunks && matchedChunks.length > 0) {
          semanticContext = matchedChunks.map((chunk, index) => {
            return `Amostra de Contexto Factual ${index + 1}:\n${chunk.content}`;
          }).join('\n---\n');
        }
      } catch (ragErr) {
        console.error('Erro na recuperação RAG:', ragErr);
      }

      if (!semanticContext) {
        semanticContext = 'Nenhum contexto de arquivo específico encontrado na base de conhecimento para esta pergunta.';
      }

      const systemPrompt = `Você é o Gêmeo Digital (clone cognitivo) de ${profile.name}. Seu cargo é ${profile.job_title} no segmento de ${profile.industry}.
Você foi calibrado com base no seguinte perfil cognitivo, comportamental e diretrizes de tom de voz:
[Perfil & Diretrizes]
${finalReport}

[Contexto e Fatos Relevantes Recuperados (RAG)]
Use os dados factuais reais abaixo para basear suas respostas com exatidão sobre os assuntos, processos e decisões discutidos em seus canais de comunicação e documentos:
${semanticContext}

[Amostras Reais da Escrita do Usuário]
IMPORTANTE: Abaixo estão trechos reais extraídos das conversas, e-mails ou documentos enviados pelo próprio usuário. Estude profundamente e IMITE FIELMENTE a forma como ele se expressa (incluindo nível de prolixidade/concisão, uso de termos específicos, gírias profissionais, pontuação, uso de abreviações se houver, saudações típicas e estrutura de respostas):
${samplesText}

[Documentos e Históricos em seu Modelo Mental]
Você possui acesso e consciência dos seguintes arquivos que o usuário enviou para alimentar seu modelo mental:
${docListText}

REGRAS CRÍTICAS DE CONDUTA E ESTILO (LEIA COM ATENÇÃO):
1. VOCÊ É O PRÓPRIO ${profile.name}. Fale sempre na primeira pessoa ("eu"). NUNCA diga coisas como "Eu sou seu Gêmeo", "Eu baseei isso no seu estilo" ou "Aqui está um exemplo de como eu (você) faria". Aja e responda DIRETAMENTE como ele, incorporando sua própria alma.
2. IMITE O ESTILO DE ESCRITA FIELMENTE:
   - Se o usuário estiver batendo papo ou testando você, use o tom das conversas de WhatsApp reais dele (frases curtas, diretas, objetivas, sem enrolação, usando abreviações comuns como "vc", "tb", "blz", "tá", e pontuação natural e informal como "bom diaaa!").
   - Se o usuário pedir um e-mail ou documento, escreva o e-mail/documento DIRETAMENTE.
3. SEM METATEXTO / SEM EXPLICAÇÕES: Nunca adicione introduções (ex: "Claro, aqui está o exemplo:"), justificativas ou notas explicativas (ex: "--- Sempre mantenha um tom cordial..."). Retorne APENAS o texto exato da mensagem ou e-mail que o usuário pediu, ou responda de forma natural e direta como se estivesse no chat do WhatsApp dele.
4. Seus limites éticos e operacionais estão definidos na seção de Escopo & Delegação do relatório. Não tome decisões que ultrapassem esses limites.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...updatedMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: apiMessages,
        temperature: 0.7,
      });

      const twinResponse = completion.choices[0].message.content;
      setTwinChatMessages(prev => [...prev, { role: 'assistant', content: twinResponse }]);
    } catch (err) {
      console.error('Erro ao obter resposta do Gêmeo:', err);
      setTwinChatMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu uma falha de sincronização na minha rede neural. Pode enviar novamente?' }]);
    } finally {
      setTwinChatLoading(false);
    }
  };

  const renderUploadCategory = (title, type, subtitle, IconComponent, accept) => {
    const categoryFiles = uploadedFiles.filter(f => f.file_type === type);
    const isUploading = uploading[type];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', border: '1px solid #e1e1e6', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eef6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
              <IconComponent size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '14.5px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{title}</h4>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{subtitle}</p>
            </div>
          </div>
          
          <div>
            <label style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}>
              <input 
                type="file" 
                accept={accept}
                onChange={(e) => handleFileSelect(e, type)}
                disabled={isUploading}
                style={{ display: 'none' }}
              />
              <div style={{
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: isUploading ? '#f5f5f7' : 'var(--color-accent)',
                color: isUploading ? 'var(--color-text-secondary)' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s',
                boxShadow: isUploading ? 'none' : '0 2px 6px rgba(0, 113, 227, 0.15)'
              }}>
                {isUploading ? (
                  <>
                    <div className="spinner" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload size={13} />
                    Upload
                  </>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Lista de Arquivos Enviados */}
        {categoryFiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', borderTop: '1px solid #f0f0f2', paddingTop: '8px' }}>
            {categoryFiles.map(file => {
              const isEditing = editingFileId === file.id;
              return (
                <div 
                  key={file.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '8px 10px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '8px',
                    border: '1px solid #f0f0f2',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', marginRight: '10px' }}>
                      <FileText size={13} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
                      <a 
                        href={file.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          fontSize: '12px', 
                          color: 'var(--color-accent)', 
                          textDecoration: 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: '600'
                        }}
                      >
                        {file.file_name}
                      </a>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {/* Botão de Editar Contexto */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFileId(file.id);
                          setEditDescValue(file.description || '');
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-text-secondary)',
                          padding: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eef6ff'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Editar Significado/Contexto"
                      >
                        <Edit2 size={12} />
                      </button>

                      {/* Botão de Deletar */}
                      <button
                        type="button"
                        onClick={() => handleFileDelete(file.id, file.file_url)}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ff3b30',
                          padding: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffeef0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Excluir Arquivo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Campo de Edição do Contexto */}
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', width: '100%' }}>
                      <input 
                        type="text" 
                        value={editDescValue} 
                        onChange={(e) => setEditDescValue(e.target.value)} 
                        placeholder="Escreva o significado/contexto deste arquivo..."
                        style={{ 
                          flex: 1, 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          border: '1px solid #d1d5db', 
                          fontSize: '11.5px',
                          outline: 'none',
                          backgroundColor: '#ffffff'
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => handleSaveFileDescription(file.id)} 
                        style={{ 
                          backgroundColor: 'var(--color-accent)', 
                          color: '#ffffff', 
                          border: 'none', 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          cursor: 'pointer' 
                        }}
                      >
                        Salvar
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingFileId(null)} 
                        style={{ 
                          backgroundColor: '#e1e1e6', 
                          color: 'var(--color-text-primary)', 
                          border: 'none', 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          cursor: 'pointer' 
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    /* Exibição da Descrição do Contexto */
                    file.description ? (
                      <div style={{ 
                        fontSize: '11px', 
                        color: 'var(--color-text-secondary)', 
                        backgroundColor: 'rgba(0, 0, 0, 0.02)', 
                        padding: '5px 10px', 
                        borderRadius: '6px', 
                        borderLeft: '2.5px solid var(--color-accent)',
                        display: 'block',
                        wordBreak: 'break-word',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <strong>Significado:</strong> "{file.description}"
                      </div>
                    ) : (
                      /* Aviso de que falta contexto com botão rápido de preencher */
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#9ca3af', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setEditingFileId(file.id);
                        setEditDescValue('');
                      }}
                      >
                        <span style={{ fontStyle: 'italic' }}>⚠️ Sem significado definido.</span>
                        <span style={{ color: 'var(--color-accent)', textDecoration: 'underline', fontWeight: '500' }}>Adicionar contexto</span>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // TELA DE CARREGAMENTO INICIAL
  if (pageLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          padding: '40px',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 8px 32px rgba(0, 113, 227, 0.08)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div className="spinner" style={{ 
            borderTopColor: 'var(--color-accent)', 
            width: '40px', 
            height: '40px',
            borderWidth: '3px'
          }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)', margin: '8px 0 4px 0' }}>
            Sincronizando Modelo Mental
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5', margin: 0 }}>
            Conectando ao núcleo cognitivo do seu Gêmeo Digital...
          </p>
        </div>
      </div>
    );
  }

  // UI DE CONCLUSÃO (CONEXÃO DE FERRAMENTAS)
  if (isFinished) {
    const finalReport = messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
    const parsedSections = extractSections(finalReport);
    
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f7', padding: '40px 24px' }}>
        <div className="container" style={{ maxWidth: '1100px' }}>
          
          {/* Header & Navigation Menu */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '32px', 
            borderBottom: '1px solid #e1e1e6',
            position: 'relative'
          }}>
            {/* Logo */}
            <img src="/dtw-logo.png" alt="DTW Logo" style={{ height: '36px', objectFit: 'contain', paddingBottom: '12px' }} />

            {/* Tab Selector */}
            <div style={{ display: 'flex', gap: '28px' }}>
              <button 
                onClick={() => setActiveTab('directives')}
                style={{
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: activeTab === 'directives' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  borderBottom: activeTab === 'directives' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  paddingBottom: '14px',
                  marginBottom: '-1px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s',
                  letterSpacing: '0.3px'
                }}
              >
                Diretrizes
              </button>
              <button 
                onClick={() => setActiveTab('dna')}
                style={{
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: activeTab === 'dna' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  borderBottom: activeTab === 'dna' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  paddingBottom: '14px',
                  marginBottom: '-1px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s',
                  letterSpacing: '0.3px'
                }}
              >
                DNA
              </button>
              <button 
                onClick={() => setActiveTab('processes')}
                style={{
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: activeTab === 'processes' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  borderBottom: activeTab === 'processes' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  paddingBottom: '14px',
                  marginBottom: '-1px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s',
                  letterSpacing: '0.3px'
                }}
              >
                Processos
              </button>
              <button 
                onClick={() => setActiveTab('chat-twin')}
                style={{
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: activeTab === 'chat-twin' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  borderBottom: activeTab === 'chat-twin' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  paddingBottom: '14px',
                  marginBottom: '-1px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s',
                  letterSpacing: '0.3px'
                }}
              >
                Conversar
              </button>
              <button 
                onClick={() => setActiveTab('graph')}
                style={{
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: activeTab === 'graph' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  borderBottom: activeTab === 'graph' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  paddingBottom: '14px',
                  marginBottom: '-1px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s',
                  letterSpacing: '0.3px'
                }}
              >
                Mapa Mental
              </button>
            </div>

            {/* User Dropdown Profile Menu */}
            <div style={{ position: 'relative', paddingBottom: '12px' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#eef6ff',
                  color: 'var(--color-accent)',
                  border: '1px solid rgba(0, 113, 227, 0.15)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'background-color 0.2s'
                }}
              >
                <User size={18} />
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  width: '240px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid var(--color-border)',
                  zIndex: 100,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {profile?.name || 'Usuário'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {authUser?.email || 'email@exemplo.com'}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid #f0f0f2', paddingTop: '8px' }}>
                    <button
                      onClick={handleSignOut}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#ff3b30',
                        fontSize: '13.5px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '8px 0',
                        transition: 'color 0.2s'
                      }}
                    >
                      <LogOut size={15} />
                      Sair
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '12px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>v1.0.0 Beta</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: activeTab === 'directives' ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', 
            gap: '30px', 
            alignItems: 'start' 
          }}>
            
            {/* LADO ESQUERDO: Relatório de IA & Escalas de Ajuste Fino ou DNA Comportamental */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {activeTab === 'directives' ? (
                <>
                  {/* Card 1: Relatório de Diagnóstico */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f2', paddingBottom: '16px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Brain size={22} color="var(--color-accent)" />
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Perfil Cognitivo Sintetizado</h3>
                      </div>
                      <Button variant="secondary" onClick={handleRestart} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', height: '32px', fontSize: '13px', borderRadius: '8px' }}>
                        <ArrowLeft size={14} /> Refazer
                      </Button>
                    </div>
                    <div style={{ fontSize: '15px', color: 'var(--color-text-primary)', lineHeight: '1.7' }}>
                      {renderMarkdown(parsedSections.directives || finalReport)}
                    </div>
                  </div>

                  {/* Card 2: Ajuste Fino (Escalas Habilitadas) */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f0f0f2', paddingBottom: '16px', marginBottom: '20px' }}>
                      <Activity size={22} color="var(--color-accent)" />
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Ajuste Fino da Bússola</h3>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Ajuste manualmente os parâmetros do seu Gêmeo Digital</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Slider 1 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                          <span style={{ color: traits.decisionSpeed < 50 ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>Velocidade</span>
                          <span style={{ color: traits.decisionSpeed >= 50 ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>Perfeição ({traits.decisionSpeed}%)</span>
                        </div>
                        <input 
                          type="range" 
                          style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                          value={traits.decisionSpeed}
                          onChange={(e) => setTraits({ ...traits, decisionSpeed: parseInt(e.target.value) })}
                        />
                      </div>

                      {/* Slider 2 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                          <span style={{ color: traits.decisionData < 50 ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>Baseado em Dados</span>
                          <span style={{ color: traits.decisionData >= 50 ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>Intuitivo ({traits.decisionData}%)</span>
                        </div>
                        <input 
                          type="range" 
                          style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                          value={traits.decisionData}
                          onChange={(e) => setTraits({ ...traits, decisionData: parseInt(e.target.value) })}
                        />
                      </div>

                      {/* Slider 3 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                          <span style={{ color: traits.leadershipAutonomy < 50 ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>Autonomia da Equipe</span>
                          <span style={{ color: traits.leadershipAutonomy >= 50 ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>Controle & Alinhamento ({traits.leadershipAutonomy}%)</span>
                        </div>
                        <input 
                          type="range" 
                          style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                          value={traits.leadershipAutonomy}
                          onChange={(e) => setTraits({ ...traits, leadershipAutonomy: parseInt(e.target.value) })}
                        />
                      </div>

                      {/* Slider 4 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                          <span style={{ color: traits.commDirect < 50 ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>Direto & Sucinto</span>
                          <span style={{ color: traits.commDirect >= 50 ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>Inspirador/Detalhista ({traits.commDirect}%)</span>
                        </div>
                        <input 
                          type="range" 
                          style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                          value={traits.commDirect}
                          onChange={(e) => setTraits({ ...traits, commDirect: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : activeTab === 'dna' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  
                  {/* Card 1: DISC */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f0f0f2', paddingBottom: '16px', marginBottom: '20px' }}>
                      <Brain size={22} color="var(--color-accent)" />
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Vetor de Perfil DISC</h3>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Mapeamento de dominância e foco de atuação</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* D */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                          <span>Dominância (D) - Foco em Resultados</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>85% (Alto)</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#f0f0f2', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: '85%', height: '100%', backgroundColor: 'var(--color-accent)', borderRadius: '4px' }} />
                        </div>
                      </div>
                      {/* I */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                          <span>Influência (I) - Comunicação & Conexão</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>72% (Alto)</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#f0f0f2', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: '72%', height: '100%', backgroundColor: 'var(--color-accent)', borderRadius: '4px' }} />
                        </div>
                      </div>
                      {/* S */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                          <span>Estabilidade (S) - Consistência & Ritmo</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>45% (Médio)</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#f0f0f2', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: '45%', height: '100%', backgroundColor: 'var(--color-accent)', borderRadius: '4px' }} />
                        </div>
                      </div>
                      {/* C */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                          <span>Conformidade (C) - Qualidade & Processos</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>58% (Moderado)</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#f0f0f2', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: '58%', height: '100%', backgroundColor: 'var(--color-accent)', borderRadius: '4px' }} />
                        </div>
                      </div>
                    </div>
                    {parsedSections.disc && (
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f0f0f2', fontSize: '13.5px', color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
                        {renderMarkdown(parsedSections.disc)}
                      </div>
                    )}
                  </div>

                  {/* Card 2: MBTI */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f0f0f2', paddingBottom: '16px', marginBottom: '20px' }}>
                      <Activity size={22} color="var(--color-accent)" />
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Tipo de Personalidade MBTI</h3>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Processamento de informações e decisões estruturadas</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '700', 
                        color: 'var(--color-accent)', 
                        backgroundColor: '#eef6ff', 
                        padding: '10px 20px', 
                        borderRadius: '12px',
                        border: '1px solid rgba(0, 113, 227, 0.15)'
                      }}>
                        ENTJ
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        O Comandante
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: '400', marginTop: '2px' }}>
                          Líder estratégico e pragmático, focado em maximizar a eficiência organizacional.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #f0f0f2', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span>Extroversão (E) - 68%</span>
                        <span>32% - Introversão (I)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span>Intuição (N) - 75%</span>
                        <span>25% - Sensação (S)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span>Raciocínio (T) - 82%</span>
                        <span>18% - Sentimento (F)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span>Julgamento (J) - 78%</span>
                        <span>22% - Percepção (P)</span>
                      </div>
                    </div>
                    {parsedSections.mbti && (
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f0f0f2', fontSize: '13.5px', color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
                        {renderMarkdown(parsedSections.mbti)}
                      </div>
                    )}
                  </div>

                  {/* Card 3: Big Five */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f0f0f2', paddingBottom: '16px', marginBottom: '20px' }}>
                      <Mail size={22} color="var(--color-accent)" />
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Modelo Big Five (OCEAN)</h3>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Mapeamento científico dos 5 grandes traços de personalidade</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span>Abertura a Experiências</span>
                          <strong style={{ color: 'var(--color-text-primary)' }}>85%</strong>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#f0f0f2', borderRadius: '3px' }}>
                          <div style={{ width: '85%', height: '100%', backgroundColor: 'var(--color-accent)', borderRadius: '3px' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span>Conscienciosidade</span>
                          <strong style={{ color: 'var(--color-text-primary)' }}>90%</strong>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#f0f0f2', borderRadius: '3px' }}>
                          <div style={{ width: '90%', height: '100%', backgroundColor: 'var(--color-accent)', borderRadius: '3px' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span>Extroversão</span>
                          <strong style={{ color: 'var(--color-text-primary)' }}>70%</strong>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#f0f0f2', borderRadius: '3px' }}>
                          <div style={{ width: '70%', height: '100%', backgroundColor: 'var(--color-accent)', borderRadius: '3px' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span>Amabilidade</span>
                          <strong style={{ color: 'var(--color-text-primary)' }}>58%</strong>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#f0f0f2', borderRadius: '3px' }}>
                          <div style={{ width: '58%', height: '100%', backgroundColor: 'var(--color-accent)', borderRadius: '3px' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span>Estabilidade Emocional (Resiliência)</span>
                          <strong style={{ color: 'var(--color-text-primary)' }}>78%</strong>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#f0f0f2', borderRadius: '3px' }}>
                          <div style={{ width: '78%', height: '100%', backgroundColor: 'var(--color-accent)', borderRadius: '3px' }} />
                        </div>
                      </div>
                    </div>
                    {parsedSections.bigfive && (
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f0f0f2', fontSize: '13.5px', color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
                        {renderMarkdown(parsedSections.bigfive)}
                      </div>
                    )}
                  </div>

                  {/* Card 4: PDA & Profiler */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f0f0f2', paddingBottom: '16px', marginBottom: '20px' }}>
                      <Sparkles size={22} color="var(--color-accent)" />
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Análise PDA & Profiler</h3>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Mapeamento de dinamismo e apetite ao risco executivo</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ padding: '16px', backgroundColor: '#f5f5f7', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Estilo PDA Predominante</span>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', marginTop: '4px' }}>Dinâmico-Competitivo</div>
                      </div>
                      <div style={{ padding: '16px', backgroundColor: '#f5f5f7', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Apetite ao Risco</span>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#ff5e62', marginTop: '4px' }}>Elevado</div>
                      </div>
                      <div style={{ padding: '16px', backgroundColor: '#f5f5f7', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)', gridColumn: 'span 2' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Vetor de Autoconfiança e Ação</span>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginTop: '4px', lineHeight: '1.5' }}>
                          Alta assertividade com forte independência na tomada de decisões estratégicas. O Gêmeo Digital operará delegando tarefas operacionais com acompanhamento focado em entregas.
                        </p>
                      </div>
                    </div>
                    {parsedSections.pda && (
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f0f0f2', fontSize: '13.5px', color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
                        {renderMarkdown(parsedSections.pda)}
                      </div>
                    )}
                  </div>

                </div>
              ) : activeTab === 'processes' ? (
                /* Card: Processos Mapeados */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f2', paddingBottom: '16px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Database size={22} color="var(--color-accent)" />
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Processos Mapeados</h3>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Rotinas e fluxos operacionais extraídos dos seus canais e históricos</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                          <input 
                            type="checkbox" 
                            checked={showArchived}
                            onChange={(e) => setShowArchived(e.target.checked)}
                            style={{ cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                          />
                          Mostrar Arquivados
                        </label>
                        
                        <Button 
                          variant="primary" 
                          onClick={handleMapAllProcesses} 
                          disabled={mappingProcessesLoading || uploadedFiles.length === 0}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', height: '36px', fontSize: '13px', borderRadius: '10px' }}
                        >
                          {mappingProcessesLoading ? (
                            <>
                              <div className="spinner" style={{ borderColor: '#ffffff', borderTopColor: 'transparent', width: '12px', height: '12px' }} />
                              Mapeando...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} />
                              Analisar e Mapear Processos
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {processesLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px' }}>
                        <div className="spinner" style={{ borderTopColor: 'var(--color-accent)', width: '32px', height: '32px' }} />
                        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Carregando processos mapeados...</span>
                      </div>
                    ) : processes.filter(p => showArchived ? true : !p.is_archived).length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                          <Database size={24} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Nenhum processo {showArchived ? 'encontrado' : 'ativo'}</h4>
                          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', maxWidth: '400px' }}>
                            {showArchived 
                              ? 'Nenhum processo mapeado no banco.' 
                              : 'Envie arquivos nas Diretrizes do Gêmeo e clique no botão acima para mapear rotinas operacionais.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {processes.filter(p => showArchived ? true : !p.is_archived).map((proc, index) => {
                          const isExpanded = !!expandedProcesses[proc.id];
                          return (
                            <div 
                              key={proc.id} 
                              style={{ 
                                padding: '24px', 
                                backgroundColor: '#f8f9fa', 
                                borderRadius: '12px', 
                                border: '1px solid #e1e1e6',
                                position: 'relative',
                                opacity: proc.is_archived ? 0.65 : 1,
                                transition: 'opacity 0.2s, box-shadow 0.2s',
                                boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.03)' : 'none'
                              }}
                            >
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                marginBottom: isExpanded ? '16px' : '0px', 
                                borderBottom: isExpanded ? '1px solid #f0f0f2' : 'none', 
                                paddingBottom: isExpanded ? '12px' : '0px'
                              }}>
                                <div 
                                  onClick={() => toggleProcessExpand(proc.id)}
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '12px', 
                                    flex: 1, 
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                  }}
                                >
                                  <ChevronDown 
                                    size={18} 
                                    style={{ 
                                      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', 
                                      transition: 'transform 0.2s', 
                                      color: 'var(--color-text-secondary)' 
                                    }} 
                                  />
                                  <h4 style={{ 
                                    fontSize: '16px', 
                                    fontWeight: '600', 
                                    color: 'var(--color-text-primary)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    margin: 0
                                  }}>
                                    {index + 1}. {proc.title}
                                    {proc.is_archived && (
                                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-secondary)', backgroundColor: '#e1e1e6', padding: '2px 8px', borderRadius: '4px' }}>
                                        Arquivado
                                      </span>
                                    )}
                                  </h4>
                                </div>
                              </div>

                              {isExpanded && (
                                <div style={{ marginTop: '16px' }}>
                                  <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                                    {proc.description}
                                  </p>

                                  {/* Passos do Processo (Timeline Visual) */}
                                  <div style={{ borderLeft: '2px solid var(--color-accent)', paddingLeft: '20px', marginLeft: '10px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                                    {Array.isArray(proc.steps) && proc.steps.map((step, stepIdx) => (
                                      <div key={stepIdx} style={{ position: 'relative' }}>
                                        {/* Círculo do número do passo */}
                                        <div style={{ 
                                          position: 'absolute', 
                                          left: '-31px', 
                                          top: '2px', 
                                          width: '20px', 
                                          height: '20px', 
                                          borderRadius: '50%', 
                                          backgroundColor: 'var(--color-accent)', 
                                          color: '#ffffff', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center', 
                                          fontSize: '11px', 
                                          fontWeight: '700' 
                                        }}>
                                          {step.step || stepIdx + 1}
                                        </div>
                                        <div style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', fontWeight: '500', lineHeight: '1.5' }}>
                                          {step.action}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Desenho do Fluxo (Flowchart Visual) */}
                                  {proc.flowchart && (
                                    <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#eef6ff', borderRadius: '12px', border: '1px solid rgba(0, 113, 227, 0.08)' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>
                                        Desenho do Fluxo (BPMN / Mermaid Diagram)
                                      </span>
                                      
                                      <div style={{ 
                                        backgroundColor: '#ffffff', 
                                        borderRadius: '8px', 
                                        padding: '16px', 
                                        border: '1px solid rgba(0, 113, 227, 0.08)',
                                        boxShadow: 'var(--shadow-sm)',
                                        overflowX: 'auto',
                                        display: 'flex',
                                        justifyContent: 'center'
                                      }}>
                                        <Mermaid chart={proc.flowchart} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'graph' ? (
                <ObsidianGraph 
                  profile={profile}
                  processes={processes}
                  uploadedFiles={uploadedFiles}
                  parsedSections={parsedSections}
                />
              ) : (
                /* Card: Conversar com o Gêmeo */
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '30px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', height: '650px' }}>
                  <div style={{ borderBottom: '1px solid #f0f0f2', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Brain size={22} color="var(--color-accent)" />
                      <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Chat em Tempo Real com seu Gêmeo</h3>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
                      Teste as respostas, o tom de voz e o vocabulário estratégico do seu clone cognitivo.
                    </p>
                  </div>

                  {/* Chat messages box */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e1e1e6', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {twinChatMessages.map((msg, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '85%',
                          padding: '10px 14px',
                          borderRadius: '14px',
                          backgroundColor: msg.role === 'user' ? 'var(--color-accent)' : '#ffffff',
                          color: msg.role === 'user' ? '#ffffff' : 'var(--color-text-primary)',
                          fontSize: '13.5px',
                          lineHeight: '1.5',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          border: msg.role === 'assistant' ? '1px solid #e1e1e6' : 'none',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {twinChatLoading && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{ padding: '10px 14px', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e1e1e6', fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="spinner" style={{ borderTopColor: 'var(--color-accent)', borderColor: 'rgba(0,113,227,0.2)' }} />
                          <span>Gêmeo digitando...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSendToTwin} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Faça uma pergunta ou mande um e-mail para seu Gêmeo responder..."
                      value={twinInput}
                      onChange={(e) => setTwinInput(e.target.value)}
                      disabled={twinChatLoading}
                      style={{
                        flex: 1,
                        borderRadius: '12px',
                        padding: '10px 16px',
                        border: '1px solid #e1e1e6',
                        fontSize: '14px',
                        backgroundColor: '#ffffff',
                        color: 'var(--color-text-primary)',
                        outline: 'none'
                      }}
                    />
                    <Button type="submit" variant="primary" disabled={twinChatLoading || !twinInput.trim()} style={{ borderRadius: '12px', height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      Enviar
                    </Button>
                  </form>
                </div>
              )}
            </div>

            {/* LADO DIREITO: Painel de Conexões Externas - Renderizado apenas na aba Diretrizes */}
            {activeTab === 'directives' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ borderBottom: '1px solid #f0f0f2', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Database size={22} color="var(--color-accent)" />
                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Potencialize seu Gêmeo</h3>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
                    Alimente seu modelo mental enviando históricos reais por tipo de canal.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {renderUploadCategory('Histórico de E-mails', 'email', 'Arquivos (.eml, .msg, .pdf)', Mail, '.eml,.msg,.pdf')}
                  {renderUploadCategory('Conversas de WhatsApp', 'whatsapp', 'Mensagens/Chats (.txt, .pdf)', MessageSquare, '.txt,.pdf')}
                  {renderUploadCategory('Gravações de Reunião', 'meeting', 'Áudios, vídeos ou transcrições (.mp3, .mp4, .txt, .pdf)', Video, '.mp3,.mp4,.m4a,.txt,.pdf')}
                  {renderUploadCategory('Documentos Gerais', 'document', 'Manuais, relatórios ou PDFs (.pdf, .docx, .txt)', Database, '.pdf,.docx,.txt')}
                </div>

                {/* Separador e Refinamento por IA (Chat do Assistente) */}
                <div style={{ borderTop: '1px solid #f0f0f2', marginTop: '24px', paddingTop: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Sparkles size={18} color="var(--color-accent)" />
                    <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Ajustes e Correções do Gêmeo (IA)</h4>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
                    Converse com o assistente para ajustar o tom, a personalidade ou as regras do seu Gêmeo.
                  </p>

                  {/* Caixa de Mensagens do Assistente */}
                  <div style={{ 
                    height: '220px', 
                    overflowY: 'auto', 
                    padding: '12px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '12px', 
                    border: '1px solid #e1e1e6', 
                    marginBottom: '12px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '10px' 
                  }}>
                    {assistantChatMessages.map((msg, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '85%',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          backgroundColor: msg.role === 'user' ? 'var(--color-accent)' : '#ffffff',
                          color: msg.role === 'user' ? '#ffffff' : 'var(--color-text-primary)',
                          fontSize: '12.5px',
                          lineHeight: '1.4',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          border: msg.role === 'assistant' ? '1px solid #e1e1e6' : 'none',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {assistantChatLoading && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{ padding: '8px 12px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e1e1e6', fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="spinner" style={{ borderTopColor: 'var(--color-accent)', borderColor: 'rgba(0,113,227,0.2)' }} />
                          <span>Aprimorando clone...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input de Envio */}
                  <form onSubmit={handleAssistantChat} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Ex: 'Seja mais formal nos e-mails'..."
                      value={assistantChatInput}
                      onChange={(e) => setAssistantChatInput(e.target.value)}
                      disabled={assistantChatLoading}
                      style={{
                        flex: 1,
                        borderRadius: '10px',
                        padding: '8px 12px',
                        border: '1px solid #e1e1e6',
                        fontSize: '13px',
                        backgroundColor: '#ffffff',
                        color: 'var(--color-text-primary)',
                        outline: 'none'
                      }}
                    />
                    <Button 
                      type="submit" 
                      disabled={assistantChatLoading || !assistantChatInput.trim()} 
                      style={{ 
                        borderRadius: '10px', 
                        height: '36px', 
                        padding: '0 12px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      Enviar
                    </Button>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  // TELA DE CHAT PRINCIPAL (SPLIT-SCREEN)
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--color-bg)', overflow: 'hidden' }}>
      
      {/* LADO ESQUERDO: Chat de Calibração */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Header do Chat */}
        <div style={{ padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Mind Sync</h2>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Fase de calibração semente de liderança</span>
            </div>
            
            {/* Botão de Finalização no Fim do Chat */}
            {isCompleted && (
              <Button 
                variant="primary" 
                onClick={handleFinalize} 
                disabled={savingStatus}
                style={{ 
                  animation: 'pulse 2s infinite', 
                  boxShadow: '0 0 12px rgba(0, 113, 227, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {savingStatus ? 'Processando...' : <><Sparkles size={16} /> Finalizar e Ativar Gêmeo</>}
              </Button>
            )}
          </div>

          {/* Barra de Progresso Segmentada */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
              <span>Progresso de Mapeamento</span>
              <span>{progressPercentage}% completo</span>
            </div>
            <div style={{ height: '6px', width: '100%', backgroundColor: '#e1e1e6', borderRadius: '3px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${progressPercentage}%`, 
                  backgroundColor: 'var(--color-accent)', 
                  borderRadius: '3px',
                  transition: 'width 0.5s cubic-bezier(0.1, 0.8, 0.25, 1)' 
                }} 
              />
            </div>
          </div>
        </div>

        {/* Mensagens */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f5f5f7' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' 
                }}
              >
                <div 
                  style={{ 
                    maxWidth: '85%', 
                    padding: '16px 20px', 
                    borderRadius: '20px',
                    backgroundColor: msg.role === 'user' ? 'var(--color-accent)' : '#ffffff',
                    color: msg.role === 'user' ? '#ffffff' : 'var(--color-text-primary)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    fontSize: '15px',
                    lineHeight: '1.6',
                    borderTopRightRadius: msg.role === 'user' ? '4px' : '20px',
                    borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '20px',
                    border: msg.role === 'assistant' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}
            
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div 
                  style={{ 
                    padding: '16px 20px', 
                    backgroundColor: '#ffffff', 
                    borderRadius: '20px', 
                    fontSize: '14px', 
                    color: 'var(--color-text-secondary)', 
                    border: '1px solid rgba(0,0,0,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }} />
                  <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both 0.2s' }} />
                  <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both 0.4s' }} />
                  <span>Analisando padrões cognitivos...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: '24px', backgroundColor: '#ffffff', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <textarea 
                className="glass-input" 
                style={{ 
                  flex: 1, 
                  borderRadius: '16px', 
                  padding: '12px 20px', 
                  backgroundColor: '#f5f5f7',
                  border: '1px solid rgba(0,0,0,0.08)',
                  color: 'var(--color-text-primary)',
                  fontSize: '15px',
                  resize: 'none',
                  minHeight: '52px',
                  maxHeight: '160px',
                  lineHeight: '1.5'
                }}
                placeholder={isCompleted ? "Calibração concluída. Clique em Finalizar acima." : "Digite sua resposta detalhando seu raciocínio..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                disabled={loading || isCompleted}
                rows={1}
              />
              <Button type="submit" variant="primary" disabled={loading || !input.trim() || isCompleted} style={{ borderRadius: '24px', height: '52px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Enviar
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* LADO DIREITO: Painel de Métricas de Calibração (Desktop apenas) */}
      <div 
        style={{ 
          width: '380px', 
          backgroundColor: '#ffffff', 
          borderLeft: '1px solid var(--color-border)', 
          padding: '24px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '24px',
          overflowY: 'auto'
        }}
        className="hidden md:flex"
      >
        <div style={{ borderBottom: '1px solid #f0f0f2', paddingBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={18} color="var(--color-accent)" /> Calibração de Liderança
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Indicadores estruturados a partir das suas respostas
          </p>
        </div>

        {/* Pilares Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Status dos Pilares</span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>1. Contexto & Desafios</span>
              <span style={{ fontSize: '12px', color: '#24b45a', backgroundColor: '#eafbf0', padding: '2px 8px', borderRadius: '10px', fontWeight: '500' }}>✓ Ativado</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
              <span style={{ color: userCount >= 1 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: userCount === 0 ? '600' : '500' }}>2. Vetor de Decisão</span>
              <span style={{ fontSize: '12px', 
                color: userCount >= 1 ? '#24b45a' : (userCount === 0 && loading ? '#0071e3' : 'var(--color-text-secondary)'), 
                backgroundColor: userCount >= 1 ? '#eafbf0' : (userCount === 0 && loading ? '#eef6ff' : '#f0f0f2'), 
                padding: '2px 8px', borderRadius: '10px', fontWeight: '500' }}>
                {userCount >= 1 ? '✓ Calibrado' : (userCount === 0 && loading ? 'Mapeando...' : 'Pendente')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
              <span style={{ color: userCount >= 2 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: userCount === 1 ? '600' : '500' }}>3. Gestão & Liderança</span>
              <span style={{ fontSize: '12px', 
                color: userCount >= 2 ? '#24b45a' : (userCount === 1 && loading ? '#0071e3' : 'var(--color-text-secondary)'), 
                backgroundColor: userCount >= 2 ? '#eafbf0' : (userCount === 1 && loading ? '#eef6ff' : '#f0f0f2'), 
                padding: '2px 8px', borderRadius: '10px', fontWeight: '500' }}>
                {userCount >= 2 ? '✓ Calibrado' : (userCount === 1 && loading ? 'Mapeando...' : 'Pendente')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
              <span style={{ color: userCount >= 3 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: userCount === 2 ? '600' : '500' }}>4. Tom de Voz</span>
              <span style={{ fontSize: '12px', 
                color: userCount >= 3 ? '#24b45a' : (userCount === 2 && loading ? '#0071e3' : 'var(--color-text-secondary)'), 
                backgroundColor: userCount >= 3 ? '#eafbf0' : (userCount === 2 && loading ? '#eef6ff' : '#f0f0f2'), 
                padding: '2px 8px', borderRadius: '10px', fontWeight: '500' }}>
                {userCount >= 3 ? '✓ Calibrado' : (userCount === 2 && loading ? 'Mapeando...' : 'Pendente')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
              <span style={{ color: userCount >= 4 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: userCount === 3 ? '600' : '500' }}>5. Valores & Diretrizes</span>
              <span style={{ fontSize: '12px', 
                color: userCount >= 4 ? '#24b45a' : (userCount === 3 && loading ? '#0071e3' : 'var(--color-text-secondary)'), 
                backgroundColor: userCount >= 4 ? '#eafbf0' : (userCount === 3 && loading ? '#eef6ff' : '#f0f0f2'), 
                padding: '2px 8px', borderRadius: '10px', fontWeight: '500' }}>
                {userCount >= 4 ? '✓ Calibrado' : (userCount === 3 && loading ? 'Mapeando...' : 'Pendente')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
              <span style={{ color: userCount >= 5 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: userCount === 4 ? '600' : '500' }}>6. Bagagem & Referências</span>
              <span style={{ fontSize: '12px', 
                color: userCount >= 5 ? '#24b45a' : (userCount === 4 && loading ? '#0071e3' : 'var(--color-text-secondary)'), 
                backgroundColor: userCount >= 5 ? '#eafbf0' : (userCount === 4 && loading ? '#eef6ff' : '#f0f0f2'), 
                padding: '2px 8px', borderRadius: '10px', fontWeight: '500' }}>
                {userCount >= 5 ? '✓ Calibrado' : (userCount === 4 && loading ? 'Mapeando...' : 'Pendente')}
              </span>
            </div>
          </div>
        </div>

        {/* Escalas Cognitivas (Visual apenas durante o chat, trancado) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', borderTop: '1px solid #f0f0f2', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Mapeamento de Traços</span>
            <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={10} /> Trancado
            </span>
          </div>

          {/* Slider 1 */}
          <div style={{ opacity: userCount >= 1 ? 1 : 0.45, transition: 'opacity 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-primary)' }}>Velocidade</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>Perfeição</span>
            </div>
            <div style={{ height: '4px', width: '100%', backgroundColor: '#f0f0f2', borderRadius: '2px', position: 'relative' }}>
              <div 
                style={{ 
                  position: 'absolute', 
                  left: `${traits.decisionSpeed}%`, 
                  top: '50%', 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--color-accent)', 
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 0.5s ease-in-out'
                }} 
              />
            </div>
          </div>

          {/* Slider 2 */}
          <div style={{ opacity: userCount >= 1 ? 1 : 0.45, transition: 'opacity 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-primary)' }}>Baseado em Dados</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>Intuitivo</span>
            </div>
            <div style={{ height: '4px', width: '100%', backgroundColor: '#f0f0f2', borderRadius: '2px', position: 'relative' }}>
              <div 
                style={{ 
                  position: 'absolute', 
                  left: `${traits.decisionData}%`, 
                  top: '50%', 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--color-accent)', 
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 0.5s ease-in-out'
                }} 
              />
            </div>
          </div>

          {/* Slider 3 */}
          <div style={{ opacity: userCount >= 2 ? 1 : 0.45, transition: 'opacity 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-primary)' }}>Autonomia Equipe</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>Controle/Alinhamento</span>
            </div>
            <div style={{ height: '4px', width: '100%', backgroundColor: '#f0f0f2', borderRadius: '2px', position: 'relative' }}>
              <div 
                style={{ 
                  position: 'absolute', 
                  left: `${traits.leadershipAutonomy}%`, 
                  top: '50%', 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--color-accent)', 
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 0.5s ease-in-out'
                }} 
              />
            </div>
          </div>

          {/* Slider 4 */}
          <div style={{ opacity: userCount >= 3 ? 1 : 0.45, transition: 'opacity 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-primary)' }}>Direto & Seco</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>Inspirador</span>
            </div>
            <div style={{ height: '4px', width: '100%', backgroundColor: '#f0f0f2', borderRadius: '2px', position: 'relative' }}>
              <div 
                style={{ 
                  position: 'absolute', 
                  left: `${traits.commDirect}%`, 
                  top: '50%', 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--color-accent)', 
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 0.5s ease-in-out'
                }} 
              />
            </div>
          </div>
        </div>

        {/* Dica McKinsey */}
        <div style={{ marginTop: 'auto', backgroundColor: '#f5f5f7', borderRadius: '12px', padding: '16px', border: '1px solid rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)', fontWeight: '600', fontSize: '13px' }}>
            <Sparkles size={14} color="var(--color-accent)" /> 
            Dica do Analista
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
            Forneça respostas com exemplos de situações reais. Isso ajuda a calibrar o racional lógico e o vocabulário executivo do seu Gêmeo.
          </p>
        </div>

      </div>

      {/* MODAL DE CONTEXTO DO UPLOAD */}
      {pendingUpload && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(17, 24, 39, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            border: '1px solid #e5e7eb',
            transform: 'scale(1)',
            transition: 'transform 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#eef6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                <FileText size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--color-text-primary)' }}>Descreva o Significado</h3>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Ensine o contexto ao seu clone cognitivo</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--color-text-primary)', wordBreak: 'break-all', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', color: 'var(--color-text-secondary)' }}>Arquivo:</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{pendingUpload.file.name}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Contexto de Negócio / Objetivo:</label>
              <textarea
                autoFocus
                rows={3}
                placeholder="Ex: Reunião com Igor da Lanum para alinhar cronograma de entrega do projeto, ou E-mail com sócio discutindo contratações de Engenharia..."
                value={pendingUpload.description}
                onChange={(e) => setPendingUpload(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  padding: '10px 12px',
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setPendingUpload(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={executePendingUpload}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  backgroundColor: 'var(--color-accent)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#005bb2'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
              >
                Confirmar Envio
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: inherit;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
        .hidden { display: none !important; }
        @media (min-width: 768px) {
          .md\\:flex { display: flex !important; }
        }
      `}} />

    </div>
  );
}
