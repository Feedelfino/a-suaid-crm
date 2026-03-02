import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Building2, MessageSquare, FileText, RefreshCw, Globe, Instagram, Linkedin, User } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

const statusColors = {
  novo: 'bg-blue-100 text-blue-700 border-blue-200',
  em_contato: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  qualificado: 'bg-green-100 text-green-700 border-green-200',
  negociando: 'bg-purple-100 text-purple-700 border-purple-200',
  fechado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  perdido: 'bg-red-100 text-red-700 border-red-200',
  indeciso: 'bg-orange-100 text-orange-700 border-orange-200',
};

const statusLabels = {
  novo: 'Novo', em_contato: 'Em Contato', qualificado: 'Qualificado',
  negociando: 'Negociando', fechado: 'Fechado', perdido: 'Perdido', indeciso: 'Indeciso',
};

const sourceLabels = {
  whatsapp: 'WhatsApp', indicacao: 'Indicação', instagram: 'Instagram',
  google_ads: 'Google Ads', linkedin: 'LinkedIn', organico: 'Orgânico',
  renovacao: 'Renovação', outro: 'Outro',
};

const certLabels = {
  e_cpf_a1: 'e-CPF A1', e_cpf_a3: 'e-CPF A3', e_cnpj_a1: 'e-CNPJ A1', e_cnpj_a3: 'e-CNPJ A3',
};

function InfoItem({ icon: Icon, label, value, color = 'text-[#6B2D8B]' }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={`w-4 h-4 shrink-0 ${color}`} />
      <span className="text-slate-500 shrink-0">{label}:</span>
      <span className="font-medium text-slate-700 truncate">{value}</span>
    </div>
  );
}

function SectionProgress({ label, filled, total }) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  const color = pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-medium shrink-0 ${pct === 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
        {filled}/{total}
      </span>
    </div>
  );
}

export default function ClientSummaryCard({ data }) {
  if (!data.client_name) return null;

  // Calcular progresso por seção
  const sections = [
    {
      label: 'Dados Pessoais',
      fields: [data.client_name, data.cpf],
    },
    {
      label: 'Empresa',
      fields: [data.company_name, data.cnpj, data.business_area],
    },
    {
      label: 'Contato',
      fields: [data.phone, data.whatsapp, data.email, data.instagram, data.linkedin, data.website],
    },
    {
      label: 'Classificação',
      fields: [data.lead_status, data.lead_source, data.notes],
    },
  ];

  // Certificado vencimento
  let certDaysLeft = null;
  if (data.has_certificate && data.certificate_expiry_date) {
    try {
      certDaysLeft = differenceInDays(parseISO(data.certificate_expiry_date), new Date());
    } catch {}
  }

  return (
    <Card className="border-0 shadow-lg border-l-4 border-l-[#6B2D8B] bg-gradient-to-r from-[#6B2D8B]/5 to-white">
      <CardContent className="pt-5 pb-5">
        <div className="flex flex-col md:flex-row gap-5">
          {/* Avatar + nome + badges */}
          <div className="flex items-start gap-4 md:w-72 shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6B2D8B] to-[#C71585] flex items-center justify-center text-white text-xl font-bold shrink-0 shadow">
              {data.client_name?.charAt(0) || <User className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-base leading-tight truncate">{data.client_name}</h3>
              {data.company_name && (
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                  <Building2 className="w-3 h-3 shrink-0" /> {data.company_name}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {data.lead_status && (
                  <Badge className={`text-xs border ${statusColors[data.lead_status] || 'bg-slate-100 text-slate-600'}`}>
                    {statusLabels[data.lead_status] || data.lead_status}
                  </Badge>
                )}
                {data.lead_source && (
                  <Badge variant="outline" className="text-xs text-slate-500">
                    {sourceLabels[data.lead_source] || data.lead_source}
                  </Badge>
                )}
                {data.client_code && (
                  <Badge variant="outline" className="text-xs font-mono text-slate-400">
                    #{data.client_code}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="hidden md:block w-px bg-slate-200 shrink-0" />

          {/* Contatos + certificado */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
            <InfoItem icon={Phone} label="Telefone" value={data.phone} />
            <InfoItem icon={MessageSquare} label="WhatsApp" value={data.whatsapp} color="text-green-600" />
            <InfoItem icon={Mail} label="E-mail" value={data.email} />
            {data.business_area && (
              <InfoItem icon={Building2} label="Área" value={data.business_area} />
            )}
            {data.instagram && (
              <InfoItem icon={Instagram} label="Instagram" value={data.instagram} color="text-pink-500" />
            )}
            {data.linkedin && (
              <InfoItem icon={Linkedin} label="LinkedIn" value={data.linkedin} color="text-blue-600" />
            )}
            {data.website && (
              <InfoItem icon={Globe} label="Site" value={data.website} color="text-slate-500" />
            )}
            {data.has_certificate && data.certificate_type && (
              <div className="flex items-center gap-2 text-sm sm:col-span-2">
                <FileText className="w-4 h-4 shrink-0 text-[#C71585]" />
                <span className="text-slate-500 shrink-0">Certificado:</span>
                <span className="font-medium text-slate-700">{certLabels[data.certificate_type]}</span>
                {data.certificate_expiry_date && (
                  <Badge className={`ml-1 text-xs ${certDaysLeft !== null && certDaysLeft < 30 ? 'bg-red-100 text-red-600' : certDaysLeft !== null && certDaysLeft < 90 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                    {data.certificate_expiry_date ? `Val. ${format(parseISO(data.certificate_expiry_date), 'dd/MM/yyyy')}` : ''}
                    {certDaysLeft !== null && ` (${certDaysLeft}d)`}
                  </Badge>
                )}
              </div>
            )}
            {data.has_service && data.service_type && (
              <div className="flex items-center gap-2 text-sm sm:col-span-2">
                <RefreshCw className="w-4 h-4 shrink-0 text-green-600" />
                <span className="text-slate-500 shrink-0">Serviço:</span>
                <span className="font-medium text-slate-700">{data.service_type}</span>
              </div>
            )}
          </div>

          {/* Divisor */}
          <div className="hidden md:block w-px bg-slate-200 shrink-0" />

          {/* Progresso por seção */}
          <div className="flex flex-col gap-2 justify-center md:w-52 shrink-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Completude do Cadastro</p>
            {sections.map(s => (
              <SectionProgress
                key={s.label}
                label={s.label}
                filled={s.fields.filter(f => f !== '' && f !== null && f !== undefined && f !== false).length}
                total={s.fields.length}
              />
            ))}
          </div>
        </div>

        {/* Observações */}
        {data.notes && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Observações</p>
            <p className="text-sm text-slate-600 line-clamp-2">{data.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}