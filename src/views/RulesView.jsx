import { ViewHead } from "../components/layout.jsx";

export function RulesView() {
  const sections = [
    ["O estouro (saque inicial)", ["As bolas que caem no estouro não definem o grupo de ninguém.", "O grupo (pares ou ímpares) só é decidido pela primeira bola encaçapada depois do estouro.", "Se no estouro o jogador encaçapar uma bola e também a branca: passa a vez e cai uma bola do adversário."]],
    ["Definindo o grupo", ["Depois do estouro, a primeira bola que você encaçapa define seu grupo: caiu uma par, você joga com as pares; caiu uma ímpar, joga com as ímpares.", "O adversário fica automaticamente com o outro grupo."]],
    ["A bola 1 (o trunfo)", ["A bola 1 só pode ser encaçapada depois que você derrubar todas as suas bolas.", "Derrubar a bola 1 fora de hora = perde a partida na hora.", "Branca + bola 1 na mesma tacada: se o adversário ainda tiver mais de uma bola na mesa, ele ganha uma tacada pra encaçapar todas as restantes."]],
    ["Faltas e a penalidade", ["Penalidade da falta: o juiz derruba a menor bola do adversário que ainda está na mesa.", "Encaçapar a branca (scratch): cai 1 bola do adversário.", "Jogar a branca pra fora da mesa: cai 1 bola do adversário.", "Não acertar nenhuma bola na tacada: cai 1 bola do adversário.", "Acertar primeiro a bola do adversário (direto, sem tabela): caem 2 bolas do adversário."]],
    ["Bola pra fora", ["Bola par/ímpar derrubada pra fora da mesa volta colada na tabela, perto de onde saiu."]],
    ["Como marcar no app", ["A primeira bola 2 a 15 marcada define os grupos de pares e ímpares.", "Depois disso, toque na bola do jogador quando ela cair; ela sai do rack para mostrar o que ainda falta.", "Quando um jogador zera o grupo, a bola 1 aparece no rack dele; tocar ali encerra com vitória desse jogador.", "Se a bola 1 cair antes da hora, toque na bola 1 central e informe quem derrubou.", "Se marcar errado, use Desfazer no histórico da partida."]],
  ];
  return (
    <>
      <ViewHead eyebrow="como joga" title="Regras"><div className="rank-sub rules-subtitle">Sinuquinha — regra suja, no estilo Baianinho de Mauá.</div></ViewHead>
      <div className="rules-grid">
        {sections.map(([title, items]) => (
          <div className="card" key={title}>
            <div className="eyebrow rules-title">{title}</div>
            {items.map((item) => <div className="rule-line" key={item}><span>▸</span><span>{item}</span></div>)}
          </div>
        ))}
      </div>
    </>
  );
}
