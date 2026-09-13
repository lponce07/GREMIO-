import React, { useState } from 'react';
import { HistoryRecord, UserRole } from '../types';
import { AppState, formatDatePtBr } from '../services/dataService';
import { BookOpen, Plus, Calendar, Clock, Award, Flag, ShieldCheck } from 'lucide-react';

interface HistoryViewProps {
  appState: AppState;
  userRole: UserRole;
  onAddHistoryRecord: (record: HistoryRecord) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  appState,
  userRole,
  onAddHistoryRecord,
}) => {
  const { history, config } = appState;
  const canEdit = userRole === 'admin' || userRole === 'diretor_eventos';

  const [filterCategory, setFilterCategory] = useState<string>('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'instrucao' | 'evento' | 'formatura' | 'administrativo'>('evento');

  const filteredHistory = history.filter((item) => {
    if (filterCategory === 'todas') return true;
    return item.category === filterCategory;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newRec: HistoryRecord = {
      id: `hist-${Date.now()}`,
      date: newDate,
      title: newTitle,
      description: newDesc,
      category: newCategory,
      photosOrAttachments: [],
      author: appState.currentUser.warName,
    };
    onAddHistoryRecord(newRec);
    setIsModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    setNewDate('');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#1A2421] text-[#D4AF37] border border-[#D4AF37]/30">
              Livro Tombo & Memória
            </span>
            <span className="text-xs text-slate-500 font-medium">Turma {config.turmaName}</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A2421] mt-1 font-institutional flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#D4AF37]" />
            História & Atividades do Grêmio
          </h2>
          <p className="text-xs text-slate-500">
            Registro cronológico das instruções, conquistas, eventos e marcos da formação dos futuros oficiais da reserva.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            Registrar Novo Marco Histórico
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 p-2 shadow-sm text-xs">
        <span className="text-slate-500 text-[11px] px-2 font-bold uppercase tracking-wider">Filtrar por:</span>
        {['todas', 'instrucao', 'evento', 'formatura', 'administrativo'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1 capitalize text-xs font-bold transition ${
              filterCategory === cat
                ? 'bg-[#4B5320] text-white tracking-wider'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {cat === 'todas' ? 'Todos os Marcos' : cat}
          </button>
        ))}
      </div>

      {/* Timeline View */}
      <div className="relative border-l-2 border-slate-300 ml-4 md:ml-8 space-y-8 py-4">
        {filteredHistory.map((item) => (
          <div key={item.id} className="relative pl-6 md:pl-8 group">
            {/* Timeline Dot */}
            <div className="absolute -left-[9px] top-1.5 w-4 h-4 bg-[#1A2421] border-2 border-[#D4AF37] group-hover:scale-125 transition-transform" />

            {/* Event Card */}
            <div className="bg-white border border-slate-200 p-5 shadow-sm space-y-2 hover:border-slate-300 transition">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#4B5320] font-mono">
                    {formatDatePtBr(item.date)}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                    {item.category}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Registrado por:{' '}
                  <strong className="text-slate-700">
                    {item.author
                      ? (item.author.startsWith('AL ') || item.author.startsWith('Aluno ')
                          ? item.author
                          : `AL ${item.author}`)
                      : 'Não informado'}
                  </strong>
                </span>
              </div>

              <h3 className="text-sm font-bold text-[#1A2421] mt-1">{item.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: New History Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-300 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#1A2421] p-4 text-white">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] font-institutional">
                Registrar Acontecimento no Livro do Grêmio
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-3.5 text-xs text-slate-700">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Título do Marco</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Cerimônia de Entrega da Boina Azul Ferrete"
                  className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Categoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                >
                  <option value="instrucao">Instrução Militar / Exercício de Campanha</option>
                  <option value="evento">Evento Social / Esportivo</option>
                  <option value="formatura">Etapa da Formatura</option>
                  <option value="administrativo">Ato Administrativo</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Descrição Detalhada</label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Descreva o acontecimento para os anais da turma..."
                  className="w-full bg-white border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4B5320] hover:bg-[#3d441a] text-white font-bold uppercase text-xs shadow-sm transition"
                >
                  Salvar no Livro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
