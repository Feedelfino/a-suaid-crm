import React from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldX, LogOut, Mail } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccessDenied({ user, onLogout }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-0 shadow-2xl">
        <CardContent className="p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
            <ShieldX className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Acesso Negado</h1>
          
          <p className="text-slate-500 mb-6">
            Olá, <strong>{user?.full_name || 'Usuário'}</strong>!
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800 text-sm">
              Seu acesso ao CRM foi negado pelo administrador. 
              Se você acredita que isso é um erro, entre em contato com o suporte.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Seus dados</p>
            <div className="space-y-2">
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                {user?.email}
              </p>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={onLogout}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}