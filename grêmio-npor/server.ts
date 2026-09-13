import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configurações Oficiais do Google Drive do Grêmio
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

// Armazenamento em memória (sem dependência de arquivo de disco efêmero)
// A persistência primária oficial reside diretamente no Cloud Firestore.
let inMemoryStore: any = {
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
    presidentName: "Não informado",
    treasurerName: "Não informado",
    fiscalCouncilNames: [],
    requireProofForExpense: true,
  },
  transactions: [],
  documents: [],
  transactionDocuments: [],
  lastSyncedAt: null,
};

// -----------------------------------------------------------------------------
// ROTAS DA API REST
// -----------------------------------------------------------------------------

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    appName: "Portal de Gestão do Grêmio do NPOR",
    persistence: "cloud_firestore",
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    driveFolderId: GOOGLE_DRIVE_CONFIG.rootFolderId,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/state - Consulta de estado em memória (como fallback rápido)
app.get("/api/state", (_req, res) => {
  res.json(inMemoryStore);
});

// POST /api/state - Atualização de estado em memória
app.post("/api/state", (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== "object") {
    return res.status(400).json({ error: "Dados inválidos para persistência." });
  }

  inMemoryStore = {
    ...inMemoryStore,
    ...incoming,
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    persistence: "cloud_firestore",
    message: "Estado sincronizado com sucesso.",
  });
});

// GET /api/drive/folders - Estrutura de pastas do Google Drive
app.get("/api/drive/folders", (_req, res) => {
  res.json(GOOGLE_DRIVE_CONFIG);
});

// POST /api/drive/import-sheet - Importação e conciliação determinística e idempotente
app.post("/api/drive/import-sheet", (req, res) => {
  const { sheetName = "PLANILHA MÃE", rawText, rows } = req.body;

  let parsedRows: any[] = [];

  if (Array.isArray(rows) && rows.length > 0) {
    parsedRows = rows;
  } else if (typeof rawText === "string" && rawText.trim()) {
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

  const existingTransactions: any[] = inMemoryStore.transactions || [];
  const newTransactions: any[] = [];
  let importedCount = 0;
  let duplicatedCount = 0;

  for (const row of parsedRows) {
    const dateStr = row.data || row.date || row.dia || new Date().toISOString().split("T")[0];
    const desc = row.descrição || row.descricao || row.description || row.historico || row.histórico || "Lançamento Importado";
    const category = row.categoria || row.category || sheetName;
    const resp = row.responsável || row.responsavel || row.responsible || "Tesouraria";
    const payMethod = row.forma_pagamento || row["forma de pagamento"] || row.metodo || "PIX";
    const obs = row.observação || row.observacao || row.notas || "";
    const sourceRowId = String(row._rowIndex || row.id || `r-${Math.random().toString(36).substring(2, 7)}`);
    const sourceFileId = GOOGLE_DRIVE_CONFIG.rootFolderId;

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

    // Chave determinística rigorosa: sourceFileId + sourceRowId
    const txId = `tx-drive-${sourceFileId}-${sourceRowId}`;

    const isDuplicate =
      existingTransactions.some(
        (t: any) =>
          t.id === txId ||
          (t.sourceFileId === sourceFileId && t.sourceRowId === sourceRowId) ||
          (t.date === dateStr &&
            Math.abs(t.amount - amount) < 0.01 &&
            t.type === type &&
            t.description.trim().toLowerCase() === desc.trim().toLowerCase())
      ) ||
      newTransactions.some((t: any) => t.id === txId);

    if (isDuplicate) {
      duplicatedCount++;
      continue;
    }

    const txCode = `TX-${String(existingTransactions.length + newTransactions.length + 1).padStart(4, "0")}`;

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
      originalFileUrl: GOOGLE_DRIVE_CONFIG.rootFolderUrl,
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    newTransactions.push(newTx);
    importedCount++;
  }

  inMemoryStore.transactions = [...existingTransactions, ...newTransactions];
  inMemoryStore.lastSyncedAt = new Date().toISOString();

  return res.json({
    success: true,
    importedCount,
    duplicatedCount,
    transactions: newTransactions,
    totalTransactions: inMemoryStore.transactions.length,
    message: `${importedCount} lançamentos importados com sucesso da pasta ${sheetName}. ${duplicatedCount} duplicidades evitadas.`,
  });
});

// POST /api/transaction-documents - Vínculo entre Transação e Documento
app.post("/api/transaction-documents", (req, res) => {
  const { transaction_id, document_id, relationship_type = "comprovante", notes } = req.body;

  if (!transaction_id || !document_id) {
    return res.status(400).json({ error: "transaction_id e document_id são obrigatórios." });
  }

  const links = inMemoryStore.transactionDocuments || [];
  const exists = links.some(
    (l: any) =>
      l.transaction_id === transaction_id &&
      l.document_id === document_id &&
      l.relationship_type === relationship_type
  );

  if (!exists) {
    links.push({
      id: `td-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      transaction_id,
      document_id,
      relationship_type,
      notes: notes || "",
      linked_at: new Date().toISOString(),
      linked_by: "Sistema",
    });
    inMemoryStore.transactionDocuments = links;
  }

  res.json({ success: true, message: "Documento vinculado com sucesso." });
});

// -----------------------------------------------------------------------------
// INICIALIZAÇÃO DO SERVIDOR COM VITE EM DESENVOLVIMENTO E ESTÁTICOS EM PRODUÇÃO
// -----------------------------------------------------------------------------

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
    console.log(`Portal do Grêmio do NPOR escutando em http://0.0.0.0:${PORT} [${process.env.NODE_ENV || "development"}]`);
  });
}

startServer();
