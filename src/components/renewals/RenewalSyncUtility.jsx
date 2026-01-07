import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

/**
 * Utilitário para sincronizar clientes com certificado digital
 * na entidade Certificate, garantindo que apareçam em Renovação
 */
export default function RenewalSyncUtility() {
  const queryClient = useQueryClient();
  const [syncResult, setSyncResult] = useState(null);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const results = {
        total: 0,
        synced: 0,
        skipped: 0,
        errors: 0,
        details: []
      };

      // Buscar todos os clientes com certificado digital
      const clientsWithCert = await base44.entities.Client.filter({ has_certificate: true });
      results.total = clientsWithCert.length;

      // Buscar certificados existentes
      const existingCerts = await base44.entities.Certificate.list('-created_date', 2000);
      const certsByClientId = new Map(
        existingCerts.map(cert => [cert.client_id, cert])
      );

      // Processar cada cliente
      for (const client of clientsWithCert) {
        try {
          // Verificar se cliente tem data de validade do certificado
          if (!client.certificate_expiry_date) {
            results.skipped++;
            results.details.push({
              client: client.client_name,
              status: 'skipped',
              reason: 'Sem data de validade'
            });
            continue;
          }

          // Verificar se já existe certificado para este cliente
          const existingCert = certsByClientId.get(client.id);

          if (existingCert) {
            // Atualizar certificado existente se necessário
            const needsUpdate = 
              existingCert.expiry_date !== client.certificate_expiry_date ||
              existingCert.certificate_type !== client.certificate_type;

            if (needsUpdate) {
              await base44.entities.Certificate.update(existingCert.id, {
                certificate_type: client.certificate_type || existingCert.certificate_type,
                expiry_date: client.certificate_expiry_date,
                client_name: client.client_name,
                client_email: client.email || existingCert.client_email,
                client_phone: client.phone || client.whatsapp || existingCert.client_phone,
              });
              results.synced++;
              results.details.push({
                client: client.client_name,
                status: 'updated',
                reason: 'Dados atualizados'
              });
            } else {
              results.skipped++;
              results.details.push({
                client: client.client_name,
                status: 'ok',
                reason: 'Já sincronizado'
              });
            }
          } else {
            // Criar novo registro de certificado
            await base44.entities.Certificate.create({
              client_id: client.id,
              client_name: client.client_name,
              client_email: client.email || '',
              client_phone: client.phone || client.whatsapp || '',
              certificate_type: client.certificate_type || 'e_cpf_a3',
              expiry_date: client.certificate_expiry_date,
              status: 'ativo',
              renewal_status: 'pendente',
              assigned_agent: client.assigned_agent || '',
              notes: 'Sincronizado automaticamente do cadastro de cliente'
            });
            results.synced++;
            results.details.push({
              client: client.client_name,
              status: 'created',
              reason: 'Certificado criado'
            });
          }
        } catch (error) {
          results.errors++;
          results.details.push({
            client: client.client_name,
            status: 'error',
            reason: error.message
          });
        }
      }

      return results;
    },
    onSuccess: (data) => {
      setSyncResult(data);
      queryClient.invalidateQueries(['certificates']);
      queryClient.invalidateQueries(['certificates-dashboard']);
      queryClient.invalidateQueries(['clients']);
    }
  });

  return (
    <Card className="border-0 shadow-lg border-l-4 border-l-[#6B2D8B]">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#6B2D8B]" />
          Sincronização de Certificados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Esta ferramenta sincroniza todos os clientes com certificado digital para o módulo de renovação.
          Garante que todos os certificados apareçam corretamente em Renovações e no Dashboard.
        </p>

        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
        >
          {syncMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Executar Sincronização
            </>
          )}
        </Button>

        {syncResult && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-800">{syncResult.total}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600">Sincronizados</p>
                <p className="text-2xl font-bold text-green-700">{syncResult.synced}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600">Já OK</p>
                <p className="text-2xl font-bold text-blue-700">{syncResult.skipped}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600">Erros</p>
                <p className="text-2xl font-bold text-red-700">{syncResult.errors}</p>
              </div>
            </div>

            {syncResult.details.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                <p className="text-sm font-medium text-slate-700">Detalhes:</p>
                {syncResult.details.map((detail, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
                  >
                    <span className="font-medium text-slate-700">{detail.client}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        detail.status === 'created' || detail.status === 'updated' ? 'default' :
                        detail.status === 'ok' ? 'secondary' :
                        detail.status === 'error' ? 'destructive' :
                        'outline'
                      }>
                        {detail.status === 'created' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {detail.status === 'updated' && <RefreshCw className="w-3 h-3 mr-1" />}
                        {detail.status === 'error' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {detail.reason}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}