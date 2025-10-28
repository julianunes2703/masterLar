import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";

import "./CentroCusto.css"

const NAVY = "#0b2b5bff";
const MESES = [6, 7, 8];

const fmtMoney = (n) =>
  `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function brMoneyToNumber(str = "") {
  const s = String(str).replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : 0;
}

function parseCSV(csvText) {
  const lines = csvText
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) =>
      l &&
      !/^Total\s/i.test(l) &&
      !/^Centro\s*de\s*Custo/i.test(l) &&
      !/^<[^>]+>/.test(l)
    );

  const byMonth = { 6: {}, 7: {}, 8: {} };
  for (const line of lines) {
    const cols = line.split(/,|;/).map((c) => c.trim());
    if (cols.length < 4) continue;

    const centro = cols[0];
    const v6 = brMoneyToNumber(cols[1]);
    const v7 = brMoneyToNumber(cols[2]);
    const v8 = brMoneyToNumber(cols[3]);

    if (!centro) continue;
    if (Number.isFinite(v6)) byMonth[6][centro] = (byMonth[6][centro] || 0) + v6;
    if (Number.isFinite(v7)) byMonth[7][centro] = (byMonth[7][centro] || 0) + v7;
    if (Number.isFinite(v8)) byMonth[8][centro] = (byMonth[8][centro] || 0) + v8;
  }
  return byMonth;
}

function topN(dict, n = 15) {
  return Object.entries(dict)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

// pequenos componentes para layout
const StatCard = ({ title, value, highlight = false }) => (
  <div className={`ml-card ${highlight ? "ml-card--highlight" : ""}`}>
    <div className="ml-card-title">{title}</div>
    <div className="ml-card-value">{value}</div>
  </div>
);

const Pill = ({ active, children, onClick }) => (
  <button className={`ml-pill ${active ? "active" : ""}`} onClick={onClick}>
    {children}
  </button>
);

export default function CentrosDeCusto({ src = "/centros_de_custo.csv", topNValue = 15 }) {
  const [byMonth, setByMonth] = useState(null);
  const [aba, setAba] = useState("TOTAL");

  // depois dos useState existentes
const [open, setOpen] = useState({ 6: true, 7: false, 8: false });
const toggleMonth = (m) => setOpen((o) => ({ ...o, [m]: !o[m] }));


  useEffect(() => {
    fetch(src)
      .then((r) => r.text())
      .then((t) => {
        if (/^\s*</.test(t)) throw new Error("Recebi HTML em vez de CSV");
        setByMonth(parseCSV(t));
      })
      .catch((e) => console.error("Erro ao carregar CSV:", e));
  }, [src]);

  const totalDict = useMemo(() => {
    if (!byMonth) return {};
    const total = {};
    MESES.forEach((m) => {
      Object.entries(byMonth[m] || {}).forEach(([centro, v]) => {
        total[centro] = (total[centro] || 0) + v;
      });
    });
    return total;
  }, [byMonth]);

  const totais = useMemo(() => {
    if (!byMonth) return {};
    const r = {};
    MESES.forEach((m) => {
      r[m] = Object.values(byMonth[m] || {}).reduce((s, v) => s + v, 0);
    });
    r.TOTAL = Object.values(totalDict).reduce((s, v) => s + v, 0);
    return r;
  }, [byMonth, totalDict]);

  const chartData = useMemo(() => {
    if (!byMonth) return [];
    if (aba === "TOTAL") return topN(totalDict, topNValue);
    const m = Number(aba);
    return topN(byMonth[m] || {}, topNValue);
  }, [aba, byMonth, totalDict, topNValue]);

  if (!byMonth) {
    return (
      <section className="ml-panel">
        <h2>Centros de Custo</h2>
        <p>Carregando dados...</p>
      </section>
    );
  }

  return (
    <section className="ml-panel">
      {/* Título + filtros como pílulas */}
      <div className="ml-panel-row">
        <h2>Centros de Custo — Top {topNValue}</h2>
        <div className="ml-pills">
          <Pill active={aba === "TOTAL"} onClick={() => setAba("TOTAL")}>Todos</Pill>
          {MESES.map((m) => (
            <Pill key={m} active={String(aba) === String(m)} onClick={() => setAba(String(m))}>
              {m.toString().padStart(2, "0")}
            </Pill>
          ))}
        </div>
      </div>

      {/* CARDS DE TOTAIS */}
      <div className="ml-stats">
        <StatCard
          title="Total (mês 6 + 7 + 8)"
          value={fmtMoney(totais.TOTAL)}
          highlight
        />
        <StatCard title="06 — Total do mês" value={fmtMoney(totais[6])} />
        <StatCard title="07 — Total do mês" value={fmtMoney(totais[7])} />
        <StatCard title="08 — Total do mês" value={fmtMoney(totais[8])} />
      </div>

      {/* GRÁFICO */}
      <div className="ml-chart">
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={false} />
            <YAxis />
            <Tooltip formatter={(v) => fmtMoney(v)} />
            <Bar dataKey="value" fill={NAVY} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TABELAS COMPLETAS */}
            <div className="ml-cc-tables">
            {MESES.map((m) => {
                const arr = topN(byMonth[m] || {}, 1000); // todos
                const isOpen = !!open[m];

                return (
                <div className={`ml-cc-table ${isOpen ? "open" : ""}`} key={`m-${m}`}>
                    <button
                    className="ml-acc-summary"
                    onClick={() => toggleMonth(m)}
                    aria-expanded={isOpen}
                    >
                    <span className="ml-acc-title">
                        Mês {m} — {fmtMoney(totais[m])}
                    </span>
                    <span className="ml-acc-icon" aria-hidden>
                        {/* seta gira quando abre */}
                        <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M8 10l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    </span>
                    </button>

                    {isOpen && (
                    <div className="ml-acc-panel">
                        <div className="ml-table-wrap">
                        <table className="ml-table">
                            <thead>
                            <tr>
                                <th>#</th>
                                <th>Centro de Custo</th>
                                <th style={{ textAlign: "right" }}>Total</th>
                            </tr>
                            </thead>
                            <tbody>
                            {arr.map((r, i) => (
                                <tr key={r.name}>
                                <td>{i + 1}</td>
                                <td>{r.name}</td>
                                <td style={{ textAlign: "right" }}>{fmtMoney(r.value)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                    )}
                </div>
                );
            })}
            </div>

    </section>
  );
}
