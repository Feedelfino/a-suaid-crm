import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Loader2 } from 'lucide-react';

export default function NicknameEditor({ userAccess, onSave, isSaving }) {
  const [nickname, setNickname] = useState(userAccess?.nickname || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const generateSuggestions = async () => {
    if (!userAccess?.user_name) return;
    
    setLoadingSuggestions(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Gere 5 sugestões de nickname/username profissional para uma pessoa chamada "${userAccess.user_name}". 
        
        Os nicknames devem ser:
        - Curtos (máximo 15 caracteres)
        - Profissionais
        - Fáceis de lembrar
        - Usar formatos como: nome.sobrenome, inicial.sobrenome, nome.inicial, etc.
        
        Retorne apenas os 5 nicknames, um por linha, sem numeração ou explicação.`,
        response_json_schema: {
          type: "object",
          properties: {
            nicknames: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });
      
      if (result?.nicknames) {
        setSuggestions(result.nicknames.slice(0, 5));
      }
    } catch (e) {
      // Gerar sugestões locais como fallback
      const name = userAccess.user_name;
      const parts = name.toLowerCase().split(' ');
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      const firstInitial = firstName.charAt(0);
      
      const localSuggestions = [
        `${firstName}.${lastName}`,
        `${firstInitial}.${lastName}`,
        `${firstName}${lastName.charAt(0)}`,
        `${firstName}.${lastName.substring(0, 3)}`,
        `${firstInitial}${lastName}`,
      ].map(s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
      
      setSuggestions(localSuggestions);
    }
    setLoadingSuggestions(false);
  };

  const handleSave = () => {
    onSave(userAccess.id, nickname);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label className="text-xs text-slate-500">Nickname</Label>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Digite ou selecione um nickname"
            className="mt-1"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generateSuggestions}
          disabled={loadingSuggestions}
          className="mt-5"
        >
          {loadingSuggestions ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span className="ml-1 hidden sm:inline">IA</span>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="mt-5 bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500">Sugestões:</span>
          {suggestions.map((suggestion, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className="cursor-pointer hover:bg-[#6B2D8B]/10 hover:border-[#6B2D8B] transition-colors"
              onClick={() => setNickname(suggestion)}
            >
              {suggestion}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}