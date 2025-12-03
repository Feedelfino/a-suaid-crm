import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Trash2, Edit, Save, X, Filter, Wand2, CheckCircle, 
  AlertTriangle, Search, RefreshCw, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function DataCleaningEditor({ data, columns, onDataChange, onImport }) {
  const [editingRow, setEditingRow] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [isCleaningAI, setIsCleaningAI] = useState(false);

  // Colunas detectadas automaticamente
  const detectedColumns = columns.length > 0 ? columns : Object.keys(data[0] || {});

  // Filtrar dados
  const filteredData = data.filter((row, index) => {
    // Filtro de busca
    if (searchTerm) {
      const matchesSearch = Object.values(row).some(val => 
        String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (!matchesSearch) return false;
    }
    
    // Filtro por coluna
    if (filterColumn && filterValue) {
      const cellValue = String(row[filterColumn] || '').toLowerCase();
      if (!cellValue.includes(filterValue.toLowerCase())) return false;
    }
    
    return true;
  });

  // Detectar problemas nos dados
  const detectIssues = (row) => {
    const issues = [];
    
    // Campos vazios importantes
    if (!row.client_name && !row.nome && !row.name) {
      issues.push('Sem nome');
    }
    
    // E-mail inválido
    const email = row.email || row.Email || row['e-mail'];
    if (email && !email.includes('@')) {
      issues.push('E-mail inválido');
    }
    
    // Telefone curto
    const phone = row.phone || row.telefone || row.celular || row.Telefone;
    if (phone && String(phone).replace(/\D/g, '').length < 8) {
      issues.push('Telefone inválido');
    }
    
    // CPF/CNPJ inválido
    const cpf = row.cpf || row.CPF;
    const cnpj = row.cnpj || row.CNPJ;
    if (cpf && String(cpf).replace(/\D/g, '').length !== 11) {
      issues.push('CPF inválido');
    }
    if (cnpj && String(cnpj).replace(/\D/g, '').length !== 14) {
      issues.push('CNPJ inválido');
    }
    
    return issues;
  };

  // Iniciar edição de linha
  const startEdit = (index, row) => {
    setEditingRow(index);
    setEditingData({ ...row });
  };

  // Salvar edição
  const saveEdit = (index) => {
    const newData = [...data];
    newData[index] = editingData;
    onDataChange(newData);
    setEditingRow(null);
    setEditingData({});
  };

  // Cancelar edição
  const cancelEdit = () => {
    setEditingRow(null);
    setEditingData({});
  };

  // Excluir linha
  const deleteRow = (index) => {
    const newData = data.filter((_, i) => i !== index);
    onDataChange(newData);
  };

  // Excluir linhas selecionadas
  const deleteSelected = () => {
    const newData = data.filter((_, index) => !selectedRows.includes(index));
    onDataChange(newData);
    setSelectedRows([]);
  };

  // Toggle seleção de linha
  const toggleRowSelection = (index) => {
    setSelectedRows(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Selecionar/deselecionar todos
  const toggleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map((_, i) => i));
    }
  };

  // Remover duplicatas
  const removeDuplicates = () => {
    const seen = new Set();
    const uniqueData = data.filter(row => {
      // Criar chave única baseada em email ou telefone ou nome
      const key = `${row.email || row.Email || ''}-${row.phone || row.telefone || ''}-${row.client_name || row.nome || ''}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    onDataChange(uniqueData);
  };

  // Remover linhas com campos vazios
  const removeEmptyRows = () => {
    const cleanData = data.filter(row => {
      const hasName = row.client_name || row.nome || row.name;
      const hasContact = row.email || row.Email || row.phone || row.telefone || row.celular;
      return hasName || hasContact;
    });
    onDataChange(cleanData);
  };

  // Limpeza com IA
  const cleanWithAI = async () => {
    setIsCleaningAI(true);
    try {
      const sampleData = data.slice(0, 10);
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise estes dados e retorne uma versão limpa e padronizada. 
Corrija:
- Nomes (primeira letra maiúscula)
- E-mails (lowercase)
- Telefones (formato: (XX) XXXXX-XXXX)
- CPF (formato: XXX.XXX.XXX-XX)
- CNPJ (formato: XX.XXX.XXX/XXXX-XX)
- Remova espaços extras

Dados:
${JSON.stringify(sampleData, null, 2)}

Retorne os dados limpos no mesmo formato JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            cleaned_data: {
              type: "array",
              items: { type: "object" }
            }
          }
        }
      });

      if (response.cleaned_data) {
        // Aplicar padrões aprendidos a todos os dados
        const cleanedAll = data.map(row => {
          const cleaned = { ...row };
          
          // Aplicar formatações básicas
          Object.keys(cleaned).forEach(key => {
            const value = cleaned[key];
            if (typeof value === 'string') {
              // Trim
              cleaned[key] = value.trim();
              
              // Email lowercase
              if (key.toLowerCase().includes('email')) {
                cleaned[key] = value.toLowerCase().trim();
              }
              
              // Nome capitalize
              if (key.toLowerCase().includes('name') || key.toLowerCase().includes('nome')) {
                cleaned[key] = value.split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');
              }
            }
          });
          
          return cleaned;
        });
        
        onDataChange(cleanedAll);
      }
    } catch (error) {
      console.error('Erro na limpeza com IA:', error);
    } finally {
      setIsCleaningAI(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={filterColumn} onValueChange={setFilterColumn}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar coluna" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todas</SelectItem>
              {detectedColumns.map(col => (
                <SelectItem key={col} value={col}>{col}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {filterColumn && (
            <Input
              placeholder="Valor do filtro..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="w-40"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Wand2 className="w-4 h-4 mr-2" />
                Limpar Dados
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={removeDuplicates}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Remover Duplicatas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={removeEmptyRows}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remover Linhas Vazias
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={cleanWithAI} disabled={isCleaningAI}>
                <Sparkles className="w-4 h-4 mr-2" />
                {isCleaningAI ? 'Limpando...' : 'Limpeza com IA'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedRows.length > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir ({selectedRows.length})
            </Button>
          )}

          <Button 
            onClick={onImport}
            className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Importar ({data.length})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <Badge variant="secondary">{data.length} registros</Badge>
        <Badge variant="secondary">{filteredData.length} exibidos</Badge>
        {selectedRows.length > 0 && (
          <Badge className="bg-[#6B2D8B]">{selectedRows.length} selecionados</Badge>
        )}
        <Badge variant="outline">
          {data.filter(row => detectIssues(row).length > 0).length} com problemas
        </Badge>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-10">#</TableHead>
                {detectedColumns.slice(0, 8).map(col => (
                  <TableHead key={col} className="capitalize min-w-[120px]">
                    {col.replace(/_/g, ' ')}
                  </TableHead>
                ))}
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, index) => {
                const issues = detectIssues(row);
                const isEditing = editingRow === index;
                
                return (
                  <TableRow key={index} className={issues.length > 0 ? 'bg-amber-50' : ''}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedRows.includes(index)}
                        onCheckedChange={() => toggleRowSelection(index)}
                      />
                    </TableCell>
                    <TableCell className="text-slate-500">{index + 1}</TableCell>
                    {detectedColumns.slice(0, 8).map(col => (
                      <TableCell key={col}>
                        {isEditing ? (
                          <Input
                            value={editingData[col] || ''}
                            onChange={(e) => setEditingData({
                              ...editingData,
                              [col]: e.target.value
                            })}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="truncate block max-w-[200px]">
                            {row[col] || '-'}
                          </span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      {issues.length > 0 ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {issues.length}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          OK
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(index)}>
                            <Save className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                            <X className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(index, row)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteRow(index)}>
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}