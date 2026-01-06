import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const IMPORT_LIMITS = [
  { value: 10, label: '10 registros' },
  { value: 50, label: '50 registros' },
  { value: 100, label: '100 registros' },
  { value: 500, label: '500 registros' },
  { value: 1000, label: '1.000 registros' },
  { value: 5000, label: '5.000 registros' },
  { value: 10000, label: '10.000 registros' },
  { value: 20000, label: '20.000 registros (máx. recomendado/dia)' },
];

export default function ImportFromSheetsDialog({ onImportComplete }) {
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [maxRows, setMaxRows] = useState('100');
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!spreadsheetId || !sheetName) {
      alert('Por favor, preencha o ID da planilha e o nome da aba');
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const response = await base44.functions.invoke('importFromGoogleSheets', {
        spreadsheetId,
        sheetName,
        maxRows: parseInt(maxRows),
      });

      if (response.data.error) {
        setResult({ success: false, message: response.data.error });
      } else {
        setResult(response.data);
        if (onImportComplete) onImportComplete();
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: error.message || 'Erro ao importar dados' 
      });
    } finally {
      setIsImporting(false);
    }
  };

  const extractSpreadsheetId = (url) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Importar da Planilha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importar do Google Sheets
          </DialogTitle>
          <DialogDescription>
            Importe clientes diretamente de uma planilha do Google Sheets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Limites de API */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-blue-900">Limites do Google Sheets API:</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• <strong>Por importação:</strong> Até 40.000 linhas</li>
                    <li>• <strong>Recomendado por dia:</strong> 20.000 linhas (evita estouro de quota)</li>
                    <li>• <strong>Leituras diárias:</strong> 500 operações de leitura</li>
                    <li>• <strong>Por planilha:</strong> Máximo 10 milhões de células</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instruções */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 text-sm text-amber-900">
                  <p className="font-semibold">Antes de importar:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Compartilhe a planilha com: <code className="bg-white px-1 rounded text-xs">suaidbase@caramel-anvil-483414-n9.iam.gserviceaccount.com</code></li>
                    <li>A primeira linha deve conter os cabeçalhos (CPF, CNPJ, Nome, Email, etc.)</li>
                    <li>CPF ou CNPJ são usados como identificador único</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spreadsheet-id">ID da Planilha ou URL</Label>
              <Input
                id="spreadsheet-id"
                placeholder="Cole a URL ou ID da planilha"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(extractSpreadsheetId(e.target.value))}
              />
              <p className="text-xs text-slate-500">
                Exemplo: https://docs.google.com/spreadsheets/d/<strong>SEU_ID_AQUI</strong>/edit
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-name">Nome da Aba</Label>
              <Input
                id="sheet-name"
                placeholder="Ex: Página1, Clientes, Dados..."
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-rows">Quantidade de Registros</Label>
              <Select value={maxRows} onValueChange={setMaxRows}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_LIMITS.map(limit => (
                    <SelectItem key={limit.value} value={limit.value.toString()}>
                      {limit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Selecione quantos registros importar da planilha
              </p>
            </div>
          </div>

          {/* Resultado */}
          {result && (
            <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                      {result.message}
                    </p>
                    {result.results && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {result.results.created > 0 && (
                          <Badge className="bg-green-600">
                            {result.results.created} criados
                          </Badge>
                        )}
                        {result.results.updated > 0 && (
                          <Badge className="bg-blue-600">
                            {result.results.updated} atualizados
                          </Badge>
                        )}
                        {result.results.skipped > 0 && (
                          <Badge variant="outline">
                            {result.results.skipped} ignorados
                          </Badge>
                        )}
                        {result.mergeResults?.merged > 0 && (
                          <Badge className="bg-amber-600">
                            🔄 {result.mergeResults.merged} duplicatas unificadas
                          </Badge>
                        )}
                      </div>
                    )}
                    {result.mergeResults?.details?.length > 0 && (
                      <div className="mt-3 text-xs text-slate-600 bg-slate-50 rounded p-2">
                        <p className="font-semibold mb-1">Unificações realizadas:</p>
                        {result.mergeResults.details.slice(0, 3).map((detail, i) => (
                          <p key={i}>• {detail.kept} ← {detail.deleted} ({detail.reason})</p>
                        ))}
                      </div>
                    )}
                    {result.results?.errors?.length > 0 && (
                      <div className="mt-2 text-xs text-red-700 max-h-32 overflow-y-auto">
                        <p className="font-semibold mb-1">Erros:</p>
                        {result.results.errors.slice(0, 5).map((err, i) => (
                          <p key={i}>• {err}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !spreadsheetId || !sheetName}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Dados
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}