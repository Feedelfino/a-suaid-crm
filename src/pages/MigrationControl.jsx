import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Database, PlayCircle, CheckCircle, AlertCircle, 
  Loader2, ArrowRight, Users, RefreshCw 
} from 'lucide-react';

export default function MigrationControl() {
  const [status, setStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);

  const runMigration = async () => {
    setIsRunning(true);
    setStatus('running');
    setResult(null);

    try {
      const response = await base44.functions.invoke('migrateRenewalsToClients', {});
      
      if (response.data.success) {
        setStatus('success');
        setResult(response.data);
      } else {
        setStatus('error');
        setResult(response.data);
      }
    } catch (error) {
      setStatus('error');
      setResult({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Migração em Massa</h1>
        <p className="text-slate-500">Migrar dados de renovação para cadastro central de clientes</p>
      </div>

      <Alert className="border-amber-500 bg-amber-50">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <AlertTitle>Atenção - Apenas Administradores</AlertTitle>
        <AlertDescription>
          Esta operação deve ser executada apenas UMA VEZ para migrar dados históricos.
          Após a execução, todos os novos clientes de renovação serão automaticamente sincronizados.
        </AlertDescription>
      </Alert>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-[#6B2D8B]" />
            Processo de Migração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Etapas */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-[#6B2D8B] text-white flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div>
                <p className="font-semibold text-slate-800">Leitura de Certificados</p>
                <p className="text-sm text-slate-600">Busca todos os registros da tabela de renovação</p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-[#6B2D8B] text-white flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div>
                <p className="font-semibold text-slate-800">Validação de Duplicidade</p>
                <p className="text-sm text-slate-600">Verifica CPF/CNPJ no cadastro central</p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-[#6B2D8B] text-white flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <div>
                <p className="font-semibold text-slate-800">Criação/Atualização</p>
                <p className="text-sm text-slate-600">Cria novos clientes ou atualiza existentes</p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-[#6B2D8B] text-white flex items-center justify-center font-bold shrink-0">
                4
              </div>
              <div>
                <p className="font-semibold text-slate-800">Vinculação</p>
                <p className="text-sm text-slate-600">Liga certificados aos clientes do cadastro central</p>
              </div>
            </div>
          </div>

          {/* Botão de Execução */}
          <Button
            onClick={runMigration}
            disabled={isRunning}
            className="w-full bg-gradient-to-r from-[#6B2D8B] to-[#C71585] text-lg py-6"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Executando Migração...
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5 mr-2" />
                Executar Migração em Massa
              </>
            )}
          </Button>

          {/* Resultados */}
          {result && (
            <div className={`p-4 rounded-lg border-2 ${
              status === 'success' 
                ? 'bg-green-50 border-green-500' 
                : 'bg-red-50 border-red-500'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {status === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
                <h3 className={`font-bold ${
                  status === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {status === 'success' ? 'Migração Concluída!' : 'Erro na Migração'}
                </h3>
              </div>

              {status === 'success' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-slate-600">Total Processados</p>
                    <p className="text-2xl font-bold text-slate-800">{result.total_certificates}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-slate-600">Clientes Criados</p>
                    <p className="text-2xl font-bold text-green-600">{result.clients_created}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-slate-600">Clientes Atualizados</p>
                    <p className="text-2xl font-bold text-blue-600">{result.clients_updated}</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-slate-600">Certificados Vinculados</p>
                    <p className="text-2xl font-bold text-purple-600">{result.certificates_linked}</p>
                  </div>
                </div>
              )}

              {result.errors > 0 && (
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-semibold text-amber-800">
                    ⚠️ {result.errors} erro(s) encontrado(s)
                  </p>
                  {result.error_details && result.error_details.length > 0 && (
                    <div className="mt-2 text-xs text-amber-700 max-h-40 overflow-y-auto">
                      {result.error_details.map((err, idx) => (
                        <div key={idx} className="mb-1">
                          • {err.cert_name || err.cert_id}: {err.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {status === 'error' && result.error && (
                <p className="text-sm text-red-700 mt-2">{result.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-blue-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-800 mb-3">O que acontece após a migração?</h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Todos os clientes de renovação estarão no <strong>Cadastro Central</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Certificados vinculados aos clientes corretos</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Clientes automaticamente inseridos na campanha <strong>"Renovação de Certificados"</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Novos certificados importados serão <strong>automaticamente sincronizados</strong></span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}