import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, ArrowRight, BrainCircuit, Check, KeyRound } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [token, setToken] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin + '/mind-sync'
        },
      });
      
      if (error) throw error;
      setOtpSent(true);
    } catch (error) {
      console.error('Error sending OTP:', error.message);
      alert('Erro ao enviar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!token) return;
    
    try {
      setLoading(true);
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      
      if (error) throw error;
      // App.jsx intercepta o onAuthStateChange e redireciona
    } catch (error) {
      console.error('Error verifying OTP:', error.message);
      alert('Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100vw', backgroundColor: '#f5f5f7', overflow: 'hidden' }}>
      
      {/* Background Image with Pan effect */}
      <div style={{ 
        position: 'absolute', 
        top: '-5%', 
        left: '-5%', 
        width: '110vw', 
        height: '110vh', 
        backgroundImage: 'url("/mindsync_bg.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(8px) brightness(1.02)',
        zIndex: 0,
        animation: 'panBackground 40s linear infinite alternate'
      }} />

      {/* Smooth radial gradient overlay to focus center card */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: 'radial-gradient(circle at center, rgba(251, 251, 253, 0.45) 0%, rgba(251, 251, 253, 0.85) 100%)',
        zIndex: 1 
      }} />

      {/* Subtle organic light spots on top of background */}
      <div style={{ 
        position: 'absolute', top: '10%', left: '20%', width: '40vw', height: '40vw', 
        background: 'radial-gradient(circle, rgba(0, 113, 227, 0.12) 0%, rgba(251,251,253,0) 70%)',
        borderRadius: '50%', zIndex: 1 
      }} />
      <div style={{ 
        position: 'absolute', bottom: '10%', right: '10%', width: '45vw', height: '45vw', 
        background: 'radial-gradient(circle, rgba(0, 113, 227, 0.08) 0%, rgba(251,251,253,0) 70%)',
        borderRadius: '50%', zIndex: 1 
      }} />

      {/* Main Content Overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          padding: '24px'
        }}
      >
        <div 
          className="glass-card"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '32px', 
            flexWrap: 'wrap', 
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)',
            padding: '48px 56px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            maxWidth: '90%',
            animation: 'cardFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          
          {/* Logo Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <img 
              src="/dtw-logo.png" 
              alt="DTW Logo" 
              style={{ 
                width: '200px',
                height: 'auto',
                objectFit: 'contain'
              }} 
            />
            <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Agentic twin, seu tempo infinito</span>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '80px', backgroundColor: 'var(--color-border)', display: 'block' }} className="hidden sm:block" />

          {/* Form Section */}
          <div style={{ width: '320px' }}>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="glass-input-container">
                  <Mail size={18} color="var(--color-text-secondary)" />
                  <input 
                    type="email" 
                    className="glass-input" 
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button type="submit" className="glass-btn" disabled={loading || !email}>
                    {loading ? <div style={{width:'18px', height:'18px', border:'2px solid var(--color-border)', borderTopColor:'var(--color-accent)', borderRadius:'50%', animation:'spin 1s linear infinite'}}/> : <ArrowRight size={18} />}
                  </button>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', fontWeight: '400' }}>
                  Um código de 6 dígitos será enviado para o seu e-mail.
                </span>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="glass-input-container">
                  <KeyRound size={18} color="var(--color-text-secondary)" />
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Digite o código de 6 dígitos"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    required
                    disabled={loading}
                    maxLength={6}
                  />
                  <button type="submit" className="glass-btn" disabled={loading || token.length < 6}>
                    {loading ? <div style={{width:'18px', height:'18px', border:'2px solid var(--color-border)', borderTopColor:'var(--color-accent)', borderRadius:'50%', animation:'spin 1s linear infinite'}}/> : <Check size={18} />}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: '500' }}>
                    Código enviado!
                  </span>
                  <button type="button" onClick={() => setOtpSent(false)} style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textDecoration: 'underline', fontWeight: '400' }}>
                    Alterar e-mail
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>

      {/* Footer Version */}
      <div style={{ position: 'absolute', bottom: '16px', right: '24px', zIndex: 3 }}>
        <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', fontWeight: '500' }}>v1.0.0 Beta</span>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes panBackground {
          0% { transform: scale(1.05) translate(0, 0); }
          50% { transform: scale(1.1) translate(-1%, -1%); }
          100% { transform: scale(1.05) translate(1%, 1%); }
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .hidden.sm\\:block { display: none !important; }
          .glass-card {
            padding: 32px 24px !important;
            gap: 24px !important;
          }
        }
      `}} />
    </div>
  );
}
