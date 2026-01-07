import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, Database, Loader2,
  FileText, Table as TableIcon, X, Eye, Info, HardDrive, AlertTriangle, Users, Merge
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import DuplicateManager from '@/components/data/DuplicateManager';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import DataCleaningEditor from '@/components/data/DataCleaningEditor';
import { Download } from 'lucide-react';

// Formatos suportados com detalhes
const SUPPORTED_FORMATS = [
  { 
    ext: '.xlsx', 
    name: 'Excel (xlsx)', 
    icon: FileSpreadsheet, 
    color: 'text-green-600',
    maxSize: '10MB',
    description: 'Planilhas Excel modernas'
  },
  { 
    ext: '.xls', 
    name: 'Excel (xls)', 
    icon: FileSpreadsheet, 
    color: 'text-green-600',
    maxSize: '10MB',
    description: 'Planilhas Excel 97-2003'
  },
  { 
    ext: '.csv', 
    name: 'CSV', 
    icon: TableIcon, 
    color: 'text-blue-600',
    maxSize: '5MB',
    description: 'Valores separados por vírgula ou ponto-e-vírgula'
  },
  { 
    ext: '.pdf', 
    name: 'PDF', 
    icon: FileText, 
    color: 'text-red-600',
    maxSize: '15MB',
    description: 'Documentos PDF com tabelas'
  },
];

// Colunas esperadas do sistema (mapeamento flexível)
const EXPECTED_COLUMNS = {
  produto: ['produto', 'product', 'tipo', 'tipo_certificado', 'certificado'],
  cnpj: ['cnpj', 'cnpj_empresa', 'documento_empresa'],
  cpf: ['cpf', 'cpf_titular', 'documento', 'documento_titular'],
  nome: ['nome', 'name', 'nome_titular', 'nome_do_titular', 'cliente', 'client_name', 'razao_social'],
  telefone: ['telefone', 'phone', 'tel', 'celular', 'fone', 'whatsapp'],
  email: ['email', 'e-mail', 'e_mail', 'correio'],
  dt_emis: ['dt_emis', 'data_emissao', 'emissao', 'data_inicio', 'inicio'],
  dt_fim: ['dt_fim', 'data_fim', 'vencimento', 'data_vencimento', 'validade', 'expira'],
  unid_atendimento: ['unid_atendimento', 'unidade', 'local', 'loja'],
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

// Gerar CSV modelo para download
const generateTemplateCSV = () => {
  const headers = ['PRODUTO', 'CNPJ', 'CPF', 'NOME', 'TELEFONE', 'EMAIL', 'DT_EMIS', 'DT_FIM'];
  const exampleRows = [
    ['e-CPF A3 36 MESES', '', '12345678901', 'MARIA DA SILVA', '11999998888', 'maria@email.com', '01/01/2024', '01/01/2027'],
    ['e-CNPJ A3 36 MESES', '12345678000199', '98765432100', 'JOAO SANTOS', '11988887777', 'joao@empresa.com', '15/06/2024', '15/06/2027'],
  ];
  
  const csvContent = [
    headers.join(';'),
    ...exampleRows.map(row => row.join(';'))
  ].join('\n');
  
  return csvContent;
};

const downloadTemplate = () => {
  const csv = generateTemplateCSV();
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo_importacao_certificados.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function DataImport() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [importStatus, setImportStatus] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [duplicatesInSystem, setDuplicatesInSystem] = useState([]);
  const [importMode, setImportMode] = useState('clients'); // 'clients' ou 'certificates'
  const [showDuplicateManager, setShowDuplicateManager] = useState(false);

  // Buscar clientes e certificados existentes para checar duplicados
  const { data: existingClients = [] } = useQuery({
    queryKey: ['existing-clients-for-import'],
    queryFn: () => base44.entities.Client.list('-created_date', 5000),
  });

  // Buscar usuário atual para verificar permissões
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = user?.role === 'admin';

  const { data: existingCertificates = [] } = useQuery({
    queryKey: ['existing-certificates-for-import'],
    queryFn: () => base44.entities.Certificate.list('-created_date', 1000),
  });

  // Normalizar nome de coluna para comparação
  const normalizeColumnName = (name) => {
    return String(name || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  };

  // Mapear colunas do arquivo para colunas do sistema
  const mapColumns = (fileColumns) => {
    const mapping = {};
    
    fileColumns.forEach(fileCol => {
      const normalized = normalizeColumnName(fileCol);
      
      for (const [systemCol, aliases] of Object.entries(EXPECTED_COLUMNS)) {
        if (aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) {
          mapping[fileCol] = systemCol;
          break;
        }
      }
    });
    
    return mapping;
  };

  // Verificar duplicados no sistema
  const checkDuplicatesInSystem = (newData) => {
    const duplicates = [];
    
    newData.forEach((row, index) => {
      const cpf = String(row.cpf || row.CPF || '').replace(/\D/g, '');
      const cnpj = String(row.cnpj || row.CNPJ || '').replace(/\D/g, '');
      const email = String(row.email || row.EMAIL || '').toLowerCase().trim();
      const phone = String(row.telefone || row.phone || row.TELEFONE || '').replace(/\D/g, '');
      
      // Checar em clientes existentes
      const existingClient = existingClients.find(c => {
        const cCpf = String(c.cpf || '').replace(/\D/g, '');
        const cCnpj = String(c.cnpj || '').replace(/\D/g, '');
        const cEmail = String(c.email || '').toLowerCase().trim();
        const cPhone = String(c.phone || c.whatsapp || '').replace(/\D/g, '');
        
        if (cpf && cCpf && cpf === cCpf) return true;
        if (cnpj && cCnpj && cnpj === cCnpj) return true;
        if (email && cEmail && email === cEmail) return true;
        if (phone && cPhone && phone.slice(-8) === cPhone.slice(-8)) return true;
        
        return false;
      });
      
      if (existingClient) {
        duplicates.push({
          rowIndex: index,
          rowData: row,
          existingRecord: existingClient,
          matchType: cpf ? 'CPF' : cnpj ? 'CNPJ' : email ? 'E-mail' : 'Telefone'
        });
      }
    });
    
    return duplicates;
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validar tamanho
    if (selectedFile.size > MAX_FILE_SIZE) {
      setImportStatus({ 
        type: 'error', 
        message: `Arquivo muito grande. Tamanho máximo: 15MB. Seu arquivo: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB` 
      });
      return;
    }

    // Validar extensão
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (!SUPPORTED_FORMATS.some(f => f.ext === ext)) {
      setImportStatus({ 
        type: 'error', 
        message: `Formato não suportado: ${ext}. Use: ${SUPPORTED_FORMATS.map(f => f.ext).join(', ')}` 
      });
      return;
    }
    
    setFile(selectedFile);
    setIsUploading(true);
    setExtractedData(null);
    setImportStatus(null);
    setShowEditor(false);
    setDuplicatesInSystem([]);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      // Extract data com schema correto (root deve ser objeto)
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            registros: {
              type: "array",
              description: "Lista de registros extraídos do arquivo",
              items: {
                type: "object",
                properties: {
                  produto: { type: "string", description: "PRODUTO, tipo de certificado digital" },
                  cnpj: { type: "string", description: "CNPJ da empresa" },
                  cpf: { type: "string", description: "CPF do titular" },
                  nome: { type: "string", description: "NOME DO TITULAR, nome completo" },
                  telefone: { type: "string", description: "TELEFONE, celular" },
                  email: { type: "string", description: "EMAIL, e-mail" },
                  unid_atendimento: { type: "string", description: "UNID_ATENDIMENTO, local de atendimento" },
                  dt_emis: { type: "string", description: "DT_EMIS, data de emissão" },
                  dt_fim: { type: "string", description: "DT_FIM, data de vencimento" },
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        // Extrair array de registros do objeto retornado
        const rawData = result.output.registros || result.output;
        const dataArray = Array.isArray(rawData) ? rawData : [rawData];
        
        // Normalizar dados
        const normalizedData = dataArray.map(row => {
          const normalized = {};
          Object.entries(row).forEach(([key, value]) => {
            const normalKey = normalizeColumnName(key);
            // Mapear para campos padrão
            for (const [systemCol, aliases] of Object.entries(EXPECTED_COLUMNS)) {
              if (aliases.some(alias => normalKey.includes(alias) || alias.includes(normalKey))) {
                normalized[systemCol] = value;
                break;
              }
            }
            // Manter campo original também
            normalized[key] = value;
          });
          return normalized;
        });

        setExtractedData(normalizedData);
        
        // Detectar colunas presentes nos dados
        const cols = new Set();
        normalizedData.forEach(row => {
          Object.keys(row).forEach(key => {
            if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
              cols.add(key);
            }
          });
        });
        setDetectedColumns(Array.from(cols));
        
        // Verificar duplicados no sistema
        const dupes = checkDuplicatesInSystem(normalizedData);
        setDuplicatesInSystem(dupes);
        
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
    // Recalcular duplicados
    const dupes = checkDuplicatesInSystem(newData);
    setDuplicatesInSystem(dupes);
  };

  const handleImport = async () => {
    if (!extractedData || extractedData.length === 0) return;
    
    setImportStatus({ type: 'importing', message: 'Importando dados...' });
    setImportProgress(0);

    try {
      // Filtrar registros válidos (precisa ter pelo menos nome ou CPF ou CNPJ)
      const validRecords = extractedData.filter(record => 
        record.nome || record.cpf || record.cnpj || record.telefone || record.email
      );

      // Determinar se é importação de certificados (tem dt_emis e dt_fim)
      const hasCertificateData = validRecords.some(r => r.dt_emis || r.dt_fim || r.produto);

      // Buscar ou criar campanha de renovação se tiver dados de certificado
      let renovationCampaign;
      if (hasCertificateData) {
        const campaigns = await base44.entities.Campaign.filter({ name: 'Renovação de Certificados' });
        if (campaigns.length === 0) {
          renovationCampaign = await base44.entities.Campaign.create({
            name: 'Renovação de Certificados',
            description: 'Campanha automática para renovação de certificados digitais',
            status: 'ativa',
            start_date: new Date().toISOString().split('T')[0],
          });
        } else {
          renovationCampaign = campaigns[0];
        }
      }

      let imported = 0;
      const batchSize = 10;
      
      for (let i = 0; i < validRecords.length; i += batchSize) {
        const batch = validRecords.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (record) => {
          const cpf = String(record.cpf || '').replace(/\D/g, '');
          const cnpj = String(record.cnpj || '').replace(/\D/g, '');
          
          // Verificar se cliente já existe por CPF ou CNPJ
          let existingClient = null;
          if (cpf) {
            const clients = await base44.entities.Client.filter({ cpf });
            if (clients.length > 0) existingClient = clients[0];
          }
          if (!existingClient && cnpj) {
            const clients = await base44.entities.Client.filter({ cnpj });
            if (clients.length > 0) existingClient = clients[0];
          }

          // Criar ou atualizar cliente
          const clientData = {
            client_name: record.nome || record.name || 'Sem nome',
            company_name: record.empresa || '',
            email: record.email || '',
            phone: record.telefone || record.phone || '',
            cpf: cpf || '',
            cnpj: cnpj || '',
            business_area: record.produto || '',
            notes: [record.unid_atendimento, record.observacoes]
              .filter(Boolean).join(' | ') || '',
            lead_status: hasCertificateData ? 'qualificado' : 'novo',
            lead_source: hasCertificateData ? 'renovacao' : 'outro',
            funnel_stage: hasCertificateData ? 'contato' : 'lead',
            campaign_id: hasCertificateData ? renovationCampaign?.id : undefined,
          };

          let client;
          if (existingClient) {
            await base44.entities.Client.update(existingClient.id, clientData);
            client = { ...existingClient, ...clientData };
          } else {
            client = await base44.entities.Client.create(clientData);
          }

          // Se tem dados de certificado, criar também
          if (hasCertificateData && (record.dt_emis || record.dt_fim)) {
            // Determinar tipo de certificado
            let certType = 'e_cpf_a3';
            const produto = String(record.produto || '').toLowerCase();
            if (produto.includes('cnpj')) {
              certType = produto.includes('a1') ? 'e_cnpj_a1' : 'e_cnpj_a3';
            } else if (produto.includes('cpf')) {
              certType = produto.includes('a1') ? 'e_cpf_a1' : 'e_cpf_a3';
            }

            // Formatar datas
            const formatDate = (dateStr) => {
              if (!dateStr) return null;
              // Tentar formatos comuns: dd/mm/yyyy, yyyy-mm-dd
              const str = String(dateStr);
              if (str.includes('/')) {
                const parts = str.split('/');
                if (parts.length === 3) {
                  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
              return str;
            };

            await base44.entities.Certificate.create({
              client_id: client.id,
              client_name: record.nome || 'Sem nome',
              client_email: record.email || '',
              client_phone: record.telefone || '',
              certificate_type: certType,
              issue_date: formatDate(record.dt_emis),
              expiry_date: formatDate(record.dt_fim),
              status: 'ativo',
              renewal_status: 'pendente',
              notes: record.unid_atendimento || '',
            });
          }
        }));
        
        imported += batch.length;
        setImportProgress((imported / validRecords.length) * 100);
      }

      queryClient.invalidateQueries(['clients']);
      queryClient.invalidateQueries(['certificates']);
      queryClient.invalidateQueries(['existing-clients-for-import']);
      queryClient.invalidateQueries(['existing-certificates-for-import']);
      
      setImportStatus({ 
        type: 'success', 
        message: `${imported} registro(s) importado(s) com sucesso!${hasCertificateData ? ' Clientes de renovação inseridos no funil automaticamente.' : ''}` 
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
    setDuplicatesInSystem([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Banco de Dados</h1>
          <p className="text-slate-500">Visualize, edite e gerencie todos os cadastros do sistema</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && existingClients.length > 0 && (
            <Button
              onClick={() => setShowDuplicateManager(true)}
              variant="outline"
              className="border-amber-600 text-amber-600 hover:bg-amber-50"
            >
              <Merge className="w-4 h-4 mr-2" />
              Unificar Cadastros
            </Button>
          )}
          {showEditor && (
            <Button variant="outline" onClick={resetUpload}>
              <X className="w-4 h-4 mr-2" />
              Nova Importação
            </Button>
          )}
        </div>
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

      {/* Duplicates Warning */}
      {duplicatesInSystem.length > 0 && showEditor && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertTitle>Possíveis Duplicados Detectados</AlertTitle>
          <AlertDescription>
            {duplicatesInSystem.length} registro(s) já podem existir no sistema. 
            Verifique antes de importar.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
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
                      Tamanho máximo: 15MB
                    </p>
                    
                    {/* Formatos Suportados */}
                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                      {SUPPORTED_FORMATS.map(format => (
                        <div key={format.ext} className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                          <format.icon className={`w-5 h-5 ${format.color}`} />
                          <div className="text-left">
                            <span className="text-sm font-medium text-slate-700">{format.ext}</span>
                            <p className="text-xs text-slate-400">{format.maxSize}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botão Download Modelo */}
                    <Button 
                      variant="outline" 
                      onClick={downloadTemplate}
                      className="border-[#6B2D8B] text-[#6B2D8B] hover:bg-[#6B2D8B]/5"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Modelo CSV
                    </Button>
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#6B2D8B]" />
                Revisar e Limpar Dados
                <Badge variant="secondary">{extractedData.length} registros</Badge>
                {duplicatesInSystem.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700">
                    {duplicatesInSystem.length} possíveis duplicados
                  </Badge>
                )}
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
              existingClients={existingClients}
              duplicatesInSystem={duplicatesInSystem}
            />
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!showEditor && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Especificações e Requisitos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Colunas Esperadas */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-[#6B2D8B]" />
                Colunas Aceitas na Primeira Linha
              </h4>
              <p className="text-sm text-slate-500 mb-3">
                O arquivo deve conter na primeira linha os cabeçalhos das colunas (em qualquer ordem):
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: 'PRODUTO', desc: 'Tipo de certificado', required: false },
                  { name: 'CNPJ', desc: 'Documento da empresa', required: false },
                  { name: 'CPF', desc: 'Documento do titular', required: false },
                  { name: 'NOME', desc: 'Nome do titular', required: true },
                  { name: 'TELEFONE', desc: 'Contato', required: false },
                  { name: 'EMAIL', desc: 'E-mail', required: false },
                  { name: 'DT_EMIS', desc: 'Data de emissão', required: false },
                  { name: 'DT_FIM', desc: 'Data de vencimento', required: false },
                ].map(col => (
                  <div key={col.name} className={`p-3 rounded-lg border ${col.required ? 'border-[#6B2D8B] bg-[#6B2D8B]/5' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant={col.required ? 'default' : 'outline'} className={col.required ? 'bg-[#6B2D8B]' : ''}>
                        {col.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{col.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Accordion com detalhes */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="formats">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Formatos de Arquivo Suportados
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {SUPPORTED_FORMATS.map(format => (
                      <div key={format.ext} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <format.icon className={`w-6 h-6 ${format.color} mt-0.5`} />
                        <div>
                          <p className="font-medium text-slate-800">{format.name} ({format.ext})</p>
                          <p className="text-sm text-slate-500">{format.description}</p>
                          <p className="text-xs text-slate-400 mt-1">Tamanho máximo: {format.maxSize}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="requirements">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Requisitos e Limitações
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pt-2 text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Tamanho máximo do arquivo: <strong>15MB</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>A primeira linha deve conter os cabeçalhos das colunas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Colunas podem estar em qualquer ordem</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Para renovações, inclua as colunas DT_EMIS e DT_FIM</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>CSV aceita separadores: vírgula (,) ou ponto-e-vírgula (;)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>PDF deve ter tabela visível e bem formatada</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <span>O sistema detecta duplicados por CPF, CNPJ, e-mail ou telefone</span>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="duplicates">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Tratamento de Duplicados
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2 text-sm text-slate-600">
                    <p>O sistema verifica duplicados de duas formas:</p>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium text-slate-800 mb-2">1. Duplicados na Planilha</p>
                      <p>Use o botão "Limpar Dados" → "Remover Duplicatas" para eliminar linhas repetidas no arquivo importado.</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="font-medium text-amber-800 mb-2">2. Duplicados no Sistema</p>
                      <p className="text-amber-700">O sistema compara CPF, CNPJ, e-mail e telefone com registros já cadastrados e alerta sobre possíveis duplicados.</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* How it works */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#6B2D8B]/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-[#6B2D8B]" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-2">1. Upload</h4>
                <p className="text-sm text-slate-500">
                  Envie sua planilha Excel, CSV ou PDF
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#C71585]/10 flex items-center justify-center">
                  <TableIcon className="w-6 h-6 text-[#C71585]" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-2">2. Limpeza</h4>
                <p className="text-sm text-slate-500">
                  Revise duplicados, edite e limpe dados
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-2">3. Importar</h4>
                <p className="text-sm text-slate-500">
                  Confirme a importação para o CRM
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Duplicate Manager */}
      <DuplicateManager
        clients={existingClients}
        open={showDuplicateManager}
        onOpenChange={setShowDuplicateManager}
      />
    </div>
  );
}