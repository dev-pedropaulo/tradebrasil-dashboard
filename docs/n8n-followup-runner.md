# Runner n8n — Follow-up com IA Dinâmica (TradeBrasil)

O workflow pronto para importação no n8n está localizado em:
`template-agente/FOLLOWUP-RUNNER-IA-TRADEBRASIL.json`

Nome oficial: `[TRADEBRASIL] Follow-up Runner com IA Dinâmica`

---

## Como Funciona a Geração Dinâmica por IA (Opção 2)

Diferente de réguas antigas que repetem a mesma mensagem estática a cada mês (o que gera desgaste e queima o lead), este runner opera com **inteligência contextual**:

1. **A cada ciclo agendado (ex.: a cada 15, 30 ou 60 dias):**
   - O n8n localiza os eventos vencidos no NocoDB.
   - Carrega o cadastro atualizado do produtor (`nome`, `cultura_principal`, `volume_safra`, `volume_bois`, `estado`, `resumo_conversa`, data do último contato).
2. **Geração Inédita via GPT-4o:**
   - A IA gera uma mensagem de WhatsApp **100% inédita** de 1 a 3 frases curtas.
   - Conecta com a cultura e o estado do produtor (ex.: *"Oi Pedro, o mercado de soja deu uma respirada hoje e muitos produtores aí de MG estão aproveitando para cobrir o custo de adubo..."*).
   - Varia a saudação e o gancho temático, nunca soando como spam ou robô.
   - Termina com um convite leve para uma conversa rápida de 5 minutos com o consultor da mesa de operações.
3. **Disparo e Auditoria Completa:**
   - Envia via Evolution API na instância `Trade Brasil`.
   - Salva a mensagem **exata** gerada no histórico da tabela `events` do NocoDB, ficando visível para auditoria na aba **Follow-ups** do Dashboard.
4. **Reagendamento Automático da Cadência:**
   - Se for um plano recorrente, o runner agenda automaticamente o próximo ciclo para daqui a `recorrencia_dias` (ex.: +30 dias).
5. **Cancelamento Imediato por Resposta:**
   - Quando o produtor responder a qualquer mensagem desse follow-up, o webhook da Evolution aciona `/api/evolution-webhook` e desativa o plano na hora, passando o bastão para o Agente SDR de atendimento.

---

## Como Importar no n8n

1. Acesse o seu n8n (`https://agentesn8n-n8n.cqc86v.easypanel.host`).
2. Clique no menu superior direito `...` -> **Import from File**.
3. Selecione o arquivo `template-agente/FOLLOWUP-RUNNER-IA-TRADEBRASIL.json`.
4. Conecte a credencial do **OpenAI Chat Model** (`OpenAi account` / `O15aNB3icNpWMpEK`).
5. As requisições para o NocoDB e Evolution API já utilizam os tokens e URLs pré-configurados do ambiente TradeBrasil.
6. Ative o workflow.
