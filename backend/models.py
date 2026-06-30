
from dataclasses import dataclass, field
from datetime import datetime
from itertools import count

TARIFA_OPERACAO = 1.00
LIMITE_CHEQUE_ESPECIAL = 500.00

_ledger_ids = count(1)


class OperacaoInvalida(Exception):
    pass


@dataclass
class Lancamento:
    id: int
    tipo: str            
    valor: float
    tarifa: float
    saldo_apos: float
    timestamp: str
    detalhe: str = ""

    def to_dict(self):
        return {
            "id": self.id,
            "tipo": self.tipo,
            "valor": round(self.valor, 2),
            "tarifa": round(self.tarifa, 2),
            "saldo_apos": round(self.saldo_apos, 2),
            "timestamp": self.timestamp,
            "detalhe": self.detalhe,
        }


@dataclass
class Conta:
    id: str
    titular: str
    tipo: str            
    saldo: float
    extrato: list = field(default_factory=list)

    @property
    def cobra_tarifa(self) -> bool:
        return self.tipo == "corrente"

    @property
    def limite_negativo(self) -> float:
        return LIMITE_CHEQUE_ESPECIAL if self.tipo == "corrente" else 0.0

    def registrar(self, tipo, valor, tarifa, detalhe=""):
        lanc = Lancamento(
            id=next(_ledger_ids),
            tipo=tipo,
            valor=valor,
            tarifa=tarifa,
            saldo_apos=self.saldo,
            timestamp=datetime.now().isoformat(timespec="seconds"),
            detalhe=detalhe,
        )
        self.extrato.insert(0, lanc)
        return lanc

    def validar_e_debitar(self, valor: float):
        if valor <= 0:
            raise OperacaoInvalida("O valor da operacao deve ser maior que zero.")

        tarifa = TARIFA_OPERACAO if self.cobra_tarifa else 0.0
        total = valor + tarifa
        saldo_projetado = self.saldo - total

        if saldo_projetado < -self.limite_negativo:
            if self.tipo == "poupanca":
                raise OperacaoInvalida(
                    "Saldo insuficiente. Conta poupanca nao permite saldo negativo."
                )
            raise OperacaoInvalida(
                f"Saldo insuficiente. O limite do cheque especial e de "
                f"R$ {self.limite_negativo:.2f} e essa operacao o ultrapassaria."
            )

        self.saldo = saldo_projetado
        return tarifa

    def sacar(self, valor: float) -> Lancamento:
        tarifa = self.validar_e_debitar(valor)
        return self.registrar("saque", valor, tarifa)

    def debitar_para_transferencia(self, valor: float, destino_id: str) -> Lancamento:
        tarifa = self.validar_e_debitar(valor)
        return self.registrar(
            "transferencia_saida", valor, tarifa, detalhe=f"para {destino_id}"
        )

    def creditar_transferencia(self, valor: float, origem_id: str) -> Lancamento:
        self.saldo += valor
        return self.registrar(
            "transferencia_entrada", valor, 0.0, detalhe=f"de {origem_id}"
        )

    def to_dict(self):
        return {
            "id": self.id,
            "titular": self.titular,
            "tipo": self.tipo,
            "saldo": round(self.saldo, 2),
            "limite_negativo": self.limite_negativo,
            "cobra_tarifa": self.cobra_tarifa,
        }


class Banco:

    def __init__(self):
        self._contas = {}

    def seed(self, contas: list[Conta]):
        for conta in contas:
            self._contas[conta.id] = conta
        return self

    def listar(self):
        return list(self._contas.values())

    def obter(self, conta_id: str) -> Conta:
        conta = self._contas.get(conta_id)
        if conta is None:
            raise KeyError(conta_id)
        return conta

    def sacar(self, conta_id: str, valor: float) -> Lancamento:
        return self.obter(conta_id).sacar(valor)

    def transferir(self, origem_id: str, destino_id: str, valor: float):
        if origem_id == destino_id:
            raise OperacaoInvalida("Nao e possivel transferir para a mesma conta.")
        origem = self.obter(origem_id)
        destino = self.obter(destino_id)  
        lanc_saida = origem.debitar_para_transferencia(valor, destino_id)
        lanc_entrada = destino.creditar_transferencia(valor, origem_id)
        return lanc_saida, lanc_entrada
