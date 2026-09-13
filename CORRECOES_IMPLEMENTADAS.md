# Portal do Grêmio NPOR — correções implementadas

Esta versão foi ajustada para trabalhar com os dados reais do Google Drive do Grêmio, sem chatbot/assistente de IA no produto final.

## Principais correções

- Leitura recursiva do Google Drive preservando o caminho completo das subpastas.
- Suporte à PLANILHA MÃE em XLSX (`GRÊMIO NPOR (3) (1).xlsx`).
- Parser específico das abas reais: Resumo, Pagamento mensalidades, Rifas, Centralização Farda e Coturno, Camisas, Gastos, Confras, Delta, Gorro ferro e Festa Junina.
- Separação entre valores previstos e realizados.
- Dashboard/Tesouraria/Relatórios usam os totais reais do Resumo quando disponíveis.
- OCR automático de imagens com Tesseract e tentativa de leitura/OCR de PDFs.
- Identificação automática de valor, data, recebedor/fornecedor e finalidade quando presentes no comprovante.
- Criação automática de lançamento a partir de comprovante financeiro com valor identificado.
- Criação dinâmica de categorias reais dentro de `CUSTOS ADICIONAIS` (ex.: `MATERIAL PONTE BAILEY`, `MATERIAL LIMPEZA`, `REFORMA NPOR`).
- Preservação do vínculo entre lançamento e arquivo original do Drive.
- Sincronização idempotente por File ID / origem para reduzir duplicidades.
- Remoção do endpoint falso de análise por Gemini e de valores/fornecedores fictícios.
- Auditoria automática passa a reconstruir alertas automáticos e não manter pendências antigas que já foram resolvidas.
- Estado persistido compacta o texto bruto de OCR para evitar exceder limites de armazenamento.
- Regras Firestore ajustadas para exigir usuário autenticado.

## Conferência da PLANILHA MÃE atual

Com a versão da planilha consultada em 04/09/2026, a aba `Resumo` informa/reconcilia:

- Arrecadação real total: R$ 75.818,31
- Gastos reais consolidados: R$ 58.009,09
- Saldo real da conta do Grêmio: R$ 17.809,22

Esses números são apenas uma referência de validação da versão atual da planilha. O aplicativo deve recalculá-los a cada nova sincronização com o Drive.

## Teste recomendado após importar no Google AI Studio

1. Abra o projeto já conectado ao Firebase `gremio-npor`.
2. Conecte a conta Google com permissão de leitura do Drive/Sheets.
3. A sincronização deve iniciar automaticamente após a conexão.
4. Confira se o Painel Geral mostra o saldo da PLANILHA MÃE.
5. Em `Projetos e Categorias`, confira a criação de `Material Ponte Bailey` quando os documentos dessa subpasta forem processados.
6. Sincronize novamente e confirme que os mesmos documentos/lançamentos não são duplicados.
