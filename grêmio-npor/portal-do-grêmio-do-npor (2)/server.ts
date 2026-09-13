import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Persistent JSON Database path
const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "portal-store.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Google Drive Official Folder Configuration
const GOOGLE_DRIVE_CONFIG = {
  rootFolderId: "1_V6tOeU9vzKcqBG0dFzSCct9B2znxeHU",
  rootFolderUrl: "https://drive.google.com/drive/folders/1_V6tOeU9vzKcqBG0dFzSCct9B2znxeHU",
  categories: [
    { name: "PLANILHA MÃE", type: "financial_sheet", description: "Movimentações gerais da tesouraria e livro caixa oficial" },
    { name: "FESTA JULINA", type: "event", description: "Documentos, receitas e despesas da Festa Julina" },
    { name: "CUSTOS ADICIONAIS", type: "costs", description: "Gastos e despesas extras operacionais" },
    { name: "CONTRATOS", type: "contracts", description: "Contratos de prestadores de serviços e fornecedores" },
    { name: "UNIFORMES", type: "uniforms", description: "Pedidos, fardamento e artigos militares" },
    { name: "CONFRATERNIZAÇÃO", type: "event", description: "Eventos sociais e churrascos da turma" },
    { name: "ABRIGOS", type: "jackets", description: "Abrigos e agasalhos padronizados" },
    { name: "CAMISAS", type: "shirts", description: "Camisas personalizadas da turma" },
    { name: "RIFAS", type: "raffles", description: "Campanhas arrecadatórias e sorteios" },
    { name: "MENSALIDADE", type: "monthly_fees", description: "Contribuições mensais dos integrantes" },
  ],
};

// Initial clean store structure (zero fictitious records)
const INITIAL_STORE = {
  config: {
    gremioName: "Grêmio do NPOR",
    turmaName: "Turma NPOR",
    year: "2026",
    unitName: "Núcleo de Preparação de Oficiais da Reserva",
    creationDate: "2026-02-16",
    initialBalance: 0,
    logoUrl: "",
    motto: "Formar o Oficial da Reserva com Honra e Excelência",
    isDemoMode: false,
    googleDriveConnected: false,
    googleDriveFolderId: GOOGLE_DRIVE_CONFIG.rootFolderId,
    driveFolderUrl: GOOGLE_DRIVE_CONFIG.rootFolderUrl,
    presidentName: "Felipe Gonçalves Ponce",
    treasurerName: "Tesouraria do Grêmio",
    fiscalCouncilNames: ["Conselho Fiscal do NPOR"],
    requireProofForExpense: true,
  },
  currentUser: {
    id: "usr-1",
    name: "Felipe Gonçalves Ponce",
    warName: "Al. Felipe",
    email: "felipegponce@gmail.com",
    role: "admin",
    department: "Presidência do Grêmio",
    active: true,
    createdAt: "2026-02-16T08:00:00Z",
  },
  users: [
    {
      id: "usr-1",
      name: "Felipe Gonçalves Ponce",
      warName: "Al. Felipe",
      email: "felipegponce@gmail.com",
      role: "admin",
      department: "Presidência do Grêmio",
      active: true,
      createdAt: "2026-02-16T08:00:00Z",
    },
  ],
  transactions: [],
  documents: [],
  transactionDocuments: [],
  members: [],
  monthlyFees: [],
  raffles: [],
  shirtOrders: [],
  jacketOrders: [],
  uniformOrders: [],
  getTogethers: [],
  contracts: [],
  additionalCosts: [],
  events: [],
  plans: [],
  graduationServices: [],
  graduationGeneral: {
    targetDate: "2026-11-28",
    eventDate: "2026-11-28",
    venueName: "A definir pela comissão",
    location: "A definir",
    targetGraduates: 0,
    estimatedGraduates: 0,
    estimatedGuests: 0,
    individualQuotaAmount: 0,
    totalBudget: 0,
    totalCollected: 0,
    totalContracted: 0,
    totalPaid: 0,
    totalPending: 0,
    availableBalance: 0,
  },
  alerts: [],
  auditLogs: [],
  lastSyncedAt: null,
};

function readStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Erro ao ler banco de dados persistente:", err);
  }
  // Initialize file if not exists
  writeStore(INITIAL_STORE);
  return INITIAL_STORE;
}

function writeStore(data: any) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao gravar banco de dados persistente:", err);
  }
}

// -----------------------------------------------------------------------------
// REST API ROUTES
// -----------------------------------------------------------------------------

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    appName: "Portal de Gestão do Grêmio do NPOR",
    persistence: "local_json_db",
    driveFolderId: GOOGLE_DRIVE_CONFIG.rootFolderId,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/state - Retorna estado persistente completo
app.get("/api/state", (_req, res) => {
  const store = readStore();
  res.json(store);
});

// POST /api/state - Atualiza estado persistente completo
app.post("/api/state", (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== "object") {
    return res.status(400).json({ error: "Dados inválidos para persistência." });
  }

  const current = readStore();
  const merged = {
    ...current,
    ...incoming,
    config: {
      ...current.config,
      ...(incoming.config || {}),
      isDemoMode: false, // Forçar modo real
    },
    updatedAt: new Date().toISOString(),
  };

  writeStore(merged);
  res.json({ success: true, message: "Dados persistidos com sucesso no servidor." });
});

// GET /api/drive/folders - Lista das 10 pastas reais do Google Drive
app.get("/api/drive/folders", (_req, res) => {
  res.json(GOOGLE_DRIVE_CONFIG);
});

// POST /api/drive/import-sheet - Importação e processamento determinístico da Planilha Mãe
app.post("/api/drive/import-sheet", (req, res) => {
  const { sheetName = "PLANILHA MÃE", rawText, rows } = req.body;

  let parsedRows: any[] = [];

  if (Array.isArray(rows) && rows.length > 0) {
    parsedRows = rows;
  } else if (typeof rawText === "string" && rawText.trim()) {
    // Parser de CSV / TSV
    const lines = rawText.trim().split(/\r?\n/);
    if (lines.length > 1) {
      const headerLine = lines[0];
      const delimiter = headerLine.includes("\t") ? "\t" : headerLine.includes(";") ? ";" : ",";
      const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
        
        const rowObj: any = { _rowIndex: i + 1 };
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] || "";
        });
        parsedRows.push(rowObj);
      }
    }
  }

  if (parsedRows.length === 0) {
    return res.status(400).json({
      error: "Nenhum dado legível foi encontrado para importação.",
    });
  }

  const store = readStore();
  const existingTransactions = store.transactions || [];
  let importedCount = 0;
  let duplicatedCount = 0;

  for (const row of parsedRows) {
    // Normalização dos campos esperados
    const dateStr = row.data || row.date || row.dia || new Date().toISOString().split("T")[0];
    const desc = row.descrição || row.descricao || row.description || row.historico || row.histórico || "Lançamento Importado";
    const category = row.categoria || row.category || sheetName;
    const resp = row.responsável || row.responsavel || row.responsible || "Tesouraria";
    const payMethod = row.forma_pagamento || row["forma de pagamento"] || row.metodo || "PIX";
    const obs = row.observação || row.observacao || row.notas || "";
    const sourceRowId = String(row._rowIndex || row.id || "");
    const sourceFileId = GOOGLE_DRIVE_CONFIG.rootFolderId;

    // Detecção de valores: entrada ou saída
    let amount = 0;
    let type: "receita" | "despesa" = "despesa";

    const entradaRaw = row.entrada || row.receita || row.credito || row.crédito;
    const saidaRaw = row.saída || row.saida || row.despesa || row.debito || row.débito;
    const valorRaw = row.valor || row.amount;

    if (entradaRaw && parseFloat(String(entradaRaw).replace(/\./g, "").replace(",", ".")) > 0) {
      amount = parseFloat(String(entradaRaw).replace(/\./g, "").replace(",", "."));
      type = "receita";
    } else if (saidaRaw && parseFloat(String(saidaRaw).replace(/\./g, "").replace(",", ".")) > 0) {
      amount = parseFloat(String(saidaRaw).replace(/\./g, "").replace(",", "."));
      type = "despesa";
    } else if (valorRaw) {
      amount = Math.abs(parseFloat(String(valorRaw).replace(/\./g, "").replace(",", ".")) || 0);
      if (String(row.tipo).toLowerCase().includes("rec") || String(row.tipo).toLowerCase().includes("ent")) {
        type = "receita";
      } else {
        type = "despesa";
      }
    }

    if (amount <= 0) continue;

    // Regra Anti-Duplicação: Verifica se já existe por sourceRowId + sourceFileId, ou (data + valor + descrição)
    const isDuplicate = existingTransactions.some((t: any) => {
      if (t.sourceFileId === sourceFileId && t.sourceRowId === sourceRowId && sourceRowId) {
        return true;
      }
      return (
        t.date === dateStr &&
        Math.abs(t.amount - amount) < 0.01 &&
        t.type === type &&
        t.description.trim().toLowerCase() === desc.trim().toLowerCase()
      );
    });

    if (isDuplicate) {
      duplicatedCount++;
      continue;
    }

    const txId = `tx-drive-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const txCode = `TX-${String(existingTransactions.length + 1).padStart(4, "0")}`;

    const newTx = {
      id: txId,
      code: txCode,
      date: dateStr,
      type,
      description: desc,
      category,
      amount,
      paymentMethod: payMethod,
      beneficiaryName: type === "despesa" ? desc : "Grêmio do NPOR",
      responsibleUser: resp,
      status: type === "receita" ? "recebida" : "paga",
      receiptRequired: type === "despesa",
      notes: obs,
      source: "Google Drive",
      sourceFileId,
      sourceRowId,
      driveFolder: sheetName,
      originalFileUrl: `${GOOGLE_DRIVE_CONFIG.rootFolderUrl}`,
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    existingTransactions.push(newTx);
    importedCount++;
  }

  store.transactions = existingTransactions;
  store.lastSyncedAt = new Date().toISOString();
  writeStore(store);

  return res.json({
    success: true,
    importedCount,
    duplicatedCount,
    totalTransactions: existingTransactions.length,
    message: `${importedCount} lançamentos importados com sucesso da pasta ${sheetName}. ${duplicatedCount} duplicidades evitadas.`,
  });
});

// POST /api/transaction-documents - Relacionamento N:N entre Transação e Documento
app.post("/api/transaction-documents", (req, res) => {
  const { transaction_id, document_id, relationship_type = "comprovante", notes } = req.body;

  if (!transaction_id || !document_id) {
    return res.status(400).json({ error: "transaction_id e document_id são obrigatórios." });
  }

  const store = readStore();
  const links = store.transactionDocuments || [];

  // Evitar duplicar vínculo
  const exists = links.some(
    (l: any) => l.transaction_id === transaction_id && l.document_id === document_id && l.relationship_type === relationship_type
  );

  if (!exists) {
    links.push({
      id: `td-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      transaction_id,
      document_id,
      relationship_type,
      notes: notes || "",
      linked_at: new Date().toISOString(),
      linked_by: store.currentUser?.warName || "Al. Felipe",
    });
    store.transactionDocuments = links;

    // Atualizar referências diretas na transação
    const tx = (store.transactions || []).find((t: any) => t.id === transaction_id);
    if (tx) {
      if (!tx.documentIds) tx.documentIds = [];
      if (!tx.documentIds.includes(document_id)) tx.documentIds.push(document_id);
      if (relationship_type === "comprovante") {
        tx.receiptDocumentId = document_id;
      }
    }

    // Atualizar documento como auditStatus = 'validado'
    const doc = (store.documents || []).find((d: any) => d.id === document_id);
    if (doc) {
      doc.relatedTransactionId = transaction_id;
      doc.auditStatus = "validado";
    }

    writeStore(store);
  }

  res.json({ success: true, message: "Documento vinculado com sucesso." });
});

// Start server with Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Portal do Grêmio do NPOR rodando em http://localhost:${PORT}`);
  });
}

startServer();
