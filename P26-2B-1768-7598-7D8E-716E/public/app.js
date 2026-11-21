const $ = (s) => document.querySelector(s);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
const SHIPS = [["Porta-aviões", 5], ["Encouraçado", 4], ["Cruzador", 3], ["Submarino", 3], ["Destroyer", 2]];
const SIZE = Object.fromEntries(SHIPS);
const app = $("#app");
let fleet = [], sel = 0, orient = "H", gameId = null;

async function api(path, body) {
  const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  const d = await r.json().catch(() => null);
  if (d === null) throw new Error("Resposta inválida do servidor: a API pode não estar publicada");
  if (!r.ok) throw new Error(d.erro || "Erro " + r.status);
  return d;
}
const cellsOf = (s) => Array.from({ length: SIZE[s.name] }, (_, i) => [s.r + (s.o === "V" ? i : 0), s.c + (s.o === "H" ? i : 0)]);

function board(onClick, onHover) {
  const root = el("div", "board"), cells = [];
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const b = el("button", "cell");
    b.type = "button";
    b.setAttribute("aria-label", `Linha ${r + 1}, coluna ${c + 1}`);
    if (onClick) b.onclick = () => onClick(r, c);
    if (onHover) { b.onmouseenter = b.onfocus = () => onHover(r, c); b.onmouseleave = b.onblur = () => onHover(-1, -1); }
    cells.push(b); root.append(b);
  }
  return { root, at: (r, c) => cells[r * 10 + c], cells };
}

function avatar(u) {
  const i = el("img"); i.alt = "";
  i.src = u.avatar ? `https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png?size=64` : "https://cdn.discordapp.com/embed/avatars/0.png";
  return i;
}

function login() {
  app.replaceChildren();
  const box = el("div", "center");
  const a = el("a"); a.href = "/api/auth/login";
  a.append(el("button", "primary", "Entrar com Discord"));
  box.append(el("h2", null, "Comande sua frota"), el("p", null, "Entre com o Discord para jogar e entrar no placar."), a);
  app.append(box);
}

function placing() {
  app.replaceChildren();
  const msg = el("p", "msg");
  const list = el("div", "ships");
  const ok = el("button", "primary", "Confirmar frota");
  const rot = el("button", null, "Girar: horizontal");
  const bd = board(click, hover);
  const draw = () => {
    bd.cells.forEach((c) => { c.className = "cell"; });
    fleet.forEach((s) => cellsOf(s).forEach(([r, c]) => bd.at(r, c).classList.add("ship")));
    list.replaceChildren();
    SHIPS.forEach(([n, z], i) => {
      const b = el("button", fleet.some((s) => s.name === n) ? "done" : "", `${n} (${z})`);
      b.setAttribute("aria-pressed", i === sel); b.onclick = () => { sel = i; draw(); };
      list.append(b);
    });
    ok.disabled = fleet.length !== 5;
  };
  const fits = (name, r, c) => {
    const cs = cellsOf({ name, r, c, o: orient });
    const used = new Set(fleet.filter((s) => s.name !== name).flatMap(cellsOf).map(([a, b]) => a * 10 + b));
    return { cs, valid: cs.every(([a, b]) => a < 10 && b < 10 && !used.has(a * 10 + b)) };
  };