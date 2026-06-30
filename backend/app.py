
from flask import Flask, jsonify, request
from flask_cors import CORS

from models import Banco, Conta, OperacaoInvalida

app = Flask(__name__)
CORS(app)

banco = Banco().seed([
    Conta(id="cc-001", titular="Ana Ferreira", tipo="corrente", saldo=850.00),
    Conta(id="cc-002", titular="Bruno Tavares", tipo="corrente", saldo=120.00),
    Conta(id="cp-001", titular="Carla Nogueira", tipo="poupanca", saldo=2300.00),
    Conta(id="cp-002", titular="Diego Martins", tipo="poupanca", saldo=75.00),
])


def erro(mensagem, status=400):
    return jsonify({"erro": mensagem}), status


@app.errorhandler(404)
def not_found(_e):
    return erro("Recurso nao encontrado.", 404)


@app.get("/api/saude")
def saude():
    return jsonify({"status": "ok", "servico": "banco-api"})


@app.get("/api/contas")
def listar_contas():
    return jsonify([c.to_dict() for c in banco.listar()])


@app.get("/api/contas/<conta_id>")
def detalhar_conta(conta_id):
    try:
        conta = banco.obter(conta_id)
    except KeyError:
        return erro(f"Conta '{conta_id}' nao encontrada.", 404)
    return jsonify(conta.to_dict())


@app.get("/api/contas/<conta_id>/extrato")
def extrato(conta_id):
    try:
        conta = banco.obter(conta_id)
    except KeyError:
        return erro(f"Conta '{conta_id}' nao encontrada.", 404)
    return jsonify([l.to_dict() for l in conta.extrato])


def ler_valor(payload):
    if not payload or "valor" not in payload:
        raise OperacaoInvalida("Informe o campo 'valor'.")
    try:
        valor = float(payload["valor"])
    except (TypeError, ValueError):
        raise OperacaoInvalida("O campo 'valor' deve ser numerico.")
    return valor


@app.post("/api/contas/<conta_id>/saque")
def sacar(conta_id):
    payload = request.get_json(silent=True)
    try:
        valor = ler_valor(payload)
        lancamento = banco.sacar(conta_id, valor)
        conta = banco.obter(conta_id)
    except KeyError:
        return erro(f"Conta '{conta_id}' nao encontrada.", 404)
    except OperacaoInvalida as e:
        return erro(str(e))

    return jsonify({
        "mensagem": "Saque realizado com sucesso.",
        "lancamento": lancamento.to_dict(),
        "conta": conta.to_dict(),
    })


@app.post("/api/contas/<conta_id>/transferencia")
def transferir(conta_id):
    payload = request.get_json(silent=True)
    if not payload or "destino" not in payload:
        return erro("Informe o campo 'destino' (id da conta de destino).")

    try:
        valor = ler_valor(payload)
        lanc_saida, _ = banco.transferir(conta_id, payload["destino"], valor)
        conta = banco.obter(conta_id)
    except KeyError as e:
        return erro(f"Conta '{e.args[0]}' nao encontrada.", 404)
    except OperacaoInvalida as e:
        return erro(str(e))

    return jsonify({
        "mensagem": f"Transferencia para {payload['destino']} realizada com sucesso.",
        "lancamento": lanc_saida.to_dict(),
        "conta": conta.to_dict(),
    })


if __name__ == "__main__":
    app.run(debug=True, port=5001)
