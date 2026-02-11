import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SheetsExportButton() {
    const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [lastExport, setLastExport] = useState(null);

    const handleExport = async () => {
        if (!spreadsheetUrl.trim()) {
            toast.error('Por favor, cole o link da planilha');
            return;
        }

        setIsExporting(true);
        try {
            const response = await base44.functions.invoke('exportAllToSheets', {
                spreadsheet_url: spreadsheetUrl
            });

            if (response.data.success) {
                toast.success('Dados exportados com sucesso!');
                setLastExport({
                    timestamp: new Date().toLocaleString('pt-BR'),
                    details: response.data.details
                });
            } else {
                toast.error('Erro ao exportar: ' + (response.data.error || 'Erro desconhecido'));
            }
        } catch (error) {
            toast.error('Erro ao exportar dados: ' + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    </div>
                    Exportar para Google Sheets
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                        Link da Planilha Google Sheets
                    </label>
                    <Input
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={spreadsheetUrl}
                        onChange={(e) => setSpreadsheetUrl(e.target.value)}
                        disabled={isExporting}
                    />
                    <p className="text-xs text-slate-500">
                        Cole o link completo da sua planilha do Google Sheets
                    </p>
                </div>

                <Button 
                    onClick={handleExport}
                    disabled={isExporting || !spreadsheetUrl.trim()}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Exportando...
                        </>
                    ) : (
                        <>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Exportar Todos os Dados
                        </>
                    )}
                </Button>

                {lastExport && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-green-900">
                                    Última exportação: {lastExport.timestamp}
                                </p>
                                <div className="mt-2 text-xs text-green-700 space-y-1">
                                    <p>• Clientes: {lastExport.details.clientes}</p>
                                    <p>• Interações: {lastExport.details.interacoes}</p>
                                    <p>• Agenda: {lastExport.details.agenda}</p>
                                    <p>• Tarefas: {lastExport.details.tarefas}</p>
                                    <p>• Campanhas: {lastExport.details.campanhas}</p>
                                    <p>• Metas: {lastExport.details.metas}</p>
                                    <p>• Certificados: {lastExport.details.certificados}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900">Como usar:</p>
                            <ul className="mt-2 text-xs text-blue-700 space-y-1 list-disc list-inside">
                                <li>Crie uma nova planilha no Google Sheets</li>
                                <li>Copie o link da planilha</li>
                                <li>Cole o link acima e clique em "Exportar"</li>
                                <li>Todas as abas serão criadas automaticamente</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}