import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export default function BasicForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    job_title: '',
    industry: '',
    main_challenges: '',
    education: '',
    intellectual_profile: ''
  });

  useEffect(() => {
    // Busca dados existentes caso o usuário já tenha preenchido
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFormData(prev => ({ ...prev, name: user.user_metadata?.full_name || '' }));
        
        const { data } = await supabase
          .from('dtw_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (data) {
          if (data.job_title && data.industry && data.education) {
            // Se já tem dados base, podemos pular pro chat (ou permitir editar)
            navigate('/mind-sync/chat');
          } else {
            setFormData({
              name: data.name || user.user_metadata?.full_name || '',
              job_title: data.job_title || '',
              industry: data.industry || '',
              main_challenges: data.main_challenges || '',
              education: data.education || '',
              intellectual_profile: data.intellectual_profile || ''
            });
          }
        }
      }
    }
    fetchProfile();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('dtw_profiles')
        .upsert({
          id: user.id,
          ...formData
        });

      if (error) throw error;
      
      // Ir para o chat
      navigate('/mind-sync/chat');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert('Ocorreu um erro ao salvar seus dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="container" style={{ padding: '60px 24px', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '12px' }}>Mind Sync</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '40px', fontSize: '17px' }}>
        Para criarmos o seu Gêmeo Digital com precisão, precisamos de um panorama rápido sobre a sua atuação.
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '24px' }}>
          <Input 
            label="Nome ou Como gosta de ser chamado"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          
          <Input 
            label="Seu Cargo / Posição"
            name="job_title"
            placeholder="Ex: CEO, Diretor de Operações..."
            value={formData.job_title}
            onChange={handleChange}
            required
          />
          
          <Input 
            label="Segmento de Atuação (Indústria)"
            name="industry"
            placeholder="Ex: Tecnologia, Varejo, Finanças..."
            value={formData.industry}
            onChange={handleChange}
            required
          />

          <Input 
            label="Formação Acadêmica & Especializações"
            name="education"
            placeholder="Ex: Graduação em Engenharia, MBA, Mestrado, Doutorado..."
            value={formData.education}
            onChange={handleChange}
            required
          />

          <div className="input-group">
            <label className="input-label">Bagagem Intelectual & Referências (Livros, Autores, Cursos)</label>
            <textarea 
              className="input-field" 
              name="intellectual_profile"
              rows="3"
              placeholder="Ex: Livros que te moldaram, autores favoritos ou cursos que guiam seu pensamento..."
              value={formData.intellectual_profile}
              onChange={handleChange}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Principais Desafios Atuais</label>
            <textarea 
              className="input-field" 
              name="main_challenges"
              rows="3"
              placeholder="Descreva brevemente os maiores gargalos do seu dia a dia..."
              value={formData.main_challenges}
              onChange={handleChange}
              style={{ resize: 'vertical' }}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ marginTop: '16px' }}>
            {loading ? 'Salvando...' : 'Iniciar Sincronização Mental'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
