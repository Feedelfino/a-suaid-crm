import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { 
  Send, Search, MessageSquare, User, Check, CheckCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Chat() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  // Buscar todos os usuários
  const { data: users = [] } = useQuery({
    queryKey: ['chat-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  // Buscar todas as mensagens do usuário
  const { data: allMessages = [] } = useQuery({
    queryKey: ['chat-messages', user?.email],
    queryFn: async () => {
      const sent = await base44.entities.ChatMessage.filter({ sender_email: user.email }, '-created_date', 500);
      const received = await base44.entities.ChatMessage.filter({ receiver_email: user.email }, '-created_date', 500);
      return [...sent, ...received];
    },
    enabled: !!user?.email,
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });

  // Criar conversa ID
  const getConversationId = (email1, email2) => {
    return [email1, email2].sort().join('_');
  };

  // Mensagens da conversa selecionada
  const currentMessages = selectedUser 
    ? allMessages
        .filter(m => 
          (m.sender_email === user?.email && m.receiver_email === selectedUser.email) ||
          (m.sender_email === selectedUser.email && m.receiver_email === user?.email)
        )
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    : [];

  // Listar conversas únicas
  const conversations = React.useMemo(() => {
    const convMap = new Map();
    
    allMessages.forEach(msg => {
      const otherEmail = msg.sender_email === user?.email ? msg.receiver_email : msg.sender_email;
      const otherName = msg.sender_email === user?.email ? msg.receiver_name : msg.sender_name;
      
      if (!convMap.has(otherEmail) || new Date(msg.created_date) > new Date(convMap.get(otherEmail).lastMessage.created_date)) {
        const unreadCount = allMessages.filter(m => 
          m.sender_email === otherEmail && 
          m.receiver_email === user?.email && 
          !m.read
        ).length;
        
        convMap.set(otherEmail, {
          email: otherEmail,
          name: otherName || otherEmail,
          lastMessage: msg,
          unreadCount,
        });
      }
    });
    
    return Array.from(convMap.values()).sort((a, b) => 
      new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
    );
  }, [allMessages, user?.email]);

  // Enviar mensagem
  const sendMessage = useMutation({
    mutationFn: async (message) => {
      await base44.entities.ChatMessage.create({
        sender_email: user.email,
        sender_name: user.full_name,
        receiver_email: selectedUser.email,
        receiver_name: selectedUser.full_name,
        message,
        conversation_id: getConversationId(user.email, selectedUser.email),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chat-messages']);
      setMessageText('');
    },
  });

  // Marcar como lida
  const markAsRead = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.ChatMessage.update(messageId, { read: true });
    },
    onSuccess: () => queryClient.invalidateQueries(['chat-messages']),
  });

  // Auto scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Marcar mensagens como lidas quando selecionar usuário
  useEffect(() => {
    if (selectedUser) {
      currentMessages
        .filter(m => m.sender_email === selectedUser.email && !m.read)
        .forEach(m => markAsRead.mutate(m.id));
    }
  }, [selectedUser, currentMessages.length]);

  // Filtrar usuários para nova conversa
  const filteredUsers = users.filter(u => 
    u.email !== user?.email &&
    (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSend = (e) => {
    e.preventDefault();
    if (messageText.trim() && selectedUser) {
      sendMessage.mutate(messageText.trim());
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] flex gap-6">
      {/* Sidebar - Conversas */}
      <Card className="w-80 shrink-0 border-0 shadow-lg flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Mensagens</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar ou iniciar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {/* Mostrar usuários filtrados se pesquisando */}
            {searchTerm && (
              <div className="px-4 py-2 border-b">
                <p className="text-xs text-slate-500 mb-2">Iniciar nova conversa</p>
                {filteredUsers.slice(0, 5).map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setSearchTerm(''); }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#6B2D8B] text-white">
                        {u.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium text-sm">{u.full_name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Conversas existentes */}
            <div className="divide-y">
              {conversations.map(conv => (
                <button
                  key={conv.email}
                  onClick={() => setSelectedUser({ email: conv.email, full_name: conv.name })}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors ${
                    selectedUser?.email === conv.email ? 'bg-[#6B2D8B]/5' : ''
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-to-br from-[#6B2D8B] to-[#C71585] text-white">
                        {conv.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-[#C71585]">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-800 truncate">{conv.name}</p>
                      <span className="text-xs text-slate-400">
                        {conv.lastMessage?.created_date && 
                          format(parseISO(conv.lastMessage.created_date), 'HH:mm')}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                      {conv.lastMessage?.sender_email === user?.email && 'Você: '}
                      {conv.lastMessage?.message}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {conversations.length === 0 && !searchTerm && (
              <div className="p-8 text-center text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhuma conversa ainda</p>
                <p className="text-sm">Use a busca para iniciar</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 border-0 shadow-lg flex flex-col">
        {selectedUser ? (
          <>
            {/* Header do Chat */}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-[#6B2D8B] to-[#C71585] text-white">
                    {selectedUser.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-slate-800">{selectedUser.full_name}</p>
                  <p className="text-xs text-slate-500">{selectedUser.email}</p>
                </div>
              </div>
            </CardHeader>

            {/* Mensagens */}
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {currentMessages.map((msg) => {
                    const isOwn = msg.sender_email === user?.email;
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                          <div className={`rounded-2xl px-4 py-2 ${
                            isOwn 
                              ? 'bg-gradient-to-r from-[#6B2D8B] to-[#8B4DAB] text-white rounded-br-sm' 
                              : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-slate-400">
                              {msg.created_date && format(parseISO(msg.created_date), 'HH:mm')}
                            </span>
                            {isOwn && (
                              msg.read 
                                ? <CheckCheck className="w-3 h-3 text-blue-500" />
                                : <Check className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Input de Mensagem */}
            <div className="p-4 border-t">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={!messageText.trim()}
                  className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm">Ou inicie uma nova usando a busca</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}