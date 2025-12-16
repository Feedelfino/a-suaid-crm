import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, X, Shield, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CampaignUserManager({ campaign, onUpdate }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [isManager, setIsManager] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setCurrentUser(userData);
      } catch (e) {
        console.error('Error loading user:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const { data: accessRecords = [] } = useQuery({
    queryKey: ['user-access-approved'],
    queryFn: () => base44.entities.UserAccess.filter({ status: 'approved' }),
  });

  // Verificar se usuário tem permissão para editar
  const canEdit = currentUser?.role === 'admin' || 
                  currentUser?.email === campaign.campaign_manager;

  const assignedEmails = campaign.assigned_agents || [];
  const managerEmail = campaign.campaign_manager;

  const assignedUsers = accessRecords.filter(u => assignedEmails.includes(u.user_email));
  const availableUsers = accessRecords.filter(u => !assignedEmails.includes(u.user_email) && u.user_email !== managerEmail);

  const handleAddUser = async () => {
    if (!selectedUser || !canEdit) return;

    try {
      const updatedAgents = [...assignedEmails];
      if (!updatedAgents.includes(selectedUser)) {
        updatedAgents.push(selectedUser);
      }

      const updateData = {
        assigned_agents: updatedAgents,
      };

      if (isManager) {
        updateData.campaign_manager = selectedUser;
      }

      await base44.entities.Campaign.update(campaign.id, updateData);
      onUpdate();
      setSelectedUser('');
      setIsManager(false);
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      alert('Erro ao adicionar usuário. Verifique suas permissões.');
    }
  };

  const handleRemoveUser = async (email) => {
    if (!canEdit) return;
    
    try {
      const updatedAgents = assignedEmails.filter(e => e !== email);
      
      const updateData = {
        assigned_agents: updatedAgents,
      };

      // Se remover o gerente
      if (email === managerEmail) {
        updateData.campaign_manager = '';
      }

      await base44.entities.Campaign.update(campaign.id, updateData);
      onUpdate();
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      alert('Erro ao remover usuário. Verifique suas permissões.');
    }
  };

  const handleSetManager = async (email) => {
    if (!canEdit) return;
    
    try {
      await base44.entities.Campaign.update(campaign.id, {
        campaign_manager: email,
      });
      onUpdate();
    } catch (error) {
      console.error('Erro ao definir gerente:', error);
      alert('Erro ao definir gerente. Verifique suas permissões.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#6B2D8B] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Acesso Restrito:</strong> Apenas o gerente da campanha ou administradores podem designar usuários.
          </p>
        </div>
      )}
      
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6B2D8B]" />
            Usuários Atribuídos à Campanha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add User */}
          <div className="flex gap-2">
            <Select 
              value={selectedUser} 
              onValueChange={setSelectedUser}
              disabled={!canEdit}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-slate-500">
                    Todos os usuários já estão atribuídos
                  </div>
                ) : (
                  availableUsers.map(user => (
                    <SelectItem key={user.user_email} value={user.user_email}>
                      {user.nickname || user.user_name} ({user.user_email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddUser}
              disabled={!selectedUser || !canEdit}
              className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isManager"
              checked={isManager}
              onChange={(e) => setIsManager(e.target.checked)}
              className="w-4 h-4"
              disabled={!canEdit}
            />
            <label htmlFor="isManager" className="text-sm text-slate-600">
              Definir como Gerente da Campanha
            </label>
          </div>

          {/* Manager */}
          {managerEmail && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-semibold text-purple-900">Gerente da Campanha</p>
                    <p className="text-xs text-purple-700">
                      {accessRecords.find(u => u.user_email === managerEmail)?.nickname || 
                       accessRecords.find(u => u.user_email === managerEmail)?.user_name || 
                       managerEmail}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assigned Users List */}
          <div className="space-y-2">
            {assignedUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Nenhum usuário atribuído</p>
              </div>
            ) : (
              assignedUsers.map(user => (
                <div 
                  key={user.user_email}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-[#6B2D8B] to-[#C71585] text-white">
                        {(user.nickname || user.user_name)?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-800">
                        {user.nickname || user.user_name}
                      </p>
                      <p className="text-xs text-slate-500">{user.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.user_email === managerEmail && (
                      <Badge className="bg-purple-100 text-purple-700">
                        <Shield className="w-3 h-3 mr-1" />
                        Gerente
                      </Badge>
                    )}
                    {user.user_email !== managerEmail && canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetManager(user.user_email)}
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        Tornar Gerente
                      </Button>
                    )}
                    {canEdit && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveUser(user.user_email)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Permissões:</strong> Usuários atribuídos podem visualizar e trabalhar nesta campanha no funil de vendas. O gerente pode editar a campanha.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}