import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Database, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export default function DataImport() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const [importProgress, setImportProgress] = useState(0);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsUploading(true);
    setExtractedData(null);
    setImportStatus(null);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      // Extract data
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Nome do cliente ou nome completo" },
              company_name: { type: "string", description: "Nome da empresa ou razão social" },
              email: { type: "string", description: "E-mail" },
              phone: { type: "string", description: "Telefone ou celular" },
              cpf: { type: "string", description: "CPF" },
              cnpj: { type: "string", description: "CNPJ" },
              business_area: { type: "string", description: "Área de atuação ou segmento" },
            }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        setExtractedData(Array.isArray(result.output) ? result.output : [result.output]);
      } else {
        setImportStatus({ type: 'error', message: result.details || 'Erro ao extrair dados' });
      }
    } catch (error) {
      setImportStatus({ type: 'error', message: error.message || 'Erro ao processar arquivo' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    if (!extractedData || extractedData.length === 0) return;
    
    setImportStatus({ type: 'importing', message: 'Importando dados...' });
    setImportProgress(0);

    try {
      const validRecords = extractedData.filter(record => 
        record.client_name || record.phone || record.email || record.cpf || record.cnpj
      );

      let imported = 0;
      for (const record of validRecords) {
        await base44.entities.Client.create({
          client_name: record.client_name || 'Sem nome',
          company_name: record.company_name || '',
          email: record.email || '',
          phone: record.phone || '',
          cpf: record.cpf || '',
          cnpj: record.cnpj || '',
          business_area: record.business_area || '',
          lead_status: 'novo',
          lead_source: 'outro',
        });
        imported++;
        setImportProgress((imported / validRecords.length) * 100);
      }

      queryClient.invalidateQueries(['clients']);
      setImportStatus({ 
        type: 'success', 
        message: `${imported} registro(s) importado(s) com sucesso!` 
      });
      setExtractedData(null);
    } catch (error) {
      setImportStatus({ type: 'error', message: error.message || 'Erro ao importar dados' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Banco de Dados</h1>
        <p className="text-slate-500">Importe dados de planilhas Excel, CSV ou PDF</p>
      </div>

      {/* Upload Area */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-[#6B2D8B]" />
            Importar Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-[#6B2D8B]/50 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-16 h-16 text-[#6B2D8B] animate-spin mb-4" />
                  <p className="text-slate-600 font-medium">Processando arquivo...</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center shadow-lg">
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-lg font-medium text-slate-800 mb-2">
                    Arraste ou clique para enviar
                  </p>
                  <p className="text-sm text-slate-500">
                    Formatos suportados: Excel (.xlsx, .xls), CSV, PDF
                  </p>
                </>
              )}
            </label>
          </div>

          {file && !isUploading && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-sm text-slate-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Messages */}
      {importStatus && (
        <Alert className={`${
          importStatus.type === 'success' ? 'border-green-500 bg-green-50' :
          importStatus.type === 'error' ? 'border-red-500 bg-red-50' :
          'border-blue-500 bg-blue-50'
        }`}>
          {importStatus.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : importStatus.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600" />
          ) : (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          )}
          <AlertTitle>
            {importStatus.type === 'success' ? 'Sucesso!' :
             importStatus.type === 'error' ? 'Erro' : 'Importando...'}
          </AlertTitle>
          <AlertDescription>{importStatus.message}</AlertDescription>
        </Alert>
      )}

      {importStatus?.type === 'importing' && (
        <Progress value={importProgress} className="h-2" />
      )}

      {/* Preview Data */}
      {extractedData && extractedData.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Pré-visualização ({extractedData.length} registros)
            </CardTitle>
            <Button 
              onClick={handleImport}
              className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Importação
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedData.slice(0, 20).map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{record.client_name || '-'}</TableCell>
                      <TableCell>{record.company_name || '-'}</TableCell>
                      <TableCell>{record.phone || '-'}</TableCell>
                      <TableCell>{record.email || '-'}</TableCell>
                      <TableCell>{record.cpf || record.cnpj || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {extractedData.length > 20 && (
                <p className="text-center py-4 text-sm text-slate-500">
                  Mostrando 20 de {extractedData.length} registros
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Instruções de Importação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Campos Reconhecidos</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Nome do Cliente / Nome Completo
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Nome da Empresa / Razão Social
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  E-mail
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Telefone / Celular
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  CPF / CNPJ
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Requisitos</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                  Cada registro deve ter pelo menos um identificador (nome, telefone, e-mail ou documento)
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                  Arquivos Excel devem ter os dados na primeira aba
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                  A primeira linha deve conter os cabeçalhos das colunas
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}