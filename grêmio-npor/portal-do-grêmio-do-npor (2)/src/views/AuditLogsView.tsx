import React, { useState } from 'react';
import { AuditLogRecord } from '../types';
import { AppState, formatDatePtBr } from '../services/dataService';
import { Shield, Search, Filter, History, User, Terminal } from 'lucide-react';

interface AuditLogsViewProps {
  appState: AppState;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ appState }) => {
  const { auditLogs } = appState;
  const [filterModule, setFilterModule] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = auditLogs.filter((log) => {
    if (filterModule !== 'todos' && log.module !== filterModule) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchUser = log.userName.toLowerCase().includes(q);
      const matchTarget = (log.targetEntity || '').toLowerCase().includes(q);
      if (!matchAction && !matchUser && !matchTarget) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-stone-700 text-stone-300 border border-stone-600">
              Trilha Imutável
            </span>
            <span className="text-xs text-stone-400">Auditoria Forense de Operações</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 font-institutional flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            Registro de Atividades & Logs de Auditoria
          </h2>
          <p className="text-xs text-stone-400">
            Registro de todas as inclusões, edições, exclusões e conciliações realizadas pelos membros da diretoria.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-stone-900 border border-stone-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por usuário, ação ou código..."
              className="w-full bg-stone-800 border border-stone-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-stone-400 focus:outline-none"
            />
          </div>

          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="bg-stone-800 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none"
          >
            <option value="todos">Todos os Módulos</option>
            <option value="tesouraria">Tesouraria</option>
            <option value="documentos">Documentos</option>
            <option value="formatura">Formatura</option>
            <option value="eventos">Eventos</option>
            <option value="auditoria">Auditoria & Alertas</option>
          </select>
        </div>

        <span className="text-[11px] text-stone-400 font-mono">
          {filteredLogs.length} registro(s)
        </span>
      </div>

      {/* Logs Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-850 text-stone-400 text-[10px] uppercase font-bold border-b border-stone-800">
              <tr>
                <th className="p-3">Data e Hora</th>
                <th className="p-3">Módulo</th>
                <th className="p-3">Usuário Responsável</th>
                <th className="p-3">Ação Executada</th>
                <th className="p-3">Registro Alvo</th>
                <th className="p-3">Canal / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-800/40 transition">
                  <td className="p-3 font-mono text-[11px] text-stone-400 whitespace-nowrap">
                    {formatDatePtBr(log.timestamp)} às {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-stone-800 text-amber-400 border border-stone-700">
                      {log.module}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <span>Aluno {log.userName}</span>
                  </td>
                  <td className="p-3 text-stone-200">{log.action}</td>
                  <td className="p-3 font-mono text-emerald-400 text-[11px]">{log.targetEntity || '—'}</td>
                  <td className="p-3 text-stone-400 font-mono text-[10px]">{log.ipAddress || '192.168.1.45'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
