import React, { useMemo, useState } from "react";
import "./Masterlar.css";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from "recharts";

const fmtMoney = (n) =>
  `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// ===================== DADOS FIXOS =====================
const FIXED = {
  // Totais gerais
  totalValorTotal: 5038593.39,
  totalRateado: 1119237.21,
  totalPorMesValorTotal: { 6: 1871701.66, 7: 1916514.70, 8: 1250373.35 },
  totalPorMesRateado: { 6: 427639.02, 7: 376640.76, 8: 314674.04 },

  // === CUSTO (RATEADO) ===
  // Observação: "FARIAS BRITO" será padronizado para "Matriz"
  gastoPorFilial: {
    6: [
      { filial: "FARIAS BRITO", valor: 146990.3 },
      { filial: "N OLINDA", valor: 48387.72 },
      { filial: "PRIME", valor: 47441.59 },
      { filial: "ALENCAR", valor: 44589.29 },
      { filial: "ALTANEIRA", valor: 40044.64 },
      { filial: "CHORÓ", valor: 39237.01 },
      { filial: "P DA SERRA", valor: 37978.84 },
      { filial: "BANABUIU", valor: 22969.63 },
    ],
    7: [
      { filial: "FARIAS BRITO", valor: 98392.65 },
      { filial: "BANABUIU", valor: 51794.28 },
      { filial: "N OLINDA", valor: 50668.25 },
      { filial: "CHORÓ", valor: 45972.19 },
      { filial: "ALTANEIRA", valor: 45279.8 },
      { filial: "PRIME", valor: 42522.73 },
      { filial: "ALENCAR", valor: 42294.25 },
    ],
    8: [
      { filial: "FARIAS BRITO", valor: 114692.04 },
      { filial: "N OLINDA", valor: 46846.54 },
      { filial: "P DA SERRA", valor: 46655.7 },
      { filial: "BANABUIU", valor: 46467.72 },
      { filial: "ALENCAR", valor: 46026.25 },
      { filial: "ALTANEIRA", valor: 13124.39 },
      { filial: "PRIME", valor: 861.4 },
    ],
  },

  // === METAS (mensais por filial) ===
  // Importante: consideramos "Matriz" como Farias Brito.
  metaBasePorFilial: {
    "Matriz": 300000,
    "Prime": 200000,
    "Altaneira": 200000,
    "Choro": 200000,
    "Ponta da Serra": 160000,
    "Alencar": 160000,
    "Banabuiu": 200000,
    "Nova Olinda": 200000,
    "Varzea Alegre": 300000,
  },
  metaPorMes: { 6: {}, 7: {}, 8: {} }, // se variar por mês, preencha aqui

  // === FATURAMENTO (seus dados) ===
  faturamentoPorFilial: {
    6: [
      { filial: "Matriz", valor: 201194.98 },
      { filial: "Prime", valor: 119177.02 },
      { filial: "Altaneira", valor: 114732.84 },
      { filial: "Choro", valor: 100631.57 },
      { filial: "Ponta da Serra", valor: 100721.25 },
      { filial: "Alencar", valor: 74967.82 },
      { filial: "Banabuiu", valor: 122867.02 },
      { filial: "Nova Olinda", valor: 90964.41 },
      { filial: "Varzea Alegre", valor: 0 },
      { filial: "DEPOSITO NUNIS", valor: 458.33 },
      { filial: "CDM", valor: 21269.39 },
    ],
    7: [
      { filial: "Matriz", valor: 193731.96 },
      { filial: "Prime", valor: 118486.77 },
      { filial: "Altaneira", valor: 108923.83 },
      { filial: "Choro", valor: 95262.74 },
      { filial: "Ponta da Serra", valor: 97501.73 },
      { filial: "Alencar", valor: 70437.15 },
      { filial: "Banabuiu", valor: 122352.59 },
      { filial: "Nova Olinda", valor: 88791.31 },
      { filial: "Varzea Alegre", valor: 0 },
      { filial: "DEPOSITO NUNIS", valor: 458.10 },
      { filial: "CDM", valor: 16759.08 },
    ],
    8: [
      { filial: "Matriz", valor: 159632.38 },
      { filial: "Prime", valor: 103482.00 },
      { filial: "Altaneira", valor: 96937.89 },
      { filial: "Choro", valor: 78019.58 },
      { filial: "Ponta da Serra", valor: 78904.75 },
      { filial: "Alencar", valor: 51238.17 },
      { filial: "Banabuiu", valor: 99099.24 },
      { filial: "Nova Olinda", valor: 71815.72 },
      { filial: "Varzea Alegre", valor: 0 },
      { filial: "DEPOSITO NUNIS", valor: 0 },
      { filial: "CDM", valor: 12971.29 },
    ],
  },
};

// ===================== PADRONIZAÇÃO DE NOMES =====================
// Canoniza variações e faz o mapeamento "FARIAS BRITO" -> "Matriz"
const CANON_LABEL = {
  "FARIAS BRITO": "Matriz",
  "N OLINDA": "Nova Olinda",
  "CHORÓ": "Choro",
  "P DA SERRA": "Ponta da Serra",
  "BANABUIU": "Banabuiu",
  "ALTANEIRA": "Altaneira",
  "ALENCAR": "Alencar",
  "PRIME": "Prime",
  // já canônicos:
  "Matriz": "Matriz",
  "Prime": "Prime",
  "Altaneira": "Altaneira",
  "Choro": "Choro",
  "Ponta da Serra": "Ponta da Serra",
  "Alencar": "Alencar",
  "Banabuiu": "Banabuiu",
  "Nova Olinda": "Nova Olinda",
  "Varzea Alegre": "Varzea Alegre",
  "DEPOSITO NUNIS": "DEPOSITO NUNIS",
  "CDM": "CDM",
};
const normalize = (name) => CANON_LABEL[name] || name;

// Normaliza custo
FIXED.gastoPorFilial = Object.fromEntries(
  Object.entries(FIXED.gastoPorFilial).map(([mes, itens]) => [
    mes,
    itens.map(({ filial, valor }) => ({ filial: normalize(filial), valor })),
  ])
);
// Normaliza faturamento
FIXED.faturamentoPorFilial = Object.fromEntries(
  Object.entries(FIXED.faturamentoPorFilial).map(([mes, itens]) => [
    mes,
    itens.map(({ filial, valor }) => ({ filial: normalize(filial), valor })),
  ])
);
// Normaliza metas (chaves)
if (FIXED.metaBasePorFilial) {
  FIXED.metaBasePorFilial = Object.fromEntries(
    Object.entries(FIXED.metaBasePorFilial).map(([filial, v]) => [
      normalize(filial),
      v,
    ])
  );
}
// Garante meta (0) para quem só aparece em custo/fat
const ALL_CANON_FROM_DATA = new Set([
  ...Object.values(FIXED.gastoPorFilial).flat().map((i) => i.filial),
  ...Object.values(FIXED.faturamentoPorFilial).flat().map((i) => i.filial),
  ...Object.keys(FIXED.metaBasePorFilial || {}),
]);
ALL_CANON_FROM_DATA.forEach((f) => {
  if (!(f in (FIXED.metaBasePorFilial || {}))) {
    FIXED.metaBasePorFilial[f] = 0;
  }
});

// ===================== AUXILIARES =====================
const MESES = Object.keys(FIXED.totalPorMesValorTotal)
  .map(Number)
  .sort((a, b) => a - b);

const arr = (v) => (Array.isArray(v) ? v : {});
const asArr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === "object" ? v : {});

// Paleta de cores
const COLOR_PALETTE = ["#2a6db5ff","#ef8215ff","#9c0c0eff","#4bc1b7ff","#2bb618ff","#dfb51eff","#f19edbff","#a91468ff","#d37e4dff","#b17e26ff"];

// Todas as filiais (já canônicas)
const ALL_FILIAIS = Array.from(ALL_CANON_FROM_DATA).sort((a, b) => a.localeCompare(b));

// ===================== COMPONENTE =====================
export default function MasterLarDashboard({ topFiliais = 8 }) {
  const [mesSelecionado, setMesSelecionado] = useState(null);
  const [filialSelecionada, setFilialSelecionada] = useState("Todas");

  const filiaisDisponiveis = useMemo(() => ["Todas", ...ALL_FILIAIS], []);

  // Cores
  const colorByFilial = useMemo(() => {
    const map = {};
    ALL_FILIAIS.forEach((f, i) => (map[f] = COLOR_PALETTE[i % COLOR_PALETTE.length]));
    return map;
  }, []);

  // ===== Helpers de totais/agrupamentos =====
  const mesesEscopo = useMemo(
    () => (mesSelecionado ? [mesSelecionado] : MESES),
    [mesSelecionado]
  );

  const somaFonteMeses = (fonte) =>
    mesesEscopo.reduce(
      (s, m) => s + asArr(fonte[m]).reduce((a, i) => a + Number(i.valor || 0), 0),
      0
    );

  const totalFaturamento = useMemo(
    () => somaFonteMeses(FIXED.faturamentoPorFilial),
    [mesesEscopo]
  );
  const totalCusto = useMemo(
    () => somaFonteMeses(FIXED.gastoPorFilial),
    [mesesEscopo]
  );
  // Meta total (soma mensal das filiais; não depende de mês)
  const totalMeta = useMemo(
    () => Object.values(FIXED.metaBasePorFilial || {}).reduce((s, v) => s + Number(v || 0), 0),
    []
  );

  // Listas por mês (mostram sempre os meses existentes)
  const faturamentoPorMes = useMemo(
    () => MESES.map((m) => ({
      mes: m,
      valor: asArr(FIXED.faturamentoPorFilial[m]).reduce((a, i) => a + Number(i.valor || 0), 0),
    })),
    []
  );
  const custoPorMes = useMemo(
    () => MESES.map((m) => ({
      mes: m,
      valor: asArr(FIXED.gastoPorFilial[m]).reduce((a, i) => a + Number(i.valor || 0), 0),
    })),
    []
  );

  // Meta por filial (mensal)
  const metaPorFilial = useMemo(() => {
    let base = Object.entries(FIXED.metaBasePorFilial || {}).map(
      ([filial, valor]) => ({ filial, valor: Number(valor || 0) })
    );
    if (filialSelecionada !== "Todas") base = base.filter((i) => i.filial === filialSelecionada);
    return base.sort((a, b) => a.filial.localeCompare(b.filial));
  }, [filialSelecionada]);

  // Faturamento por filial (no período selecionado)
  const faturamentoPorFilial = useMemo(() => {
    const acc = {};
    mesesEscopo.forEach((m) =>
      asArr(FIXED.faturamentoPorFilial[m]).forEach(({ filial, valor }) => {
        acc[filial] = (acc[filial] || 0) + Number(valor || 0);
      })
    );
    let list = Object.entries(acc).map(([filial, valor]) => ({ filial, valor }));
    if (filialSelecionada !== "Todas") list = list.filter((i) => i.filial === filialSelecionada);
    return list.sort((a, b) => b.valor - a.valor);
  }, [mesesEscopo, filialSelecionada]);

  // === pizza (participação do CUSTO) ===
  const { pieData } = useMemo(() => {
    let itens = [];
    if (mesSelecionado) {
      itens = asArr(FIXED.gastoPorFilial[mesSelecionado]).map(({ filial, valor }) => ({ filial, valor }));
    } else {
      const acc = {};
      MESES.forEach((m) => {
        asArr(FIXED.gastoPorFilial[m]).forEach(({ filial, valor }) => {
          acc[filial] = (acc[filial] || 0) + Number(valor || 0);
        });
      });
      itens = Object.entries(acc).map(([filial, valor]) => ({ filial, valor }));
    }
    if (filialSelecionada !== "Todas") itens = itens.filter((i) => i.filial === filialSelecionada);
    itens.sort((a, b) => b.valor - a.valor);
    return { pieData: itens.map((i) => ({ name: i.filial, value: i.valor })) };
  }, [mesSelecionado, filialSelecionada]);

  // === barras empilhadas (CUSTO) ===
  const stackedData = useMemo(() => {
    const meses = mesSelecionado ? [mesSelecionado] : MESES;
    const custoFiliais = Array.from(
      new Set(Object.values(FIXED.gastoPorFilial).flat().map((i) => i.filial))
    );
    const topList = filialSelecionada === "Todas" ? custoFiliais.slice(0, topFiliais) : [filialSelecionada];
    return meses.map((m) => {
      const base = { mes: m };
      asArr(FIXED.gastoPorFilial[m]).forEach(({ filial, valor }) => {
        if (filialSelecionada !== "Todas" && filial !== filialSelecionada) return;
        if (topList.includes(filial)) base[filial] = (base[filial] || 0) + Number(valor || 0);
      });
      return base;
    });
  }, [mesSelecionado, filialSelecionada, topFiliais]);

  const filialKeys = useMemo(() => {
    const keys = new Set();
    stackedData.forEach((row) => Object.keys(row).forEach((k) => k !== "mes" && keys.add(k)));
    return Array.from(keys);
  }, [stackedData]);

  // === helpers de meta ===
  const getMeta = (filial, mes) => {
    const metasMes = FIXED.metaPorMes?.[mes];
    if (metasMes && metasMes[filial] != null) return Number(metasMes[filial]);
    return Number(FIXED.metaBasePorFilial?.[filial] || 0);
  };

  // === LINHA (evolução do CUSTO) ===
  const scopeFiliais = useMemo(
    () =>
      filialSelecionada === "Todas"
        ? Array.from(new Set(Object.values(FIXED.gastoPorFilial).flat().map((i) => i.filial)))
        : [filialSelecionada],
    [filialSelecionada]
  );

  // === COMPARATIVO Meta x Faturamento x Custo ===
  const comparativoData = useMemo(() => {
    const meses = mesSelecionado ? [mesSelecionado] : MESES;

    const soma = (fontePorMes) => {
      const acc = {};
      meses.forEach((m) => {
        asArr(fontePorMes[m]).forEach(({ filial, valor }) => {
          acc[filial] = (acc[filial] || 0) + Number(valor || 0);
        });
      });
      return acc;
    };

    const fat = soma(FIXED.faturamentoPorFilial);
    const custo = soma(FIXED.gastoPorFilial);

    const meta = {};
    meses.forEach((m) => {
      ALL_FILIAIS.forEach((f) => {
        meta[f] = (meta[f] || 0) + getMeta(f, m);
      });
    });

    const filiais = filialSelecionada === "Todas" ? ALL_FILIAIS : [filialSelecionada];

    const linhas = filiais.map((f) => ({
      filial: f,
      meta: meta[f] || 0,
      faturamento: fat[f] || 0,
      custo: custo[f] || 0,
    }));

    linhas.sort((a, b) => b.faturamento - a.faturamento);
    return linhas;
  }, [mesSelecionado, filialSelecionada]);

  // Para tabela (% e margem)
  const comparativoTabela = useMemo(
    () =>
      comparativoData.map((r) => ({
        ...r,
        atingFatMeta: r.meta ? r.faturamento / r.meta : 0,
        pctCustoMeta: r.meta ? r.custo / r.meta : 0,
        pctCustoFat: r.faturamento ? r.custo / r.faturamento : 0,
        margem: r.faturamento - r.custo,
      })),
    [comparativoData]
  );

  // ========== RENDER ==========
  return (
    <div className="ml-container">
      <header className="ml-header">
        <h1>Painel MasterLar</h1>
        <p>Visão consolidada de execução por filial e período</p>
      </header>

      {/* === CARDS === */}
      <section className="ml-cards">
        <div className="ml-card">
          <span className="ml-label">Meta total (mensal, soma das filiais)</span>
          <strong className="ml-value">{fmtMoney(totalMeta)}</strong>
        </div>

        <div className="ml-card">
          <span className="ml-label">
            Faturamento total {mesSelecionado ? `(mês ${mesSelecionado})` : "(todos)"}
          </span>
          <strong className="ml-value">{fmtMoney(totalFaturamento)}</strong>
        </div>

        <div className="ml-card">
          <span className="ml-label">
            Custo total (Rateado) {mesSelecionado ? `(mês ${mesSelecionado})` : "(todos)"}
          </span>
          <strong className="ml-value accent">{fmtMoney(totalCusto)}</strong>
        </div>

        <div className="ml-card">
          <span className="ml-label">Faturamento por mês</span>
          <ul className="ml-years">
            {faturamentoPorMes.map(({ mes, valor }) => (
              <li key={`fat-${mes}`}>
                <b>{String(mes).padStart(2, "0")}</b> — {fmtMoney(valor)}
              </li>
            ))}
          </ul>
        </div>

        <div className="ml-card">
          <span className="ml-label">Custo (Rateado) por mês</span>
          <ul className="ml-years">
            {custoPorMes.map(({ mes, valor }) => (
              <li key={`cus-${mes}`}>
                <b>{String(mes).padStart(2, "0")}</b> — {fmtMoney(valor)}
              </li>
            ))}
          </ul>
        </div>

        <div className="ml-card">
          <span className="ml-label">Selecionar mês</span>
          <div className="ml-months">
            <button
              className={`ml-btn ${mesSelecionado === null ? "active" : ""}`}
              onClick={() => setMesSelecionado(null)}
            >
              Todos
            </button>
            {MESES.map((m) => (
              <button
                key={m}
                className={`ml-btn ${mesSelecionado === m ? "active" : ""}`}
                onClick={() => setMesSelecionado(m)}
              >
                {m.toString().padStart(2, "0")}
              </button>
            ))}
          </div>

          <div className="ml-filter-row">
            <label className="ml-label">Filtrar por loja (filial)</label>
            <select
              className="ml-select"
              value={filialSelecionada}
              onChange={(e) => setFilialSelecionada(e.target.value)}
            >
              {filiaisDisponiveis.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ml-card">
          <span className="ml-label">Atingimento médio (Fat ÷ Meta)</span>
          <strong className="ml-value">
            {(() => {
              const v = comparativoData;
              const num = v.reduce((s, i) => s + (i.meta ? i.faturamento / i.meta : 0), 0);
              const den = v.filter((i) => i.meta > 0).length || 1;
              return (num / den).toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 1 });
            })()}
          </strong>
        </div>
      </section>

      {/* === BARRAS (CUSTO) === */}
      <section className="ml-grid">
        <div className="ml-panel flat">
          <h2>Executado por Filial — {mesSelecionado ? `Mês ${mesSelecionado}` : "Todos os meses"}</h2>
          <div className="ml-chart">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={stackedData}>
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Legend />
                {filialKeys.map((k) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    stackId="a"
                    fill={colorByFilial[k]}
                    stroke={colorByFilial[k]}
                    fillOpacity={0.9}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* === PIZZA (CUSTO) === */}
        <div className="ml-panel flat">
          <h2>Participação das Filiais (%)</h2>
          <div className="ml-chart">
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={120}
                  label={false}
                  labelLine={false}
                  stroke="none"
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={colorByFilial[d.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ====== LISTAS POR FILIAL ====== */}
      <section className="ml-grid">
        <div className="ml-panel flat">
          <h2>Meta por filial (mensal)</h2>
          <ul className="ml-list">
            {metaPorFilial.map((i) => (
              <li key={i.filial}>
                <span>{i.filial}</span>
                <b>{fmtMoney(i.valor)}</b>
              </li>
            ))}
          </ul>
        </div>

        <div className="ml-panel flat">
          <h2>Faturamento por filial — {mesSelecionado ? `mês ${mesSelecionado}` : "todos os meses"}</h2>
          <ul className="ml-list">
            {faturamentoPorFilial.map((i) => (
              <li key={i.filial}>
                <span>{i.filial}</span>
                <b>{fmtMoney(i.valor)}</b>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* === LINHAS (evolução do CUSTO) === */}
      <section className="ml-grid single">
        <div className="ml-panel flat">
          <div className="ml-panel-row">
            <h2>Evolução mensal por filial (Rateado)</h2>
            <div className="ml-avg">
              <span className="ml-avg-label">
                Média {mesSelecionado ? `do mês ${mesSelecionado}` : "geral"}
              </span>
              <strong className="ml-avg-value">
                {fmtMoney(
                  (() => {
                    if (mesSelecionado) {
                      const lista = asArr(FIXED.gastoPorFilial[mesSelecionado]);
                      if (!lista.length) return 0;
                      const soma = lista.reduce((s, i) => s + i.valor, 0);
                      return soma / lista.length;
                    }
                    const medias = MESES.map((m) => {
                      const lista = asArr(FIXED.gastoPorFilial[m]);
                      if (!lista.length) return 0;
                      const soma = lista.reduce((s, i) => s + i.valor, 0);
                      return soma / lista.length;
                    });
                    const somaMedias = medias.reduce((s, v) => s + v, 0);
                    return medias.length ? somaMedias / medias.length : 0;
                  })()
                )}
              </strong>
            </div>
          </div>

          <div className="ml-chart">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart
                data={MESES.map((m) => {
                  const row = { mes: m };
                  scopeFiliais.forEach((f) => {
                    const item = asArr(FIXED.gastoPorFilial[m]).find((x) => x.filial === f);
                    row[f] = item ? item.valor : 0;
                  });
                  return row;
                })}
              >
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Legend />
                {scopeFiliais.map((f) => (
                  <Line
                    key={f}
                    type="monotone"
                    dataKey={f}
                    dot={{ r: 3, strokeWidth: 1.5, fill: colorByFilial[f], stroke: "#fff" }}
                    strokeWidth={2.5}
                    stroke={colorByFilial[f]}
                    opacity={0.95}
                  />
                ))}

                <ReferenceLine
                  y={(() => {
                    if (mesSelecionado) {
                      const lista = asArr(FIXED.gastoPorFilial[mesSelecionado]);
                      if (!lista.length) return 0;
                      const soma = lista.reduce((s, i) => s + i.valor, 0);
                      return soma / lista.length;
                    }
                    const medias = MESES.map((m) => {
                      const lista = asArr(FIXED.gastoPorFilial[m]);
                      if (!lista.length) return 0;
                      const soma = lista.reduce((s, i) => s + i.valor, 0);
                      return soma / lista.length;
                    });
                    const somaMedias = medias.reduce((s, v) => s + v, 0);
                    return medias.length ? somaMedias / medias.length : 0;
                  })()}
                  stroke="#000"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  label={{ value: `Média`, position: "insideTopRight", fill: "#000" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* === COMPARATIVO (gráfico + tabela) === */}
      <section className="ml-grid single">
        <div className="ml-panel flat">
          <h2>Comparativo — Meta x Faturamento x Custo {mesSelecionado ? `(mês ${mesSelecionado})` : `(todos os meses)`}</h2>
          <div className="ml-chart">
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={comparativoData}>
                <XAxis dataKey="filial" interval={0} angle={-12} textAnchor="end" height={70}/>
                <YAxis />
                <Tooltip formatter={(v, name) => [fmtMoney(v), name]} />
                <Legend />
                <Bar dataKey="meta" name="Meta" fill="#1a4777ff" />
                <Bar dataKey="faturamento" name="Faturamento" fill="#2dc419ff" />
                <Bar dataKey="custo" name="Custo (Rateado)" fill="#dd42a2ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="ml-table-wrap" style={{marginTop:16}}>
            <table className="ml-table">
              <thead>
                <tr>
                  <th>Filial</th>
                  <th>Meta</th>
                  <th>Faturamento</th>
                  <th>Custo (Rateado)</th>
                  <th>Ating. (Fat/Meta)</th>
                  <th>Custo/Meta</th>
                  <th>Custo/Fat</th>
                  <th>Margem (Fat − Custo)</th>
                </tr>
              </thead>
              <tbody>
                {comparativoTabela.map((r) => (
                  <tr key={r.filial}>
                    <td>{r.filial}</td>
                    <td>{fmtMoney(r.meta)}</td>
                    <td>{fmtMoney(r.faturamento)}</td>
                    <td>{fmtMoney(r.custo)}</td>
                    <td>{(r.atingFatMeta).toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 1 })}</td>
                    <td>{(r.pctCustoMeta).toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 1 })}</td>
                    <td>{(r.pctCustoFat).toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 1 })}</td>
                    <td className={r.margem >= 0 ? "ok" : "warn"}>{fmtMoney(r.margem)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
