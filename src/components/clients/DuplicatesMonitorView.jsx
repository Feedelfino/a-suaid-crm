import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AlertTriangle, Eye, Users, Phone, Mail, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function findPotentialDuplicates(clients) {
  const groups = [];
  const processed = new Set();

  clients.forEach((client, index) => {
    if (processed.has(client.id)) return;

    const duplicates = [client];
    
    clients.forEach((other, otherIndex) => {
      if (index === otherIndex || processed.has(other.id)) return;

      let matchCount = 0;
      const reasons = [];

      // Nome + Sobrenome (similaridade)
      if (client.client_name && other.client_name) {
        const name1 = client.client_name.toLowerCase().trim();
        const name2 = other.client_name.toLowerCase().trim();
        if (name1 === name2) {
          matchCount++;
          reasons.push('Nome completo');
        }
      }

      // Telefone
      if (client.phone && other.phone) {
        const phone1 = client.phone.replace(/\D/g, '');
        const phone2 = other.phone.replace(/\D/g, '');
        if (phone1 === phone2 && phone1.length >= 10) {
          matchCount++;
          reasons.push('Telefone');
        }
      }

      // CPF
      if (client.cpf && other.cpf) {
        const cpf1 = client.cpf.replace(/\D/g, '');
        const cpf2 = other.cpf.replace(/\D/g, '');
        if (cpf1 === cpf2 && cpf1.length === 11) {
          matchCount++;
          reasons.push('CPF');
        }
      }

      // Se 2 ou mais campos coincidem, é duplicata potencial
      if (matchCount >= 2) {
        duplicates.push(other);
        processed.add(other.id);
      }
    });

    if (duplicates.length > 1) {
      processed.add(client.id);
      groups.push(duplicates);
    }
  });

  return groups;
}

export default function DuplicatesMonitorView({ clients }) {
  const duplicateGroups = findPotentialDuplicates(clients);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">
                {duplicateGroups.length} grupo(s) de duplicatas potenciais encontrados
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Esta área serve apenas para conferência visual. Verifique manualmente cada grupo antes de unificar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Groups */}
      {duplicateGroups.length === 0 ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <Users className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <p className="font-semibold text-green-900">Nenhuma duplicata detectada</p>
            <p className="text-sm text-green-700 mt-1">
              Todos os cadastros estão únicos no sistema.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicateGroups.map((group, index) => (
            <Card key={index} className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Grupo {index + 1} - {group.length} registros similares</span>
                  <Badge variant="outline" className="text-amber-700 border-amber-700">
                    Conferência Manual
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.map((client, clientIndex) => (
                  <div 
                    key={client.id}
                    className={`p-4 rounded-lg border ${
                      clientIndex === 0 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white font-bold text-sm">
                            {client.client_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{client.client_name}</p>
                            {client.company_name && (
                              <p className="text-sm text-slate-500">{client.company_name}</p>
                            )}
                            {clientIndex === 0 && (
                              <Badge className="bg-blue-600 text-xs mt-1">Registro Referência</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm ml-13">
                          {client.cpf && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span><strong>CPF:</strong> {client.cpf}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link to={createPageUrl(`ClientDetails?id=${client.id}`)}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-800">
                    ⚠️ <strong>Ação Manual Necessária:</strong> Revise cada registro e use o botão "Detectar Duplicatas" 
                    na página principal para realizar a unificação de forma controlada.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}