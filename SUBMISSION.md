# Minha Solução — Banco

## Stack
- **Backend:** Python 3.10+ com Flask 3.0
- **Frontend:** HTML/CSS/JS puro 

## Pré-requisitos / dependências
- Python 3.10 ou superior e `pip` instalados
- Frontend: só um navegador, sem dependências adicionais

## Como executar

### Backend (API)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
# API em http://localhost:5001
```

### Frontend
```bash
cd frontend
python3 -m http.server 5501
# abrir http://localhost:5501 no navegador
```

## Exemplo de uso
1. Abra `http://localhost:5501` com a API rodando.
2. Clique em uma conta na coluna esquerda para abrir a caderneta.
3. Na aba **Saque**, informe um valor e confirme, a tela mostra o resultado com um carimbo animado.
4. Na aba **Transferência**, escolha a conta de destino e o valor.
5. Operações inválidas (saldo insuficiente, limite do cheque especial) retornam erro com mensagem explicando.

## Observações
- Regras de negócio isoladas em `models.py`, separadas das rotas HTTP em `app.py`.
- Transferência adicionada como diferencial.
- Contas em memória — 4 contas de exemplo (2 correntes, 2 poupanças).