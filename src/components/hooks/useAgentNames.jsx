import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DEFAULT_AGENTS = {
  agent_1: 'Agente 1',
  agent_2: 'Agente 2',
  agent_3: 'Agente 3',
  agent_4: 'Agente 4',
};

export function useAgentNames() {
  const { data: agentConfigs = [] } = useQuery({
    queryKey: ['agent-configs'],
    queryFn: () => base44.entities.AgentConfig.list(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const agentNames = { ...DEFAULT_AGENTS };
  
  agentConfigs.forEach(config => {
    if (config.agent_key && config.display_name) {
      agentNames[config.agent_key] = config.display_name;
    }
  });

  // Return both array and object for different use cases
  const agentList = [
    { key: 'agent_1', name: agentNames.agent_1 },
    { key: 'agent_2', name: agentNames.agent_2 },
    { key: 'agent_3', name: agentNames.agent_3 },
    { key: 'agent_4', name: agentNames.agent_4 },
  ];

  // Legacy array format (just names)
  const agentNamesArray = agentList.map(a => a.name);

  return {
    agentNames,        // Object: { agent_1: "Nome 1", ... }
    agentList,         // Array: [{ key: "agent_1", name: "Nome 1" }, ...]
    agentNamesArray,   // Array: ["Nome 1", "Nome 2", ...]
    getAgentName: (key) => agentNames[key] || key,
  };
}