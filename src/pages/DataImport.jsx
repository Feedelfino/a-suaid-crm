import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, Database, Loader2,
  FileText, Table as TableIcon, X, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import DataCleaningEditor from '@/components/data/DataCleaningEditor';

const SUPPORTED_FORMATS = [
  { ext: '.xlsx', name: 'Excel', icon: FileSpreadsheet, color: 'text-green-600' },
  { ext: '.xls', name: 'Excel (antigo)', icon: FileSpreadsheet, color: 'text-green-600' },
  { ext: '.csv', name: 'CSV', icon: TableIcon, color: 'text-blue-600' },
  { ext: '.pdf', name: 'PDF', icon: FileText, color: 'text-red-600' },
];

export default function DataImport() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [importStatus, setImportStatus] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [showEditor, setShowEditor] = useState(false);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsUploading(true);
    setExtractedData(null);
    setImportStatus(null);
    setShowEditor(false);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      // Extract data com schema genérico
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Nome do cliente, nome completo, razão social" },
              company_name: { type: "string", description: "Nome da empresa, nome fantasia" },
              email: { type: "string", description: "E-mail, email, correio eletrônico" },
              phone: { type: "string", description: "Telefone, celular, fone, tel, whatsapp" },
              cpf: { type: "string", description: "CPF, documento pessoa física" },
              cnpj: { type: "string", description: "CNPJ, documento empresa" },
              business_area: { type: "string", description: "Área de atuação, segmento, ramo" },
              address: { type: "string", description: "Endereço, logradouro" },
              city: { type: "string", description: "Cidade" },
              state: { type: "string", description: "Estado, UF" },
              notes: { type: "string", description: "Observações, notas, comentários" },
            }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        const dataArray = Array.isArray(result.output) ? result.output : [result.output];
        setExtractedData(dataArray);
        
        // Detectar colunas presentes nos dados
        const cols = new Set();
        dataArray.forEach(row => {
          Object.keys(row).forEach(key => {
            if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
              cols.add(key);
            }
          });
        });
        setDetectedColumns(Array.from(cols));
        setShowEditor(true);
      } else {
        setImportStatus({ type: 'error', message: result.details || 'Erro ao extrair dados do arquivo' });
      }
    } catch (error) {
      console.error('Erro:', error);
      setImportStatus({ type: 'error', message: error.message || 'Erro ao processar arquivo' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDataChange = (newData) => {
    setExtractedData(newData);
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
      const batchSize = 10;
      
      for (let i = 0; i < validRecords.length; i += batchSize) {
        const batch = validRecords.slice(i, i + batchSize);
        
        await Promise.all(batch.map(record => 
          base44.entities.Client.create({
            client_name: record.client_name || 'Sem nome',
            company_name: record.company_name || '',
            email: record.email || '',
            phone: record.phone || '',
            cpf: record.cpf || '',
            cnpj: record.cnpj || '',
            business_area: record.business_area || '',
            notes: [record.address, record.city, record.state, record.notes]
              .filter(Boolean).join(' | ') || '',
            lead_status: 'novo',
            lead_source: 'outro',
          })
        ));
        
        imported += batch.length;
        setImportProgress((imported / validRecords.length) * 100);
      }

      queryClient.invalidateQueries(['clients']);
      setImportStatus({ 
        type: 'success', 
        message: `${imported} registro(s) importado(s) com sucesso!` 
      });
      setExtractedData(null);
      setShowEditor(false);
      setFile(null);
    } catch (error) {
      setImportStatus({ type: 'error', message: error.message || 'Erro ao importar dados' });
    }
  };

  const resetUpload = () => {
    setFile(null);
    setExtractedData(null);
    setImportStatus(null);
    setShowEditor(false);
    setDetectedColumns([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Banco de Dados</h1>
          <p className="text-slate-500">Importe e limpe dados de planilhas</p>
        </div>
        {showEditor && (
          <Button variant="outline" onClick={resetUpload}>
            <X className="w-4 h-4 mr-2" />
            Nova Importação
          </Button>
        )}
      </div>

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

      {/* Upload Area - Mostrar apenas se não tiver dados */}
      {!showEditor && (
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
                    <p className="text-sm text-slate-400 mt-2">Isso pode levar alguns segundos</p>
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center shadow-lg">
                      <Upload className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-lg font-medium text-slate-800 mb-2">
                      Arraste ou clique para enviar
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                      Suporta Excel, CSV, PDF e outros formatos tabulares
                    </p>
                    
                    {/* Formatos Suportados */}
                    <div className="flex justify-center gap-4">
                      {SUPPORTED_FORMATS.map(format => (
                        <div key={format.ext} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                          <format.icon className={`w-5 h-5 ${format.color}`} />
                          <span className="text-sm text-slate-600">{format.ext}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </label>
            </div>

            {file && !isUploading && !showEditor && (
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
      )}

      {/* Data Cleaning Editor */}
      {showEditor && extractedData && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#6B2D8B]" />
                Revisar e Limpar Dados
                <Badge variant="secondary">{extractedData.length} registros</Badge>
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <FileSpreadsheet className="w-4 h-4" />
                {file?.name}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataCleaningEditor
              data={extractedData}
              columns={detectedColumns}
              onDataChange={handleDataChange}
              onImport={handleImport}
            />
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!showEditor && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Como Funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#6B2D8B]/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-[#6B2D8B]" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-2">1. Upload</h4>
                <p className="text-sm text-slate-500">
                  Envie sua planilha Excel, CSV ou PDF com os dados
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#C71585]/10 flex items-center justify-center">
                  <TableIcon className="w-6 h-6 text-[#C71585]" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-2">2. Limpeza</h4>
                <p className="text-sm text-slate-500">
                  Revise, edite e limpe os dados antes de importar
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-2">3. Importar</h4>
                <p className="text-sm text-slate-500">
                  Confirme a importação para o banco de dados
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <h4 className="font-semibold text-slate-800 mb-3">Campos Reconhecidos Automaticamente</h4>
              <div className="flex flex-wrap gap-2">
                {['Nome', 'Empresa', 'E-mail', 'Telefone', 'CPF', 'CNPJ', 'Endereço', 'Cidade', 'Estado', 'Observações'].map(field => (
                  <Badge key={field} variant="outline">{field}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}