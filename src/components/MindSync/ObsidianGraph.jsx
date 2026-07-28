import React, { useState, useEffect, useMemo } from 'react';
import { Brain, FileText, Database, ShieldAlert, Sparkles, User, Award, BookOpen, Layers, CheckCircle } from 'lucide-react';
import mermaid from 'mermaid';

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
    const elementId = `mermaid-graph-view-${++mermaidIdCounter}`;

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
        console.error('Erro na renderização do Mermaid no grafo:', err);
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
      <div style={{ color: '#ff3b30', fontSize: '12px', padding: '8px', backgroundColor: '#ffeef0', borderRadius: '6px', textAlign: 'center', width: '100%' }}>
        Erro no fluxograma.
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px' }}>
        <div className="spinner" style={{ borderTopColor: '#0071e3', width: '12px', height: '12px' }} />
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Gerando...</span>
      </div>
    );
  }

  return (
    <div 
      style={{ display: 'flex', justifyContent: 'center', width: '100%', overflowX: 'auto' }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

export default function ObsidianGraph({ profile, processes, uploadedFiles, parsedSections }) {
  const [selectedNodeId, setSelectedNodeId] = useState('center');
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  // 1. Definir nós com suas coordenadas predefinidas para um layout limpo e responsivo
  const nodes = useMemo(() => {
    const centerNode = {
      id: 'center',
      label: profile?.name || 'Gêmeo Digital',
      type: 'center',
      x: 300,
      y: 300,
      color: '#0071e7',
      icon: User
    };

    const coreNodes = [
      { id: 'dna', label: 'DNA Comportamental', type: 'core', parent: 'center', x: 180, y: 180, color: '#a855f7', icon: Brain },
      { id: 'processes', label: 'Processos Mapeados', type: 'core', parent: 'center', x: 420, y: 180, color: '#10b981', icon: Database },
      { id: 'mind', label: 'Modelo Mental & Bagagem', type: 'core', parent: 'center', x: 180, y: 420, color: '#f59e0b', icon: Layers },
      { id: 'files', label: 'Arquivos & Canais', type: 'core', parent: 'center', x: 420, y: 420, color: '#06b6d4', icon: FileText },
    ];

    const dnaLeafs = [
      { id: 'disc', label: 'DISC Profiler', type: 'leaf', parent: 'dna', x: 80, y: 110, color: '#c084fc' },
      { id: 'mbti', label: 'MBTI Typology', type: 'leaf', parent: 'dna', x: 60, y: 180, color: '#c084fc' },
      { id: 'bigfive', label: 'Big Five Traits', type: 'leaf', parent: 'dna', x: 80, y: 250, color: '#c084fc' },
      { id: 'pda', label: 'PDA Dynamics', type: 'leaf', parent: 'dna', x: 160, y: 90, color: '#c084fc' },
    ];

    const mindLeafs = [
      { id: 'academic', label: 'Formação & Livros', type: 'leaf', parent: 'mind', x: 80, y: 370, color: '#fbbf24' },
      { id: 'decision', label: 'Apetite ao Risco (Pilar 2)', type: 'leaf', parent: 'mind', x: 60, y: 440, color: '#fbbf24' },
      { id: 'tone', label: 'Tom de Voz (Pilar 4)', type: 'leaf', parent: 'mind', x: 150, y: 510, color: '#fbbf24' },
    ];

    // Distribuir processos dinamicamente em arco
    const processLeafs = processes.map((p, idx) => {
      const angleRange = 100;
      const startAngle = -45;
      const angleStep = processes.length > 1 ? angleRange / (processes.length - 1) : 0;
      const angleRad = ((startAngle + idx * angleStep) * Math.PI) / 180;
      const radius = 100;
      return {
        id: `proc_${p.id}`,
        label: p.title,
        type: 'process',
        parent: 'processes',
        data: p,
        x: 420 + Math.cos(angleRad) * radius,
        y: 180 + Math.sin(angleRad) * radius,
        color: '#34d399'
      };
    });

    // Distribuir arquivos dinamicamente em arco
    const fileLeafs = uploadedFiles.map((f, idx) => {
      const angleRange = 100;
      const startAngle = -45;
      const angleStep = uploadedFiles.length > 1 ? angleRange / (uploadedFiles.length - 1) : 0;
      const angleRad = ((startAngle + idx * angleStep) * Math.PI) / 180;
      const radius = 100;
      return {
        id: `file_${f.id}`,
        label: f.file_name,
        type: 'file',
        parent: 'files',
        data: f,
        x: 420 + Math.cos(angleRad) * radius,
        y: 420 + Math.sin(angleRad) * radius,
        color: '#22d3ee'
      };
    });

    return [centerNode, ...coreNodes, ...dnaLeafs, ...mindLeafs, ...processLeafs, ...fileLeafs];
  }, [profile, processes, uploadedFiles]);

  // 2. Definir conexões (arestas)
  const links = useMemo(() => {
    const edgeList = [];
    nodes.forEach(node => {
      if (node.parent) {
        const parentNode = nodes.find(n => n.id === node.parent);
        if (parentNode) {
          edgeList.push({
            id: `${node.id}-${parentNode.id}`,
            source: node,
            target: parentNode
          });
        }
      }
    });
    return edgeList;
  }, [nodes]);

  // Encontrar o nó selecionado
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || nodes[0];
  }, [nodes, selectedNodeId]);

  // Renderizar o conteúdo de detalhes de acordo com o nó selecionado
  const renderDetailContent = () => {
    if (!selectedNode) return null;

    switch (selectedNode.id) {
      case 'center':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(0,113,231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0071e7' }}>
                <User size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>{profile?.name || 'Gêmeo Digital'}</h4>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>{profile?.job_title || 'Liderança'} em {profile?.industry}</span>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.6', margin: 0 }}>
              Este é o nó central da rede neural do seu Gêmeo. Ele conecta sua identidade, perfis comportamentais calibrados, processos operacionais mapeados e arquivos históricos.
            </p>
            <div style={{ borderTop: '1px solid #374151', paddingTop: '14px', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Desafio Principal</span>
              <div style={{ padding: '10px', backgroundColor: '#374151', borderRadius: '8px', fontSize: '12px', color: '#f3f4f6', borderLeft: '3px solid #0071e7' }}>
                "{profile?.main_challenges || 'Escalar a operação'}"
              </div>
            </div>
          </div>
        );

      case 'dna':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={18} color="#a855f7" /> DNA Comportamental
            </h4>
            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.6', margin: 0 }}>
              Representa o conjunto de metodologias científicas de comportamento (DISC, MBTI, Big Five, PDA) calibradas durante o bate-papo inicial.
            </p>
            <span style={{ fontSize: '12px', color: '#a855f7', fontWeight: '600' }}>Nós Conectados:</span>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>DISC</strong>: Dominância e foco operacional.</li>
              <li><strong>MBTI</strong>: Tipo psicológico (ex: ENTJ).</li>
              <li><strong>Big Five</strong>: 5 grandes traços de personalidade.</li>
              <li><strong>PDA</strong>: Dinamismo e apetite ao risco.</li>
            </ul>
          </div>
        );

      case 'processes':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="#10b981" /> Processos Mapeados
            </h4>
            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.6', margin: 0 }}>
              Conecta as rotinas operacionais identificadas nos seus chats e e-mails de diretrizes.
            </p>
            <div style={{ padding: '12px', backgroundColor: '#2d3748', borderRadius: '8px', fontSize: '12px', color: '#9ca3af' }}>
              Total de Processos Mapeados: <strong style={{ color: '#ffffff' }}>{processes.length}</strong>
            </div>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>Nós Conectados:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {processes.map(p => (
                <span key={p.id} style={{ fontSize: '11px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {p.title}
                </span>
              ))}
            </div>
          </div>
        );

      case 'mind':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#f59e0b" /> Modelo Mental & Bagagem
            </h4>
            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.6', margin: 0 }}>
              Estrutura o apetite ao risco, racional de decisões, tom de voz calibrado e referências intelectuais fornecidas (formação acadêmica e livros).
            </p>
            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>Nós Conectados:</span>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Formação & Livros</strong>: Base de conhecimento acadêmico.</li>
              <li><strong>Apetite ao Risco</strong>: Vetores de tomada de decisão.</li>
              <li><strong>Tom de Voz</strong>: Diretrizes de formatação e tom.</li>
            </ul>
          </div>
        );

      case 'files':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#06b6d4" /> Arquivos & Canais
            </h4>
            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.6', margin: 0 }}>
              Mostra a origem física das informações que treinaram a mente do seu Gêmeo Digital (chats, e-mails ou áudios).
            </p>
            <div style={{ padding: '12px', backgroundColor: '#2d3748', borderRadius: '8px', fontSize: '12px', color: '#9ca3af' }}>
              Arquivos de Treino Carregados: <strong style={{ color: '#ffffff' }}>{uploadedFiles.length}</strong>
            </div>
          </div>
        );

      // DNA Leafs
      case 'disc':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>DISC Profiler</h4>
            <span style={{ fontSize: '11px', color: '#a855f7', textTransform: 'uppercase', fontWeight: '600' }}>DNA Comportamental</span>
            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.5', margin: 0 }}>
              Determina os níveis de Dominância (D), Influência (I), Estabilidade (S) e Conformidade (C) nas tomadas de decisão e liderança.
            </p>
            {parsedSections.disc && (
              <div style={{ padding: '10px', backgroundColor: '#2d3748', borderRadius: '8px', fontSize: '12px', color: '#e5e7eb', maxHeight: '180px', overflowY: 'auto', border: '1px solid #374151' }}>
                {parsedSections.disc.replace(/[#*]/g, '')}
              </div>
            )}
          </div>
        );

      case 'mbti':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>MBTI Typology (ENTJ)</h4>
            <span style={{ fontSize: '11px', color: '#a855f7', textTransform: 'uppercase', fontWeight: '600' }}>DNA Comportamental</span>
            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.5', margin: 0 }}>
              <strong>ENTJ - O Comandante:</strong> Racional, focado em organização, metas e eficiência sistêmica. Toma decisões baseadas na lógica objetiva.
            </p>
            {parsedSections.mbti && (
              <div style={{ padding: '10px', backgroundColor: '#2d3748', borderRadius: '8px', fontSize: '12px', color: '#e5e7eb', maxHeight: '180px', overflowY: 'auto', border: '1px solid #374151' }}>
                {parsedSections.mbti.replace(/[#*]/g, '')}
              </div>
            )}
          </div>
        );

      case 'bigfive':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>Big Five Traits</h4>
            <span style={{ fontSize: '11px', color: '#a855f7', textTransform: 'uppercase', fontWeight: '600' }}>DNA Comportamental</span>
            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.5', margin: 0 }}>
              Mapeamento de 5 dimensões comportamentais: Abertura (Alto), Conscienciosidade (Alto), Extroversão (Moderado), Amabilidade (Equilibrado), Neuroticismo/Resiliência (Estável).
            </p>
            {parsedSections.bigfive && (
              <div style={{ padding: '10px', backgroundColor: '#2d3748', borderRadius: '8px', fontSize: '12px', color: '#e5e7eb', maxHeight: '180px', overflowY: 'auto', border: '1px solid #374151' }}>
                {parsedSections.bigfive.replace(/[#*]/g, '')}
              </div>
            )}
          </div>
        );

      case 'pda':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>PDA Dynamics</h4>
            <span style={{ fontSize: '11px', color: '#a855f7', textTransform: 'uppercase', fontWeight: '600' }}>DNA Comportamental</span>
            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.5', margin: 0 }}>
              Determina o nível de autoconfiança, dinamismo, controle e tolerância ao risco. Alta assertividade nas interações executivas.
            </p>
            {parsedSections.pda && (
              <div style={{ padding: '10px', backgroundColor: '#2d3748', borderRadius: '8px', fontSize: '12px', color: '#e5e7eb', maxHeight: '180px', overflowY: 'auto', border: '1px solid #374151' }}>
                {parsedSections.pda.replace(/[#*]/g, '')}
              </div>
            )}
          </div>
        );

      // Mind Leafs
      case 'academic':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={18} color="#fbbf24" /> Formação & Livros
            </h4>
            <span style={{ fontSize: '11px', color: '#f59e0b', textTransform: 'uppercase', fontWeight: '600' }}>Modelo Mental</span>
            <div>
              <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block' }}>Formação Acadêmica</span>
              <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: '500' }}>{profile?.education || 'Mestrado/Doutorado Executivo'}</span>
            </div>
            <div style={{ borderTop: '1px solid #374151', paddingTop: '10px' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Referências e Bibliografia Favorita</span>
              <span style={{ fontSize: '13px', color: '#ffffff', fontStyle: 'italic' }}>{profile?.intellectual_profile || 'Livros de Liderança, Negócios e Estratégia'}</span>
            </div>
          </div>
        );

      case 'decision':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={18} color="#fbbf24" /> Apetite ao Risco
            </h4>
            <span style={{ fontSize: '11px', color: '#f59e0b', textTransform: 'uppercase', fontWeight: '600' }}>Modelo Mental</span>
            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.5', margin: 0 }}>
              Determina como o Gêmeo atua diante de dilemas. Calibrado para ter alta orientação a metas rápidas, assumindo riscos com respaldo de fatos históricos.
            </p>
          </div>
        );

      case 'tone':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={18} color="#fbbf24" /> Tom de Voz
            </h4>
            <span style={{ fontSize: '11px', color: '#f59e0b', textTransform: 'uppercase', fontWeight: '600' }}>Modelo Mental</span>
            <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.5', margin: 0 }}>
              Instruções de escrita calibradas no relatório. Foco em tom executivo, objetivo, elegante e polido, imitando as amostras coletadas.
            </p>
          </div>
        );

      // Dynamic Node Viewers
      default:
        if (selectedNode.id.startsWith('proc_')) {
          const proc = selectedNode.data;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '100%', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="#10b981" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>{proc.title}</h4>
              </div>
              <span style={{ fontSize: '11px', color: '#10b981', textTransform: 'uppercase', fontWeight: '600' }}>Processo Operacional Mapeado</span>
              <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.5', margin: 0 }}>
                {proc.description}
              </p>
              
              <div style={{ borderTop: '1px solid #374151', paddingTop: '12px' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '8px' }}>Fluxo de Passos</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array.isArray(proc.steps) && proc.steps.map((st, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', gap: '8px', fontSize: '12px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'flex', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#10b981', color: '#ffffff', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', flexShrink: 0, marginTop: '2px' }}>
                        {st.step || sIdx + 1}
                      </span>
                      <span style={{ color: '#e5e7eb' }}>{st.action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {proc.flowchart && (
                <div style={{ borderTop: '1px solid #374151', paddingTop: '12px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '8px' }}>Desenho do Fluxo (Mermaid)</span>
                  <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                    <Mermaid chart={proc.flowchart} />
                  </div>
                </div>
              )}
            </div>
          );
        }

        if (selectedNode.id.startsWith('file_')) {
          const file = selectedNode.data;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#06b6d4" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', wordBreak: 'break-all' }}>{file.file_name}</h4>
              </div>
              <span style={{ fontSize: '11px', color: '#06b6d4', textTransform: 'uppercase', fontWeight: '600' }}>Canal de Treinamento</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#2d3748', padding: '12px', borderRadius: '8px', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px' }}>Tipo de Canal</span>
                  <strong style={{ color: '#ffffff', textTransform: 'capitalize' }}>{file.file_type}</strong>
                </div>
                <div style={{ borderTop: '1px solid #374151', paddingTop: '8px' }}>
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px' }}>Data de Envio</span>
                  <span style={{ color: '#ffffff' }}>{new Date(file.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                {file.description && (
                  <div style={{ borderTop: '1px solid #374151', paddingTop: '8px' }}>
                    <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px' }}>Contexto / Significado</span>
                    <span style={{ color: '#ffffff', fontStyle: 'italic', fontSize: '12px', display: 'block', marginTop: '2px' }}>"{file.description}"</span>
                  </div>
                )}
                {file.extracted_text && (
                  <div style={{ borderTop: '1px solid #374151', paddingTop: '8px' }}>
                    <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px', marginBottom: '4px' }}>Status de Vetorização (RAG)</span>
                    <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                      <CheckCircle size={12} /> Vetorizado e Calibrado
                    </span>
                  </div>
                )}
              </div>

              <a 
                href={file.file_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backgroundColor: '#0071e7', 
                  color: '#ffffff', 
                  textDecoration: 'none', 
                  padding: '10px 16px', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  marginTop: '8px', 
                  textAlign: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#005bb2'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0071e7'}
              >
                Visualizar Arquivo de Treino
              </a>
            </div>
          );
        }

        return null;
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '650px', 
      backgroundColor: '#111827', 
      borderRadius: '16px', 
      overflow: 'hidden', 
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
      border: '1px solid #1f2937'
    }}>
      
      {/* 1. LADO ESQUERDO: O Grafo SVG Obsidian (70% de largura) */}
      <div style={{ 
        flex: 1, 
        position: 'relative', 
        overflow: 'hidden',
        background: 'radial-gradient(circle, #1f2937 0%, #111827 100%)',
        cursor: 'grab'
      }}>
        {/* Marcadores de Grid de fundo estilo Obsidian */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none'
        }} />

        {/* Tag Flutuante do Tema */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: 'rgba(31,41,55,0.7)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontSize: '11px', color: '#e5e7eb', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rede Cognitiva do Gêmeo</span>
        </div>

        {/* Canvas SVG */}
        <svg 
          viewBox="0 0 600 600" 
          style={{ width: '100%', height: '100%' }}
        >
          {/* Definições de Gradientes Glowing */}
          <defs>
            <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0071e7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0071e7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="dna-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="proc-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Desenhar Arestas (Links de Conexão) */}
          {links.map(link => {
            const isHighlighted = hoveredNodeId === link.source.id || hoveredNodeId === link.target.id;
            const isSelected = selectedNodeId === link.source.id || selectedNodeId === link.target.id;
            
            return (
              <line
                key={link.id}
                x1={link.source.x}
                y1={link.source.y}
                x2={link.target.x}
                y2={link.target.y}
                stroke={isHighlighted || isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.1)'}
                strokeWidth={isHighlighted || isSelected ? 2.5 : 1.2}
                strokeDasharray={link.source.type === 'file' ? '4,4' : 'none'}
                transition="stroke 0.2s, stroke-width 0.2s"
                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
              />
            );
          })}

          {/* Efeito Glow para o Nó Central */}
          <circle cx="300" cy="300" r="45" fill="url(#center-glow)" />

          {/* Desenhar Nós (Nodes) */}
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const isNeighbor = hoveredNodeId && (node.parent === hoveredNodeId || (nodes.find(n => n.id === hoveredNodeId)?.parent === node.id));

            // Tamanho do Nó dependendo do Tipo
            const radius = node.type === 'center' ? 14 : node.type === 'core' ? 9 : 6;
            
            return (
              <g 
                key={node.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedNodeId(node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Efeito Halo / Hover Ring */}
                {(isSelected || isHovered || isNeighbor) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + (isSelected ? 5 : 3)}
                    fill="transparent"
                    stroke={node.color}
                    strokeWidth={isSelected ? 2 : 1}
                    strokeOpacity={isSelected ? 1 : 0.6}
                    style={{ transition: 'r 0.2s, stroke-opacity 0.2s' }}
                  />
                )}

                {/* Bolha de Cor Principal */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={node.color}
                  filter={isHovered || isSelected ? 'brightness(1.2)' : 'none'}
                  style={{ transition: 'transform 0.2s, filter 0.2s' }}
                />

                {/* Rótulo de Texto (Label) */}
                <text
                  x={node.x}
                  y={node.y - (radius + 8)}
                  textAnchor="middle"
                  fill={isSelected ? '#ffffff' : (isHovered ? '#f3f4f6' : '#9ca3af')}
                  fontSize={node.type === 'center' ? '11px' : '9.5px'}
                  fontWeight={isSelected || node.type === 'center' ? '700' : '500'}
                  style={{
                    userSelect: 'none',
                    pointerEvents: 'none',
                    backgroundColor: '#111827',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    transition: 'fill 0.2s, font-size 0.2s'
                  }}
                >
                  {node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 2. LADO DIREITO: Painel de Detalhes Estilo Obsidian Sidebar (30% de largura) */}
      <div style={{ 
        width: '340px', 
        backgroundColor: '#1f2937', 
        borderLeft: '1px solid #374151',
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        boxShadow: '-4px 0 15px rgba(0,0,0,0.1)'
      }}>
        {/* Topo do Painel */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Dados do Grafo</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#e5e7eb', backgroundColor: '#374151', padding: '3px 8px', borderRadius: '4px' }}>
            <Layers size={11} /> Obsidian Graph
          </div>
        </div>

        {/* Conteúdo Dinâmico com Scroll */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {renderDetailContent()}
        </div>

        {/* Rodapé explicativo do Painel */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #374151', backgroundColor: '#111827', fontSize: '11.5px', color: '#9ca3af', lineHeight: '1.4' }}>
          💡 Passe o mouse para ver conexões e clique em qualquer nó para inspecionar os insights correspondentes.
        </div>

      </div>
    </div>
  );
}
