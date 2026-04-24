'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Building2, Shield, CreditCard, 
  TrendingUp, Globe, Linkedin, Mail, Phone, MapPin, 
  Zap, LogOut, ExternalLink,
  CheckCircle2, LucideIcon, FileText
} from 'lucide-react';

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useSubscription } from '@/lib/hooks/useSubscription';
import PlanBadge from '@/components/PlanBadge';

// --- Tipos ---
type ProfileSection = 'personal' | 'business' | 'subscription' | 'security' | 'metrics';

// --- Componentes de UI Átomos ---

function NavItem({ icon: Icon, label, active, onClick }: { icon: LucideIcon, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
        active 
          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' 
          : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={2.5} />
      {label}
      {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />}
    </button>
  );
}

function InputGroup({ label, icon: Icon, ...props }: any) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">
            <Icon size={18} />
          </div>
        )}
        <input 
          {...props}
          className={`w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${Icon ? 'pl-11 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  );
}

function SectionWrapper({ title, description, children, onSave, saving }: { title: string, description: string, children: React.ReactNode, onSave?: () => void, saving?: boolean }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {onSave && (
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// --- Secciones de Contenido ---

function PersonalSection({ onSave, saving, session }: any) {
  return (
    <SectionWrapper title="Información Personal" description="Gestiona tu identidad profesional." onSave={onSave} saving={saving}>
      <div className="grid gap-6 md:grid-cols-2">
        <InputGroup label="Nombre" defaultValue={session?.user?.name?.split(' ')[0] || ''} />
        <InputGroup label="Apellidos" defaultValue={session?.user?.name?.split(' ')[1] || ''} />
        <InputGroup label="Email Profesional" defaultValue={session?.user?.email || ''} icon={Mail} disabled />
        <InputGroup label="Teléfono" placeholder="+34 600 000 000" icon={Phone} />
        <InputGroup label="Web Profesional" placeholder="https://tuportfolio.com" icon={Globe} />
        <InputGroup label="LinkedIn" placeholder="linkedin.com/in/usuario" icon={Linkedin} />
        <div className="md:col-span-2">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Biografía Profesional</label>
          <textarea rows={4} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Trayectoria..." />
        </div>
      </div>
    </SectionWrapper>
  );
}

function BusinessSection({ onSave, saving }: any) {
  return (
    <SectionWrapper title="Información de Empresa" description="Datos para tus presupuestos automáticos." onSave={onSave} saving={saving}>
      <div className="grid gap-6 md:grid-cols-2">
        <InputGroup label="Nombre Comercial" placeholder="Mi Empresa" />
        <InputGroup label="CIF / NIF" placeholder="B-12345678" />
        <div className="md:col-span-2">
          <InputGroup label="Dirección Fiscal" placeholder="Calle Ejemplo 123" icon={MapPin} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-4 block text-xs font-bold uppercase tracking-wider text-slate-500">Logo Corporativo</label>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50"><Building2 className="h-8 w-8 text-slate-300" /></div>
            <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Subir logo</button>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}

function MetricCard({ label, value, icon: Icon, trend }: { label: string, value: string, icon: LucideIcon, trend: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
          <Icon size={20} />
        </div>
        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">{trend}</span>
      </div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function MetricsSection() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Presupuestos" value="128" icon={FileText} trend="+12%" />
        <MetricCard label="Conversión" value="68%" icon={CheckCircle2} trend="+5%" />
        <MetricCard label="Ingresos" value="42k€" icon={TrendingUp} trend="+22%" />
        <MetricCard label="Ahorro" value="14h" icon={Zap} trend="+8h" />
      </div>
    </div>
  );
}

function SubscriptionSection({ planLabel }: any) {
  return (
    <SectionWrapper title="Suscripción" description="Estado de tu cuenta de pago.">
      <div className="rounded-2xl bg-slate-50 p-8 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase">Plan Actual</p>
          <p className="text-3xl font-extrabold text-slate-900">{planLabel}</p>
        </div>
        <button className="rounded-xl bg-white border border-slate-200 px-6 py-3 font-bold flex items-center gap-2 text-sm">Stripe <ExternalLink className="h-4 w-4" /></button>
      </div>
    </SectionWrapper>
  );
}

function SecuritySection() {
  return (
    <SectionWrapper title="Seguridad" description="Protección de cuenta.">
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-bold">Verificación de Email</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        </div>
        <button className="rounded-xl border border-slate-200 px-6 py-2.5 font-bold text-sm">Cambiar Contraseña</button>
      </div>
    </SectionWrapper>
  );
}

// --- Componente Principal ---

export default function PremiumProfilePage() {
  const { data: session, status } = useSession();
  const { plan, label: planLabel } = useSubscription();
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal');
  const [isSaving, setIsSaving] = useState(false);

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  if (status === 'unauthenticated') redirect('/login');

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <SiteHeader />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="relative mb-8 overflow-hidden rounded-[2rem] bg-slate-900 p-8 shadow-2xl sm:p-12">
          <div className="relative flex flex-col items-center gap-8 sm:flex-row">
            <div className="h-32 w-32 overflow-hidden rounded-3xl border-4 border-slate-800 bg-slate-800 shadow-xl">
              {session?.user?.image ? (
                <img src={session.user.image} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-4xl font-bold text-white bg-slate-700">{session?.user?.name?.charAt(0)}</div>
              )}
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{session?.user?.name || 'Usuario'}</h1>
                <PlanBadge />
              </div>
              <p className="mt-2 text-slate-400 italic">Estratega de Negocio</p>
            </div>
            {plan === 'free' && (
              <button onClick={() => window.location.href='/subscription'} className="rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white flex items-center gap-2 hover:bg-blue-700 transition-all">
                <Zap className="h-5 w-5 fill-white" /> Actualizar a Pro
              </button>
            )}
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-1">
            <NavItem icon={User} label="Perfil Personal" active={activeSection === 'personal'} onClick={() => setActiveSection('personal')} />
            <NavItem icon={Building2} label="Empresa" active={activeSection === 'business'} onClick={() => setActiveSection('business')} />
            <NavItem icon={TrendingUp} label="Métricas" active={activeSection === 'metrics'} onClick={() => setActiveSection('metrics')} />
            <NavItem icon={CreditCard} label="Suscripción" active={activeSection === 'subscription'} onClick={() => setActiveSection('subscription')} />
            <NavItem icon={Shield} label="Seguridad" active={activeSection === 'security'} onClick={() => setActiveSection('security')} />
          </aside>

          <section>
            <AnimatePresence mode="wait">
              <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {activeSection === 'personal' && <PersonalSection onSave={handleSave} saving={isSaving} session={session} />}
                {activeSection === 'business' && <BusinessSection onSave={handleSave} saving={isSaving} />}
                {activeSection === 'metrics' && <MetricsSection />}
                {activeSection === 'subscription' && <SubscriptionSection planLabel={planLabel} />}
                {activeSection === 'security' && <SecuritySection />}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
