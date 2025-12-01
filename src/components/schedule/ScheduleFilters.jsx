import React from 'react';
import { Filter, Users, Building2, Briefcase } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const EVENT_TYPES = {
  comercial: [
    { value: 'reuniao_venda', label: 'Reunião de Venda' },
    { value: 'visita_comercial', label: 'Visita Comercial' },
    { value: 'demonstracao', label: 'Demonstração' },
    { value: 'followup', label: 'Follow-up' },
    { value: 'tentativa_contato', label: 'Tentativa de Contato' },
    { value: 'proposta', label: 'Proposta' },
  ],
  interno: [
    { value: 'reuniao_equipe', label: 'Reunião de Equipe' },
    { value: 'reuniao_administrativa', label: 'Reunião Administrativa' },
    { value: 'reuniao_planejamento', label: 'Reunião de Planejamento' },
    { value: 'reuniao_alinhamento', label: 'Alinhamento' },
    { value: 'sessao_feedback', label: 'Sessão de Feedback' },
    { value: 'reuniao_1_1', label: 'Reunião 1:1' },
    { value: 'treinamento', label: 'Treinamento' },
    { value: 'atividade_interna', label: 'Atividade Interna' },
  ],
};

export default function ScheduleFilters({
  selectedAgent,
  setSelectedAgent,
  selectedCategory,
  setSelectedCategory,
  selectedEventType,
  setSelectedEventType,
  approvedUsers,
  user,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Filtro de Agente */}
      <Select value={selectedAgent} onValueChange={setSelectedAgent}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mine">Minha Agenda</SelectItem>
          <SelectItem value="all">Todos os Agentes</SelectItem>
          {approvedUsers.map(u => (
            <SelectItem key={u.user_email} value={u.user_email}>
              {u.nickname || u.user_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro de Categoria */}
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="comercial">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-600" />
              Comercial
            </div>
          </SelectItem>
          <SelectItem value="interno">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Interno
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Filtro de Tipo de Evento */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Tipo
            {selectedEventType !== 'all' && (
              <Badge className="ml-1 bg-[#6B2D8B] text-white">1</Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => setSelectedEventType('all')}>
            Todos os tipos
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-purple-600">Comercial</DropdownMenuLabel>
          {EVENT_TYPES.comercial.map(type => (
            <DropdownMenuItem 
              key={type.value} 
              onClick={() => setSelectedEventType(type.value)}
              className={selectedEventType === type.value ? 'bg-purple-50' : ''}
            >
              {type.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-blue-600">Interno</DropdownMenuLabel>
          {EVENT_TYPES.interno.map(type => (
            <DropdownMenuItem 
              key={type.value} 
              onClick={() => setSelectedEventType(type.value)}
              className={selectedEventType === type.value ? 'bg-blue-50' : ''}
            >
              {type.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}