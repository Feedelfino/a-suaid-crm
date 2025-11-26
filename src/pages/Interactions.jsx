import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, User, Building2, Phone, Mail, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function Interactions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { data: recentClients = [] } = useQuery({
    queryKey: ['recent-clients'],
    queryFn: () => base44.entities.Client.list('-updated_date', 10),
  });

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const allClients = await base44.entities.Client.list();
      const term = searchTerm.toLowerCase();
      
      const filtered = allClients.filter(client => 
        client.client_name?.toLowerCase().includes(term) ||
        client.company_name?.toLowerCase().includes(term) ||
        client.phone?.includes(term) ||
        client.cpf?.includes(term) ||
        client.cnpj?.includes(term) ||
        client.email?.toLowerCase().includes(term)
      );
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const statusColors = {
    novo: 'bg-blue-100 text-blue-700',
    em_contato: 'bg-yellow-100 text-yellow-700',
    qualificado: 'bg-green-100 text-green-700',
    negociando: 'bg-purple-100 text-purple-700',
    fechado: 'bg-emerald-100 text-emerald-700',
    perdido: 'bg-red-100 text-red-700',
    indeciso: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-[#6B2D8B] to-[#8B4DAB]">
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Nova Interação</h2>
          <p className="text-white/80 mb-6">Busque por nome, telefone, CPF, CNPJ ou e-mail</p>
          
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-12 h-14 text-lg bg-white border-0 rounded-xl shadow-lg"
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={isSearching}
              className="h-14 px-8 bg-white text-[#6B2D8B] hover:bg-white/90 rounded-xl shadow-lg font-semibold"
            >
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Resultados da Busca</span>
              <Badge variant="secondary">{searchResults.length} encontrado(s)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 mb-6">Nenhum cliente encontrado com esses dados</p>
                <Link to={createPageUrl('ClientForm')}>
                  <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Novo Cliente
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((client) => (
                  <Link 
                    key={client.id} 
                    to={createPageUrl(`ClientDetails?id=${client.id}`)}
                    className="block"
                  >
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white font-bold">
                        {client.client_name?.charAt(0) || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800">{client.client_name}</p>
                        {client.company_name && (
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {client.company_name}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                          {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>}
                          {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {client.email}</span>}
                        </div>
                      </div>
                      <Badge className={statusColors[client.lead_status] || 'bg-slate-100 text-slate-600'}>
                        {client.lead_status?.replace('_', ' ') || 'novo'}
                      </Badge>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#6B2D8B] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Clients */}
      {!hasSearched && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Clientes Recentes</span>
              <Link to={createPageUrl('Clients')}>
                <Button variant="ghost" size="sm" className="text-[#6B2D8B]">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentClients.map((client) => (
                <Link 
                  key={client.id} 
                  to={createPageUrl(`ClientDetails?id=${client.id}`)}
                  className="block"
                >
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white font-bold">
                      {client.client_name?.charAt(0) || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{client.client_name}</p>
                      {client.company_name && (
                        <p className="text-sm text-slate-500">{client.company_name}</p>
                      )}
                    </div>
                    <Badge className={statusColors[client.lead_status] || 'bg-slate-100 text-slate-600'}>
                      {client.lead_status?.replace('_', ' ') || 'novo'}
                    </Badge>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#6B2D8B] transition-colors" />
                  </div>
                </Link>
              ))}
              
              {recentClients.length === 0 && (
                <div className="text-center py-12">
                  <User className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 mb-6">Nenhum cliente cadastrado ainda</p>
                  <Link to={createPageUrl('ClientForm')}>
                    <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Primeiro Cliente
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}