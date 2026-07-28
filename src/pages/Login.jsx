import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, ArrowRight, BrainCircuit, Check, KeyRound } from 'lucide-react';
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const particlesInit = async (engine) => {
  await loadSlim(engine);
};

const particlesOptions = {
  fullScreen: {
    enable: true,
    zIndex: 1,
  },
  fpsLimit: 120,
  interactivity: {
    detectsOn: "window",
    events: {
      onHover: {
        enable: true,
        mode: "grab",
      },
    },
    modes: {
      grab: {
        distance: 140,
        links: {
          opacity: 0.8,
          color: "#002d80",
        },
      },
    },
  },
  particles: {
    color: {
      value: "#002d80", // Fallback for tsParticles v2/v3
    },
    paint: {
      fill: {
        color: {
          value: "#002d80", // Supported in tsParticles v4
        },
        enable: true,
        opacity: {
          min: 0.5,
          max: 0.85,
        },
      },
    },
    links: {
      color: "#002d80",
      distance: 130,
      enable: true,
      opacity: 0.38,
      width: 1.2,
    },
    move: {
      direction: "none",
      enable: true,
      outModes: {
        default: "out",
      },
      random: false,
      speed: 0.8,
      straight: false,
    },
    number: {
      density: {
        enable: true,
        area: 800,
      },
      value: 120,
    },
    opacity: {
      value: { min: 0.5, max: 0.85 }, // Fallback for tsParticles v2/v3
    },
    shape: {
      type: "circle",
    },
    size: {
      value: { min: 1, max: 3 },
    },
  },
  detectRetina: true,
};

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
    <div style={{ 
      position: 'relative', 
      minHeight: '100vh', 
      width: '100vw', 
      backgroundColor: '#ffffff', 
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.025) 1px, transparent 1px)',
      backgroundSize: '5px 5px',
      overflow: 'hidden' 
    }}>
      


      {/* Interactive Particles (Neural Network / Constellation) */}
      <ParticlesProvider init={particlesInit}>
        <Particles
          id="tsparticles"
          options={particlesOptions}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 1,
          }}
        />
      </ParticlesProvider>

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
            background: 'rgba(255, 255, 255, 0.84)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            padding: '48px 56px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.75)',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
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
        <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', fontWeight: '500' }}>v1.0.1</span>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
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
