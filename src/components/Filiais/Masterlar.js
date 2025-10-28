import React, { useMemo, useState } from "react";
import "./Masterlar.css";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from "recharts";

const NAVY = "#0b1e3a";
const NAVY_LIGHT = "#12325e";
const ACCENT = "#ff7a00";

const fmtMoney = (n) =>
  `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// ===================== DADOS FIXOS =====================
const FIXED = {
  totalValorTotal: 5038593.39,
  totalRateado: 1119237.21,
  totalPorMesValorTotal: { 6: 1871701.66, 7: 1916514.70, 8: 1250373.35 },
  totalPorMesRateado:    { 6: 427639.02, 7: 376640.76, 8: 314674.04 },
  gastoPorFilial: {
    6: [
      { filial: "FARIAS BRITO", valor: 146990.30 },
      { filial: "N OLINDA",     valor: 48387.72  },
      { filial: "PRIME",        valor: 47441.59  },
      { filial: "ALENCAR",      valor: 44589.29  },
      { filial: "ALTANEIRA",    valor: 40044.64  },
      { filial: "CHORÓ",        valor: 39237.01  },
      { filial: "P DA SERRA",   valor: 37978.84  },
      { filial: "BANABUIU",     valor: 22969.63  },
    ],
    7: [
      { filial: "FARIAS BRITO", valor: 98392.65  },
      { filial: "BANABUIU",     valor: 51794.28  },
      { filial: "N OLINDA",     valor: 50668.25  },
      { filial: "CHORÓ",        valor: 45972.19  },
      { filial: "ALTANEIRA",    valor: 45279.80  },
      { filial: "PRIME",        valor: 42522.73  },
      { filial: "ALENCAR",      valor: 42294.25  },
    ],
    8: [
      { filial: "FARIAS BRITO", valor: 114692.04 },
      { filial: "N OLINDA",     valor: 46846.54  },
      { filial: "P DA SERRA",   valor: 46655.70  },
      { filial: "BANABUIU",     valor: 46467.72  },
      { filial: "ALENCAR",      valor: 46026.25  },
      { filial: "ALTANEIRA",    valor: 13124.39  },
      { filial: "PRIME",        valor: 861.40    },
    ],
  },
};

const FIXED_FILIAIS = Array.from(
  new Set(Object.values(FIXED.gastoPorFilial).flat().map((i) => i.filial))
).sort((a, b) => a.localeCompare(b));

const MESES = Object.keys(FIXED.totalPorMesValorTotal).map(Number).sort((a, b) => a - b);

const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === "object" ? v : {});
const PIE_COLOR = (i) =>
  i === 0 ? NAVY : i === 1 ? NAVY_LIGHT : `#${((i * 8123) % 0xffffff).toString(16).padStart(6, "0")}`;

// =====================================================================

export default function MasterLarDashboard({ topFiliais = 8 }) {
  const [mesSelecionado, setMesSelecionado] = useState(null);
  const [filialSelecionada, setFilialSelecionada] = useState("Todas");

  const filiaisDisponiveis = useMemo(() => ["Todas", ...FIXED_FILIAIS], []);

  // === pizza ===
  const { pieData, pieTotal } = useMemo(() => {
    let itens = [];
    if (mesSelecionado) {
      itens = arr(FIXED.gastoPorFilial[mesSelecionado]).map(({ filial, valor }) => ({ filial, valor }));
    } else {
      const acc = {};
      MESES.forEach((m) => {
        arr(FIXED.gastoPorFilial[m]).forEach(({ filial, valor }) => {
          acc[filial] = (acc[filial] || 0) + Number(valor || 0);
        });
      });
      itens = Object.entries(acc).map(([filial, valor]) => ({ filial, valor }));
    }
    if (filialSelecionada !== "Todas") itens = itens.filter((i) => i.filial === filialSelecionada);
    itens.sort((a, b) => b.valor - a.valor);
    const total = itens.reduce((s, i) => s + i.valor, 0);
    return { pieData: itens.map((i) => ({ name: i.filial, value: i.valor })), pieTotal: total || 1 };
  }, [mesSelecionado, filialSelecionada]);

  const pieLegendItems = useMemo(
    () => arr(pieData).map((d, i) => ({ name: d.name, value: d.value, pct: (d.value / pieTotal) * 100, color: PIE_COLOR(i) })),
    [pieData, pieTotal]
  );

  // === barras empilhadas ===
  const stackedData = useMemo(() => {
    const meses = mesSelecionado ? [mesSelecionado] : MESES;
    const topList = filialSelecionada === "Todas" ? FIXED_FILIAIS.slice(0, topFiliais) : [filialSelecionada];
    return meses.map((m) => {
      const base = { mes: m };
      arr(FIXED.gastoPorFilial[m]).forEach(({ filial, valor }) => {
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

  const totaisMesParaBarras = useMemo(() => {
    const somaMes = {};
    MESES.forEach((m) => {
      const lista = arr(FIXED.gastoPorFilial[m]);
      somaMes[m] = lista.reduce((acc, it) => {
        if (filialSelecionada !== "Todas" && it.filial !== filialSelecionada) return acc;
        return acc + Number(it.valor || 0);
      }, 0);
    });
    return somaMes;
  }, [filialSelecionada]);

  // === linha (evolução) – cores das séries e escopo de filiais
  const scopeFiliais = useMemo(
    () => (filialSelecionada === "Todas" ? FIXED_FILIAIS : [filialSelecionada]),
    [filialSelecionada]
  );

  const seriesColors = useMemo(() => {
    const m = {};
    scopeFiliais.forEach((f, i) => {
      m[f] = i === 0 ? NAVY : i === 1 ? NAVY_LIGHT : `#${((i * 7001) % 0xffffff).toString(16).padStart(6, "0")}`;
    });
    return m;
  }, [scopeFiliais]);

  // ========== RENDER ==========
  return (
    <div className="ml-container">
      <header className="ml-header">
        <h1>Painel MasterLar</h1>
        <p>Visão consolidada de execução por filial e período</p>
      </header>

      <section className="ml-cards">
        {/* Totais gerais */}
        <div className="ml-card">
          <span className="ml-label">Executado total (soma de “Valor Total”)</span>
          <strong className="ml-value">{fmtMoney(FIXED.totalValorTotal)}</strong>
        </div>

        <div className="ml-card">
          <span className="ml-label">Rateado total (soma de “Valor Rateado para a Filial”)</span>
          <strong className="ml-value">{fmtMoney(FIXED.totalRateado)}</strong>
        </div>

        {/* Total por mês — Valor Total */}
        <div className="ml-card">
          <span className="ml-label">Total por mês (Valor Total)</span>
          <ul className="ml-years">
            {Object.entries(obj(FIXED.totalPorMesValorTotal))
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([m, v]) => (
                <li key={`vt-${m}`}>
                  <b>{String(m).padStart(2, "0")}</b> — {fmtMoney(v)}
                </li>
              ))}
          </ul>
        </div>

        {/* Rateado por mês */}
        <div className="ml-card">
          <span className="ml-label">Rateado por mês</span>
          <ul className="ml-years">
            {Object.entries(obj(FIXED.totalPorMesRateado))
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([m, v]) => (
                <li key={`vr-${m}`}>
                  <b>{String(m).padStart(2, "0")}</b> — {fmtMoney(v)}
                </li>
              ))}
          </ul>
        </div>

        {/* Filtros */}
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
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="ml-grid">
        {/* ====== BARRAS ====== */}
        <div className="ml-panel flat">
          <h2>Executado por Filial — {mesSelecionado ? `Mês ${mesSelecionado}` : "Todos os meses"}</h2>

          <div className="ml-chart">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={stackedData}>
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Legend />
                {filialKeys.map((k, i) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    stackId="a"
                    fill={i === 0 ? NAVY : i === 1 ? NAVY_LIGHT : `#${((i * 9973) % 0xffffff).toString(16).padStart(6, "0")}`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ====== PIZZA ====== */}
        <div className="ml-panel flat">
          <h2>Participação das Filiais (%)</h2>
          <div className="ml-chart">
            
            <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={arr(pieData)}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={120}
                    label={false}          // <- remove textos externos
                    labelLine={false}      // <- remove as linhas
                    stroke="none"          // <- sem contorno entre fatias
                  >
                    {arr(pieData).map((_, i) => (
                      <Cell key={i} fill={PIE_COLOR(i)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtMoney(v)} />
                </PieChart>
              </ResponsiveContainer>


            {/* LEGENDA CUSTOMIZADA */}
            <ul className="ml-pie-legend">
              {pieLegendItems.map((it) => (
                <li key={it.name} title={it.name}>
                  <span className="dot" style={{ background: it.color }} />
                  <span className="name">{it.name}</span>
                  <span className="pct">{it.pct.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ====== RANKING ====== */}
        <div className="ml-panel flat">
          <h2>Ranking — quem mais e menos gastou</h2>
          <ol className="ml-ranking">
            {(() => {
              let base = [];
              if (mesSelecionado) {
                base = arr(FIXED.gastoPorFilial[mesSelecionado]);
              } else {
                const acc = {};
                MESES.forEach((m) => {
                  arr(FIXED.gastoPorFilial[m]).forEach(({ filial, valor }) => {
                    acc[filial] = (acc[filial] || 0) + Number(valor || 0);
                  });
                });
                base = Object.entries(acc).map(([filial, valor]) => ({ filial, valor }));
              }
              base.sort((a, b) => b.valor - a.valor);
              return base.map((r, idx) => (
                <li
                  key={r.filial}
                  className={idx === 0 ? "top" : idx === base.length - 1 ? "bottom" : ""}
                  title={r.filial}
                >
                  <div className="ml-rank-pos">#{idx + 1}</div>
                  <div className="ml-rank-name">{r.filial}</div>
                  <div className="ml-rank-values">
                    <span className="money">{fmtMoney(r.valor)}</span>
                  </div>
                </li>
              ));
            })()}
          </ol>
        </div>
      </section>

      {/* Evolução mensal por filial (linha) */}
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
                      const lista = arr(FIXED.gastoPorFilial[mesSelecionado]);
                      if (!lista.length) return 0;
                      const soma = lista.reduce((s, i) => s + i.valor, 0);
                      return soma / lista.length;
                    }
                    const medias = MESES.map((m) => {
                      const lista = arr(FIXED.gastoPorFilial[m]);
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
            <ResponsiveContainer width="100%" height={360} >
              <LineChart
                data={MESES.map((m) => {
                  const row = { mes: m };
                  scopeFiliais.forEach((f) => {
                    const item = arr(FIXED.gastoPorFilial[m]).find((x) => x.filial === f);
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
                    dot={false}
                    strokeWidth={2}
                    stroke={seriesColors[f]}
                  />
                ))}
                <ReferenceLine
                  y={(() => {
                    if (mesSelecionado) {
                      const lista = arr(FIXED.gastoPorFilial[mesSelecionado]);
                      if (!lista.length) return 0;
                      const soma = lista.reduce((s, i) => s + i.valor, 0);
                      return soma / lista.length;
                    }
                    const medias = MESES.map((m) => {
                      const lista = arr(FIXED.gastoPorFilial[m]);
                      if (!lista.length) return 0;
                      const soma = lista.reduce((s, i) => s + i.valor, 0);
                      return soma / lista.length;
                    });
                    const somaMedias = medias.reduce((s, v) => s + v, 0);
                    return medias.length ? somaMedias / medias.length : 0;
                  })()}
                  stroke={ACCENT}
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  label={{ value: `Média`, position: "insideTopRight", fill: ACCENT }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* ===== LEGENDA “POR MÊS” (valores com as mesmas cores das linhas) ===== */}
            <div className="ml-legend-months">
              {MESES.map((m) => {
                const lista = arr(FIXED.gastoPorFilial[m])
                  .filter((x) => scopeFiliais.includes(x.filial))
                  .sort((a, b) => b.valor - a.valor);
                return (
                  <div className="ml-legend-col" key={`legend-${m}`}>
                    <div className="ml-legend-col-title">{String(m).padStart(2, "0")}</div>
                    <ul className="ml-legend-list">
                      {lista.map((item) => (
                        <li className="ml-legend-item" key={`${m}-${item.filial}`}>
                          <span className="ml-legend-dot" style={{ background: seriesColors[item.filial] }} />
                          <span className="ml-legend-name">{item.filial}</span>
                          <span className="ml-legend-val">{fmtMoney(item.valor)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            {/* ================================================================ */}
          </div>
        </div>
      </section>
    </div>
  );
}
