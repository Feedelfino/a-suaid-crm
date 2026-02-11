import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileSpreadsheet, CheckCircle, AlertCircle, Loader2, 
  ExternalLink, RefreshCw, Copy, Code, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GoogleSheetsSync() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(null);
  const [spreadsheetInfo, setSpreadsheetInfo] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');

  // Buscar configuração existente
  const { data: config } = useQuery({
    queryKey: ['sheets-config'],
    queryFn: async () => {
      const configs = await base44.entities.Client.filter({ client_code: 'GOOGLE_SHEETS_CONFIG' });
      return configs.length > 0 ? configs[0] : null;
    },
  });

  useEffect(() => {
    if (config) {
      setSpreadsheetInfo({
        spreadsheetId: config.notes,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${config.notes}`,
      });
    }
    // Construir URL do webhook
    const currentUrl = window.location.origin;
    setWebhookUrl(`${currentUrl}/api/functions/sheetsWebhook`);
  }, [config]);

  const createSheetMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createGoogleSheet');
      return response.data;
    },
    onSuccess: async (data) => {
      setSpreadsheetInfo(data);
      
      // Salvar configuração no banco
      await base44.entities.Client.create({
        client_code: 'GOOGLE_SHEETS_CONFIG',
        client_name: 'Configuração Google Sheets',
        notes: data.spreadsheetId,
        lead_status: 'fechado',
      });

      queryClient.invalidateQueries(['sheets-config']);
      setStatus({ type: 'success', message: 'Planilha criada com sucesso!' });
    },
    onError: (error) => {
      setStatus({ type: 'error', message: error.message });
    },
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setStatus({ type: 'success', message: 'Copiado para a área de transferência!' });
    setTimeout(() => setStatus(null), 3000);
  };

  const appsScriptCode = `// Cole este código no Google Apps Script da sua planilha
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== 'Clientes') return;
  
  var range = e.range;
  var row = range.getRow();
  if (row === 1) return; // Ignorar cabeçalho
  
  var rowData = sheet.getRange(row, 1, 1, 14).getValues()[0];
  
  sendToWebhook({
    spreadsheetId: e.source.getId(),
    changes: [{
      action: 'edit',
      rowData: rowData
    }]
  });
}

function onChange(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Clientes');
  if (!sheet) return;
  
  if (e.changeType === 'INSERT_ROW') {
    var lastRow = sheet.getLastRow();
    var rowData = sheet.getRange(lastRow, 1, 1, 14).getValues()[0];
    
    sendToWebhook({
      spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
      changes: [{
        action: 'add',
        rowData: rowData
      }]
    });
  }
}

function sendToWebhook(payload) {
  var webhookUrl = '${webhookUrl}';
  
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  try {
    UrlFetchApp.fetch(webhookUrl, options);
  } catch (error) {
    console.error('Erro ao enviar webhook:', error);
  }
}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sincronização Google Sheets</h1>
        <p className="text-slate-500">Conecte seu CRM a uma planilha do Google em tempo real</p>
      </div>

      {/* Status */}
      {status && (
        <Alert className={status.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          {status.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <AlertTitle>{status.type === 'success' ? 'Sucesso!' : 'Erro'}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {/* Criar Planilha */}
      {!spreadsheetInfo && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Criar Planilha de Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              Crie uma nova planilha do Google Sheets conectada ao seu CRM. 
              A planilha será preenchida com todos os clientes existentes.
            </p>
            <Button
              onClick={() => createSheetMutation.mutate()}
              disabled={createSheetMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createSheetMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando Planilha...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Criar Planilha no Google Sheets
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Planilha Criada - Instruções */}
      {spreadsheetInfo && (
        <>
          <Card className="border-0 shadow-lg border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Planilha Configurada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-slate-800">CRM Clientes - Sincronização</p>
                    <p className="text-sm text-slate-500">Sincronização ativa</p>
                  </div>
                </div>
                <a 
                  href={spreadsheetInfo.spreadsheetUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                >
                  Abrir Planilha
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <Alert className="border-blue-500 bg-blue-50">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <AlertTitle>Sincronização CRM → Sheets (Ativa)</AlertTitle>
                <AlertDescription>
                  Quando você adicionar ou editar clientes no CRM, as mudanças aparecerão automaticamente na planilha.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Configurar Sincronização Sheets → CRM */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Code className="w-5 h-5 text-[#6B2D8B]" />
                Configurar Sincronização Sheets → CRM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-amber-500 bg-amber-50">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertTitle>Ação Necessária</AlertTitle>
                <AlertDescription>
                  Para que mudanças na planilha apareçam no CRM, você precisa configurar um script no Google Sheets.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">Passo 1: Abrir Editor de Scripts</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 ml-4">
                    <li>Abra sua planilha no Google Sheets</li>
                    <li>Clique em <strong>Extensões</strong> → <strong>Apps Script</strong></li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">Passo 2: Cole o Código</h4>
                  <div className="relative">
                    <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto max-h-96">
                      {appsScriptCode}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(appsScriptCode)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Código
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">Passo 3: Configurar Gatilhos</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 ml-4">
                    <li>No editor de scripts, clique no ícone de <strong>relógio</strong> (Gatilhos)</li>
                    <li>Clique em <strong>+ Adicionar gatilho</strong></li>
                    <li>Configure:
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>Função: <code className="bg-slate-100 px-1 rounded">onEdit</code></li>
                        <li>Tipo de evento: <strong>Ao editar</strong></li>
                      </ul>
                    </li>
                    <li>Salve o gatilho</li>
                    <li>Repita para criar outro gatilho:
                      <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>Função: <code className="bg-slate-100 px-1 rounded">onChange</code></li>
                        <li>Tipo de evento: <strong>Ao alterar</strong></li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertTitle>Pronto!</AlertTitle>
                  <AlertDescription>
                    Agora a sincronização está completa. Mudanças na planilha aparecerão no CRM e vice-versa.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Como Funciona */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Como Funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">CRM → Sheets</h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    Quando você cria, edita ou deleta um cliente no CRM, a mudança é automaticamente refletida na planilha.
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-900">Sheets → CRM</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    Quando você adiciona ou edita uma linha na planilha, o cliente é criado ou atualizado no CRM em tempo real.
                  </p>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Importante</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                    <li>Não delete a coluna <strong>ID</strong> (primeira coluna) - ela é usada para identificar os clientes</li>
                    <li>Ao adicionar novos clientes na planilha, deixe a coluna ID vazia - será preenchida automaticamente</li>
                    <li>O cabeçalho (primeira linha) deve permanecer intacto</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}