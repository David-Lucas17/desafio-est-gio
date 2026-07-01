# Caderneta — Banco 🏦

Desafio técnico: um banco simples sobre conta corrente e conta poupança
com saque (obrigatório) e transferência (diferencial), seguindo as regras
de tarifa e cheque especial da especificação.

A interface foge do "form de CRUD" padrão: é uma **caderneta bancária**,
você escolhe uma conta na coluna a esquerda, ela abre como um
livro-razão a direita e cada operação bem-sucedida ou recusada recebe um
**carimbo de borracha** na página, como num banco de verdade.

## Stack

- **Backend**: Python 3.10+ com Flask (API HTTP em `/backend`).
- **Frontend**: HTML/CSS/JavaScript puro e sem framework (`/frontend`).

A API guarda as contas em memória (reinicia com dados de exemplo a cada
`python app.py`), não há banco de dados para configurar.

## Pré-requisitos

- Python 3.10 ou superior
- `pip`
- Qualquer servidor estático simples para o frontend (o próprio Python
  já serve, não precisa instalar nada novo)

## Passo a passo

### 1. Suba o backend (API)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

A API sobe em `http://localhost:5001`. Teste rapidamente:

```bash
curl http://localhost:5001/api/contas
```

### 2. Suba o frontend

Em outro terminal, na raiz do projeto:

```bash
cd frontend
python3 -m http.server 5501
```

Abra `http://localhost:5501` no navegador.

> O frontend está configurado para falar com a API em
> `http://localhost:5001/api` (veja `API_BASE` no topo de `frontend/app.js`).
> Se você rodar a API em outra porta/host, ajuste essa constante.

### 3. Use

1. Escolha uma das 4 contas de exemplo na coluna esquerda (2 correntes, 2
   poupanças, já com saldos diferentes para testar os limites).
2. A caderneta abre com saldo, tarifa/limite aplicáveis e o extrato.
3. Escolha a aba **Saque** ou **Transferência**, informe o valor (e a
   conta de destino, se for transferência) e confirme.
4. Acompanhe o carimbo na tela e o novo lançamento no extrato.

## Regras de negócio implementadas

Toda a regra fica isolada em `backend/models.py` (camada de domínio),
separada do transporte HTTP em `backend/app.py`:

- **Conta corrente**: cada saque/transferência cobra tarifa de R$ 1,00.
  O saldo pode ficar negativo até R$ 500,00 (valor + tarifa não pode
  ultrapassar esse limite).
- **Conta poupança**: sem tarifa. Saque/transferência são recusados se
  deixarem o saldo negativo.
- **Transferência** (diferencial): debita da conta de origem aplicando as
  mesmas regras acima, credita na conta de destino sem tarifa, e gera um
  lançamento em cada extrato.

## Endpoints da API

| Método | Rota                                | Descrição                          |
|--------|--------------------------------------|-------------------------------------|
| GET    | `/api/saude`                         | Healthcheck                         |
| GET    | `/api/contas`                        | Lista todas as contas               |
| GET    | `/api/contas/<id>`                   | Detalha uma conta                   |
| GET    | `/api/contas/<id>/extrato`           | Lista os lançamentos da conta       |
| POST   | `/api/contas/<id>/saque`             | `{ "valor": 100 }`                  |
| POST   | `/api/contas/<id>/transferencia`     | `{ "valor": 100, "destino": "id" }` |

Erros de regra de negócio voltam como `400` com `{ "erro": "..." }`;
conta inexistente volta como `404`.

## Estrutura do projeto

```
backend/
  app.py          # rotas HTTP, validação de entrada, tradução para JSON
  models.py        # Conta, Banco, regras de tarifa/limite (toda a logica)
  requirements.txt
frontend/
  index.html
  style.css        # identidade visual "caderneta de banco"
  app.js           # fetch + render, sem dependências
```

## Testes manuais rápidos

Com a API rodando:

```bash
# saque que estoura o cheque especial de uma conta corrente -> 400
curl -X POST localhost:5000/api/contas/cc-002/saque \
  -H "Content-Type: application/json" -d '{"valor": 1000}'

# saque que deixaria a poupança negativa -> 400
curl -X POST localhost:5000/api/contas/cp-002/saque \
  -H "Content-Type: application/json" -d '{"valor": 1000}'

# transferência válida entre corrente e poupança -> 200
curl -X POST localhost:5000/api/contas/cc-001/transferencia \
  -H "Content-Type: application/json" -d '{"valor": 50, "destino": "cp-001"}'
```
