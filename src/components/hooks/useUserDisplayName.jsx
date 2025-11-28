import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Hook para obter o nome de exibição dos usuários
export function useUserDisplayName() {
  const { data: accessRecords = [] } = useQuery({
    queryKey: ['user-access-all'],
    queryFn: () => base44.entities.UserAccess.filter({ status: 'approved' }),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Retorna nickname se existir, senão nome completo
  const getDisplayName = (email, fallbackName = '') => {
    const userAccess = accessRecords.find(u => u.user_email === email);
    if (userAccess?.nickname) {
      return userAccess.nickname;
    }
    if (userAccess?.user_name) {
      return userAccess.user_name;
    }
    return fallbackName || email?.split('@')[0] || 'Usuário';
  };

  // Mapa de email para nome de exibição
  const displayNameMap = {};
  accessRecords.forEach(record => {
    displayNameMap[record.user_email] = record.nickname || record.user_name || record.user_email?.split('@')[0];
  });

  return {
    getDisplayName,
    displayNameMap,
    accessRecords,
  };
}