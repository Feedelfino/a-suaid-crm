import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Shield, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DEFAULT_ROLES = [
  { value: 'administrador', label: 'Administrador', description: 'Acesso total ao sistema', is_default: true },
  { value: 'gerente', label: 'Gerente', description: 'Gerencia equipes e relatórios', is_default: true },
  { value: 'agente_registro', label: 'Agente de Registro', description: 'Emissão e renovação de certificados', is_default: true },
  { value: 'agente_comercial', label: 'Agente Comercial', description: 'Vendas e relacionamento com clientes', is_default: true },
];

export default function RoleManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    value: '',
    label: '',
    description: '',
    active: true,
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: () => base44.entities.CustomRole.list(),
  });

  // Combinar roles padrão com customizadas
  const allRoles = [
    ...DEFAULT_ROLES.map(r => ({ ...r, active: true })),
    ...customRoles.filter(r => !DEFAULT_ROLES.some(d => d.value === r.value))
  ];

  const createRole = useMutation({
    mutationFn: (data) => base44.entities.CustomRole.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['custom-roles']);
      resetForm();
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CustomRole.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['custom-roles']);
      resetForm();
    },
  });

  const deleteRole = useMutation({
    mutationFn: (id) => base44.entities.CustomRole.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['custom-roles']),
  });

  const resetForm = () => {
    setFormData({ value: '', label: '', description: '', active: true });
    setEditingRole(null);
    setDialogOpen(false);
  };

  const handleEdit = (role) => {
    if (role.is_default) return; // Não pode editar roles padrão
    setEditingRole(role);
    setFormData({
      value: role.value,
      label: role.label,
      description: role.description || '',
      active: role.active !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    // Gerar value a partir do label se não preenchido
    const data = {
      ...formData,
      value: formData.value || formData.label.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    };

    if (editingRole?.id) {
      updateRole.mutate({ id: editingRole.id, data });
    } else {
      createRole.mutate(data);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#6B2D8B]" />
          Funções e Permissões
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Função
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Editar Função' : 'Nova Função'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Função *</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Ex: Supervisor de Vendas"
                />
              </div>

              <div className="space-y-2">
                <Label>Identificador (será gerado automaticamente)</Label>
                <Input
                  value={formData.value || formData.label.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="supervisor_vendas"
                  disabled={!!editingRole}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva as responsabilidades desta função..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(v) => setFormData({ ...formData, active: v })}
                />
                <Label>Função Ativa</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={!formData.label || createRole.isPending || updateRole.isPending}
                  className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createRole.isPending || updateRole.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Função</TableHead>
              <TableHead>Identificador</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allRoles.map((role) => (
              <TableRow key={role.value}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {role.label}
                    {role.is_default && (
                      <Badge variant="secondary" className="text-xs">Padrão</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm text-slate-500">{role.value}</TableCell>
                <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                  {role.description}
                </TableCell>
                <TableCell>
                  {role.active !== false ? (
                    <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">Inativa</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!role.is_default && (
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(role)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (confirm('Excluir esta função?')) {
                            deleteRole.mutate(role.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">
            <strong>Dica:</strong> Funções padrão do sistema não podem ser editadas ou excluídas. 
            Crie funções personalizadas para necessidades específicas da sua equipe.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}