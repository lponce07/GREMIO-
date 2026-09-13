import React, { useState } from 'react';
import { EventRecord, UserRole } from '../types';
import { canManageEvents } from '../utils/permissions';
import { AppState, formatCurrencyPtBr, formatDatePtBr } from '../services/dataService';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  DollarSign,
  ListTodo,
  FileText,
  Building,
  Award,
  AlertCircle,
} from 'lucide-react';

interface EventsViewProps {
  appState: AppState;
  userRole: UserRole;
  onUpdateEvent: (event: EventRecord) => void;
  onAddEvent: (event: EventRecord) => void;
  onNavigateToDocuments: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  appState,
  userRole,
  onUpdateEvent,
  onAddEvent,
  onNavigateToDocuments,
}) => {
  const { events, config } = appState;
  const canEdit = canManageEvents(userRole);

  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // New Event Modal state
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDateTime, setNewDateTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newResponsible, setNewResponsible] = useState(appState.currentUser.warName);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const handleToggleChecklist = (itemIndex: number) => {
    if (!canEdit || !selectedEvent) return;
    const updatedChecklist = [...selectedEvent.checklist];
    updatedChecklist[itemIndex].completed = !updatedChecklist[itemIndex].completed;

    onUpdateEvent({
      ...selectedEvent,
      checklist: updatedChecklist,
    });
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = parseFloat(newBudget.replace(/\./g, '').replace(',', '.')) || 0;

    const newEvt: EventRecord = {
      id: `evt-${Date.now()}`,
      name: newName,
      description: newDesc,
      dateTime: newDateTime,
      location: newLocation,
      mainResponsible: newResponsible,
      supportTeam: ['Diretoria de Eventos'],
      budgetAllocated: budgetNum,
      usedBudget: 0,
      status: 'planejado',
      checklist: [
        { task: 'Definição do local e autorização do Comando', responsible: newResponsible, completed: false },
        { task: 'Cotação de fornecedores e alimentação', responsible: 'Tesouraria', completed: false },
        { task: 'Divulgação para os alunos da turma', responsible: newResponsible, completed: false },
        { task: 'Prestação de contas e arquivo de comprovantes', responsible: 'Tesouraria', completed: false },
      ],
      suppliersInvolved: [],
      receiptDocumentIds: [],
    };

    onAddEvent(newEvt);
    setIsNewEventModalOpen(false);
    setSelectedEventId(newEvt.id);

    // Reset fields
    setNewName('');
    setNewDesc('');
    setNewDateTime('');
    setNewLocation('');
    setNewBudget('');
  };

  const filteredEvents = events.filter((e) => {
    if (filterStatus === 'todos') return true;
    return e.status === filterStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#1A2421] text-[#D4AF37] border border-[#D4AF37]/30">
              Diretoria Social & Recreativa
            </span>
            <span className="text-xs text-slate-500 font-medium">Coordenação de Eventos</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A2421] mt-1 font-institutional flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#4B5320]" />
            Eventos do Grêmio do NPOR
          </h2>
          <p className="text-xs text-slate-500">
            Planejamento, checklist de execução, controle de fornecedores e prestação de contas dos eventos da turma.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsNewEventModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4B5320] hover:bg-[#3d441a] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </button>
        )}
      </div>

      {/* Main Grid: Left is Event List, Right is Event Detail & Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Events Cards List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1A2421]">
              Eventos Programados ({events.length})
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-300 px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-[#4B5320]"
            >
              <option value="todos">Todos</option>
              <option value="concluido">Concluídos</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="planejado">Planejados</option>
            </select>
          </div>

          <div className="space-y-2.5">
            {filteredEvents.map((evt) => {
              const isSelected = evt.id === selectedEvent?.id;
              const completedTasks = (evt.checklist || []).filter((c) => c.completed).length;

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`p-4 border cursor-pointer transition text-xs space-y-2 ${
                    isSelected
                      ? 'bg-white border-l-4 border-l-[#4B5320] border-y border-r border-slate-200 shadow-sm ring-1 ring-[#4B5320]/20'
                      : 'bg-white border border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-[#1A2421] text-xs">{evt.name}</h4>
                    <span
                      className={`text-[9px] uppercase font-bold px-2 py-0.5 border ${
                        evt.status === 'concluido'
                          ? 'bg-[#4B5320]/15 text-[#4B5320] border-[#4B5320]/40'
                          : evt.status === 'em_andamento'
                          ? 'bg-[#1A2421]/10 text-[#1A2421] border-[#1A2421]/30'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {evt.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2">{evt.description}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {evt.dateTime.split(' ')[0]}
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      Checklist: {completedTasks}/{evt.checklist.length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Event Detailed View (Span 2) */}
        {selectedEvent ? (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 shadow-sm p-6 space-y-5">
              {/* Event Header Banner */}
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                        selectedEvent.status === 'concluido'
                          ? 'bg-[#4B5320]/15 text-[#4B5320] border-[#4B5320]/40'
                          : 'bg-[#1A2421]/10 text-[#1A2421] border-[#1A2421]/30'
                      }`}
                    >
                      Situação: {selectedEvent.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500">
                      Coordenador:{' '}
                      {selectedEvent.mainResponsible
                        ? (selectedEvent.mainResponsible.startsWith('AL ') || selectedEvent.mainResponsible.startsWith('Aluno ')
                            ? selectedEvent.mainResponsible
                            : `AL ${selectedEvent.mainResponsible}`)
                        : 'Não informado'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1A2421] mt-1 font-institutional">
                    {selectedEvent.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedEvent.description}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Orçamento Previsto</span>
                  <p className="text-base font-bold font-mono text-[#4B5320]">
                    {formatCurrencyPtBr(selectedEvent.budgetAllocated)}
                  </p>
                  <span className="text-[11px] text-slate-500">
                    Custo Realizado: <strong className="text-slate-700">{formatCurrencyPtBr(selectedEvent.usedBudget)}</strong>
                  </span>
                </div>
              </div>

              {/* Event Meta Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                  <CalendarDays className="w-4 h-4 text-[#4B5320] shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Data & Horário</span>
                    <p className="font-bold text-[#1A2421]">{selectedEvent.dateTime}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Local do Evento</span>
                    <p className="font-bold text-[#1A2421]">{selectedEvent.location}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                  <User className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Equipe de Apoio</span>
                    <p className="font-bold text-[#1A2421]">{selectedEvent.supportTeam.join(', ')}</p>
                  </div>
                </div>
              </div>

              {/* Checklist Didático e Operacional */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2421] flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-[#4B5320]" />
                    Checklist Operacional & Responsabilidades
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono font-bold">
                    {(selectedEvent.checklist || []).filter((c) => c.completed).length} de {(selectedEvent.checklist || []).length} concluídas
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedEvent.checklist.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleToggleChecklist(idx)}
                      className={`p-3 border flex items-center justify-between text-xs cursor-pointer transition ${
                        item.completed
                          ? 'bg-[#4B5320]/10 border-[#4B5320]/30 text-slate-700'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => {}}
                          className="w-4 h-4 accent-[#4B5320]"
                        />
                        <span className={item.completed ? 'line-through text-slate-400' : 'font-bold'}>
                          {item.task}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Resp: <strong className="text-slate-700">{item.responsible}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Post-Event Evaluation (if concluded) */}
              {selectedEvent.evaluation && (
                <div className="p-5 bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#D4AF37]" />
                      Avaliação Pós-Evento & Registro Histórico
                    </h4>
                    <span className="text-xs font-bold text-[#1A2421]">
                      Público Estimado: {selectedEvent.evaluation.attendance} presentes
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-3 bg-white border border-slate-200">
                      <span className="text-[10px] text-[#4B5320] uppercase font-bold block mb-1">
                        Pontos Fortes Registrados
                      </span>
                      <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px]">
                        {selectedEvent.evaluation.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 bg-white border border-slate-200">
                      <span className="text-[10px] text-amber-700 uppercase font-bold block mb-1">
                        Lições Aprendidas / Melhorias
                      </span>
                      <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px]">
                        {selectedEvent.evaluation.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-8 bg-white border border-slate-200 text-center text-slate-500 text-xs">
            Selecione um evento na lista para visualizar seus dados.
          </div>
        )}
      </div>

      {/* Modal: New Event */}
      {isNewEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-slate-300 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#1A2421] p-4 text-white">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] font-institutional">
                Cadastrar Novo Evento do Grêmio
              </h3>
              <button
                onClick={() => setIsNewEventModalOpen(false)}
                className="text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-3.5 text-xs text-slate-700">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nome do Evento</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Jantar de Entrega das Espadas"
                  className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Descrição</label>
                <textarea
                  required
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Finalidade e objetivos da confraternização..."
                  className="w-full bg-white border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:border-[#4B5320]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Data e Horário</label>
                  <input
                    type="text"
                    required
                    value={newDateTime}
                    onChange={(e) => setNewDateTime(e.target.value)}
                    placeholder="Ex: 15/10/2026 às 19:30"
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Orçamento Alocado (R$)</label>
                  <input
                    type="text"
                    required
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="Ex: 3.500,00"
                    className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Local</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Ex: Clube dos Oficiais / Grêmio da Unidade"
                  className="w-full bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewEventModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4B5320] hover:bg-[#3d441a] text-white font-bold uppercase text-xs shadow-sm transition"
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
