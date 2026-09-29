# Guia de Implantação: Agente Consultor TradeBrasil (n8n + WhatsApp)

Este guia resume a estrutura, configuração do banco de dados e passos para importar e ativar o workflow do agente de IA da **TradeBrasil**.

---

## 1. Arquivo do Workflow

O arquivo JSON pronto para importação no seu n8n está localizado em:
`template-agente/AGENTE-TRADEBRASIL-CONSULTOR.json`

---

## 2. Scripts SQL (PostgreSQL)

Execute estes comandos no PostgreSQL configurado na credencial do n8n (o mesmo banco onde está o buffer e a memória):

```sql
-- 1. Tabela para o Buffer Anti-Rajada do WhatsApp
CREATE TABLE IF NOT EXISTS message_buffer (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_buffer_phone_processed ON message_buffer(phone, processed);
CREATE INDEX IF NOT EXISTS idx_message_buffer_received_at ON message_buffer(received_at);

-- 2. Tabela para o Histórico de Memória do Agente (LangChain / n8n)
CREATE TABLE IF NOT EXISTS tradebrasil_n8n_chat_histories (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  message JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tb_chat_histories_session_id ON tradebrasil_n8n_chat_histories(session_id);
```

---

## 3. Campos no NocoDB (Tabela `Leads`)

As colunas de controle do agente e do follow-up já foram criadas na tabela `m6zmneu2vrp2vz5` (Base `pqidm66rx0b1wjb`):

| Coluna | Tipo | Finalidade |
|---|---|---|
| `em_atendimento` | Checkbox | Indica se o lead está em interação ativa com o agente |
| `aguardando_especialista` | Checkbox | Marcado como `true` assim que o produtor combina/aceita a ligação do consultor |
| `horario_agendado` | SingleLineText | Guarda o dia e horário combinado para a ligação (ex: *"Amanhã às 14h"*, *"Hoje às 16h"*) |
| `resumo_conversa` | LongText | Resumo atualizado do perfil do produtor, cultura, safra e objetivo |
| `followup_ultima_resposta_em` | DateTime | Registra o momento em que o lead respondeu, pausando réguas de follow-up ativas |

---

## 4. Integrações e Webhooks Configurados

### A. Webhook de Entrada (WhatsApp / Evolution API)
- **Path do Webhook no n8n:** `/webhook/sdr-tradebrasil`
- Configure na sua Evolution API (Instância `Trade Brasil`) o envio de eventos de mensagens recebidas (`messages.upsert`) para a URL do n8n gerada.

### B. Integração Automática com a Régua de Follow-up (Dashboard)
- O workflow possui o nó **`Notificar Dashboard TradeBrasil`**.
- Assim que o produtor responde a qualquer mensagem (seja de um follow-up antigo ou mensagem espontânea):
  1. O n8n dispara um `POST` para `https://tradebrasil-dashboard.vercel.app/api/evolution-webhook`.
  2. O dashboard da TradeBrasil cancela automaticamente a régua de follow-up ativa para aquele lead (`cancelamento_por_resposta`).
  3. Cancela qualquer disparo futuro agendado para o lead.
  4. Atualiza `followup_status = 'respondido'`.

---

## 5. Como Importar no n8n

1. Acesse o painel do seu n8n (`https://agentesn8n-n8n.cqc86v.easypanel.host`).
2. Clique no menu superior direito `...` -> **Import from File**.
3. Selecione o arquivo `template-agente/AGENTE-TRADEBRASIL-CONSULTOR.json`.
4. Vincule as credenciais existentes:
   - **Postgres:** Selecione sua credencial Postgres conectada ao banco do buffer/memória.
   - **NocoDB:** Selecione sua credencial NocoDB Token account (`tvXnAQ6fV0Cg8Bvw` ou correspondente).
   - **OpenAI:** Selecione sua credencial OpenAI para o modelo de chat e para a transcrição de áudio (Whisper).
5. Ative o workflow.
