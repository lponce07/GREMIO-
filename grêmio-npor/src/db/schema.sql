-- =============================================================================
-- PORTAL DE GESTÃO INSTITUCIONAL DO GRÊMIO DO NPOR
-- Estrutura de Banco de Dados Relacional Persistente (PostgreSQL / Supabase)
-- Diretório Google Drive Raiz: 1_V6tOeU9vzKcqBG0dFzSCct9B2znxeHU
-- =============================================================================

-- Habilita extensão para geração de UUIDs se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABELA: USERS (Usuários e Integrantes com Permissões)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    war_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'aluno', -- admin, tesouraria, diretor_eventos, comissao_formatura, aluno, fiscal
    department VARCHAR(150),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- -----------------------------------------------------------------------------
-- 2. TABELA: TRANSACTION_CATEGORIES (Categorias Oficiais da Planilha Mãe e Pastas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    drive_folder_name VARCHAR(100), -- PLANILHA MÃE, FESTA JULINA, CUSTOS ADICIONAIS, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. TABELA: TRANSACTIONS (Movimentações Financeiras Reais da Planilha Mãe)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('receita', 'despesa', 'transferencia')),
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) NOT NULL, -- PIX, Boleto, TED, etc.
    beneficiary_name VARCHAR(255),
    beneficiary_cpf_cnpj VARCHAR(30),
    responsible_user VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente', -- pendente, paga, recebida, cancelada
    due_date DATE,
    payment_date DATE,
    receipt_required BOOLEAN DEFAULT TRUE,
    notes TEXT,
    cancellation_reason TEXT,
    
    -- Rastreabilidade Google Drive / Origem Real
    source VARCHAR(50) DEFAULT 'Google Drive', -- 'Google Drive', 'Manual', 'Planilha Importada'
    source_file_id VARCHAR(150), -- Google Drive File ID
    source_row_id VARCHAR(50),  -- Linha original da Planilha Mãe
    drive_folder VARCHAR(100),  -- 'PLANILHA MÃE', 'FESTA JULINA', etc.
    original_file_url TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_source_row ON transactions(source_file_id, source_row_id);

-- -----------------------------------------------------------------------------
-- 4. TABELA: DOCUMENTS (Comprovantes, Contratos, Notas Fiscais e Orçamentos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- comprovante_pix, recibo, nota_fiscal, contrato, orcamento, etc.
    date DATE NOT NULL,
    detected_amount NUMERIC(15, 2),
    detected_person_or_company VARCHAR(255),
    detected_date DATE,
    source VARCHAR(50) DEFAULT 'Google Drive',
    drive_file_id VARCHAR(150),
    drive_folder VARCHAR(100), -- UNIFORMES, CAMISAS, ABRIGOS, CONTRATOS, etc.
    drive_url TEXT,
    file_size_kb INTEGER DEFAULT 0,
    file_hash VARCHAR(100),
    audit_status VARCHAR(50) DEFAULT 'pendente_conferencia', -- validado, pendente_conferencia, divergente, sem_vinculo
    responsible VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_documents_file_id ON documents(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(drive_folder);

-- -----------------------------------------------------------------------------
-- 5. TABELA: TRANSACTION_DOCUMENTS (Relacionamento N:N entre Transações e Documentos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (
        relationship_type IN ('comprovante', 'contrato', 'orcamento', 'nota', 'recibo')
    ),
    notes TEXT,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    linked_by VARCHAR(100),
    CONSTRAINT unique_tx_doc UNIQUE (transaction_id, document_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_tx_doc_tx ON transaction_documents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_doc_doc ON transaction_documents(document_id);

-- -----------------------------------------------------------------------------
-- 6. TABELA: MEMBERS (Integrantes do Grêmio / Turma NPOR)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    war_name VARCHAR(100) NOT NULL,
    military_id VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    phone VARCHAR(30),
    email VARCHAR(255),
    shirt_size VARCHAR(10),
    jacket_size VARCHAR(10),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 7. TABELA: MONTHLY_FEES (Mensalidades dos Integrantes - Pasta MENSALIDADE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    member_name VARCHAR(255) NOT NULL,
    competence_month VARCHAR(7) NOT NULL, -- Ex: '2026-03'
    amount NUMERIC(15, 2) NOT NULL,
    payment_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pago', 'Pendente', 'Atrasado', 'Isento')),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    notes TEXT,
    source VARCHAR(50) DEFAULT 'Google Drive',
    source_file_id VARCHAR(150),
    source_row_id VARCHAR(50),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monthly_fees_comp ON monthly_fees(competence_month);

-- -----------------------------------------------------------------------------
-- 8. TABELA: RAFFLES (Rifas Arrecadatórias - Pasta RIFAS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raffles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    total_tickets INTEGER NOT NULL CHECK (total_tickets > 0),
    ticket_price NUMERIC(15, 2) NOT NULL CHECK (ticket_price >= 0),
    responsible VARCHAR(100) NOT NULL,
    collected_amount NUMERIC(15, 2) DEFAULT 0,
    pending_amount NUMERIC(15, 2) DEFAULT 0,
    expenses_amount NUMERIC(15, 2) DEFAULT 0,
    net_result NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'em_andamento',
    source VARCHAR(50) DEFAULT 'Google Drive',
    source_file_id VARCHAR(150),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 9. TABELA: CONTRACTS (Contratos Reais de Serviços e Fornecedores - Pasta CONTRATOS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(255) NOT NULL,
    contractor VARCHAR(255) NOT NULL,
    contractor_cnpj_cpf VARCHAR(30),
    object TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    down_payment NUMERIC(15, 2) DEFAULT 0,
    installments_count INTEGER DEFAULT 1,
    paid_amount NUMERIC(15, 2) DEFAULT 0,
    pending_balance NUMERIC(15, 2) DEFAULT 0,
    contract_date DATE NOT NULL,
    due_dates JSONB DEFAULT '[]'::jsonb,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    original_file_url TEXT,
    status VARCHAR(30) DEFAULT 'ativo',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 10. TABELA: SUPPLIERS (Fornecedores Cadastrados e Cotações)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj_cpf VARCHAR(30),
    category VARCHAR(100) NOT NULL,
    contact_name VARCHAR(150),
    phone VARCHAR(30),
    email VARCHAR(255),
    pix_key VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 11. TABELA: EVENTS (Eventos, Festa Julina, Confraternizações)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Geral', -- 'Festa Julina', 'Confraternização', 'Formatura', 'Instrução'
    description TEXT,
    date_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    main_responsible VARCHAR(100) NOT NULL,
    budget_allocated NUMERIC(15, 2) DEFAULT 0,
    used_budget NUMERIC(15, 2) DEFAULT 0,
    related_income NUMERIC(15, 2) DEFAULT 0,
    related_expense NUMERIC(15, 2) DEFAULT 0,
    net_result NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'planejado',
    checklist JSONB DEFAULT '[]'::jsonb,
    source VARCHAR(50) DEFAULT 'Google Drive',
    source_file_id VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 12. TABELA: GRADUATION_SERVICES (Serviços Oficiais da Formatura / Baile)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS graduation_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    supplier_name VARCHAR(255),
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    contracted_amount NUMERIC(15, 2) DEFAULT 0,
    paid_amount NUMERIC(15, 2) DEFAULT 0,
    pending_amount NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pesquisa',
    responsible VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 13. TABELA: PLANS (Planejamentos Futuros Oficiais)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    justification TEXT NOT NULL,
    target_date DATE NOT NULL,
    estimated_cost NUMERIC(15, 2) DEFAULT 0,
    responsible VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'em_estudo',
    steps JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 14. TABELA: AUDIT_ALERTS (Alertas de Auditoria Regidos por Regras Determinísticas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('vermelho', 'amarelo', 'azul', 'verde')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(100) NOT NULL,
    related_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    related_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    divergent_value TEXT,
    probable_reason TEXT,
    status VARCHAR(30) DEFAULT 'ativo',
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    justification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 15. TABELA: AUDIT_LOGS (Trilha Imutável de Auditoria / Livro Razão)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_name VARCHAR(100) NOT NULL,
    user_role VARCHAR(50),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    summary TEXT NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50)
);

-- -----------------------------------------------------------------------------
-- 16. TABELA: DRIVE_SYNC (Histórico e Estado da Sincronização Google Drive)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drive_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id VARCHAR(150) NOT NULL, -- '1_V6tOeU9vzKcqBG0dFzSCct9B2znxeHU'
    folder_name VARCHAR(150) NOT NULL,
    folder_path TEXT NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    files_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL, -- 'sucesso', 'parcial', 'erro', 'aguardando_credenciais'
    error_message TEXT
);
