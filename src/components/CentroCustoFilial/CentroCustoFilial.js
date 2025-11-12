// src/components/CentroCustoFilial/CentroCustoFilial.js
import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import "./CentroCustoFilial.css";
import DATA from "./centroCustoPorFilial.json"; // JSON na mesma pasta


const fmtBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });

// 🔧 Corrigido para aceitar chaves "6"|"7"|"8" (strings) do JSON
const toRows = (dataObj) => {
  const rows = [];
  Object.entries(dataObj).forEach(([centro, porFilial]) => {
    Object.entries(porFilial).forEach(([filial, meses]) => {
      [6, 7, 8].forEach((m) => {
        const v = meses[m] ?? meses[String(m)] ?? 0;
        const valor = Number(v || 0);
        if (valor) rows.push({ filial, centro, mes: m, valor });
      });
    });
  });
  return rows;
};

// =======================================================
// Componente principal
// =======================================================
export default function CentroCustoFilial({ titulo = "Centro de Custo por Filial" }) {
  // transforma a constante fixa em linhas [{filial, centro, mes, valor}]
  const rows = useMemo(() => toRows(DATA), []);
  const meses = useMemo(() => [6, 7, 8], []);
  const centros = useMemo(
    () => Object.keys(DATA).sort((a, b) => a.localeCompare(b, "pt-BR")),
    []
  );

  const [mesSel, setMesSel] = useState(6);
  const [centroSel, setCentroSel] = useState(centros[0] || "");

  // garante seleção válida quando você adicionar/remover centros
  useEffect(() => {
    if (!centros.includes(centroSel)) setCentroSel(centros[0] || "");
  }, [centros, centroSel]);

  const filtrado = useMemo(
    () => rows.filter((r) => r.mes === mesSel && r.centro === centroSel),
    [rows, mesSel, centroSel]
  );

  const porFilial = useMemo(() => {
    const acc = new Map();
    filtrado.forEach((r) => acc.set(r.filial, (acc.get(r.filial) ?? 0) + (r.valor ?? 0)));
    return Array.from(acc.entries())
      .map(([filial, valor]) => ({ filial, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [filtrado]);

  const total = useMemo(() => porFilial.reduce((s, r) => s + r.valor, 0), [porFilial]);
  const lider = porFilial[0];
  const media = porFilial.length ? total / porFilial.length : 0;

  const dataChart = porFilial.map((r) => ({
    filial: r.filial,
    Valor: Number((r.valor || 0).toFixed(2)),
    "% do total": total ? Number(((r.valor / total) * 100).toFixed(2)) : 0,
  }));

  // =======================================================
  // Render
  // =======================================================
  return (
    <div className="mlc-container">
      <div className="mlc-header">
        <h2>{titulo}</h2>
        <p>
          Compare o valor rateado por filial para um centro de custo e mês específicos.
        </p>
      </div>

      <div className="mlc-filters">
        <div className="mlc-field">
          <label>Mês</label>
          <select
            value={mesSel}
            onChange={(e) => setMesSel(Number(e.target.value))}
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>

        <div className="mlc-field">
          <label>Centro de Custo</label>
          <select
            value={centroSel}
            onChange={(e) => setCentroSel(e.target.value)}
          >
            {centros.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mlc-cards">
        <div className="mlc-card">
          <span className="mlc-card-label">Total (Rateado)</span>
          <strong className="mlc-big">{fmtBRL(total)}</strong>
          <small>
            {centroSel || "—"} — mês {String(mesSel).padStart(2, "0")}
          </small>
        </div>
        <div className="mlc-card">
          <span className="mlc-card-label">Média por Filial</span>
          <strong className="mlc-big">{fmtBRL(media)}</strong>
          <small>{porFilial.length} filiais</small>
        </div>
        <div className="mlc-card">
          <span className="mlc-card-label">Líder do Centro</span>
          <strong className="mlc-big">{lider ? lider.filial : "—"}</strong>
          <small>{lider ? fmtBRL(lider.valor) : "Sem dados"}</small>
        </div>
      </div>

      <div className="mlc-panel">
        <div className="mlc-panel-head">
          <h3>
            Comparação entre Filiais — {centroSel || "—"} (mês{" "}
            {String(mesSel).padStart(2, "0")})
          </h3>
          <span className="mlc-note">
            Barra = valor | Tooltip mostra % do total
          </span>
        </div>
        <div className="mlc-chart">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={dataChart} barCategoryGap={24}>
              <CartesianGrid vertical={false} strokeOpacity={0.15} />
              <XAxis dataKey="filial" tickMargin={8} />
              <YAxis tickFormatter={(v) => Number(v).toLocaleString("pt-BR")} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "% do total") return [`${value}%`, name];
                  return [fmtBRL(value), name];
                }}
              />
              <Legend />
              <Bar dataKey="Valor" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mlc-table">
        <table>
          <thead>
            <tr>
              <th>Filial</th>
              <th className="right">Valor</th>
              <th className="right">% do total</th>
            </tr>
          </thead>
          <tbody>
            {porFilial.map((r) => (
              <tr key={r.filial}>
                <td>{r.filial}</td>
                <td className="right">{fmtBRL(r.valor)}</td>
                <td className="right">
                  {total ? ((r.valor / total) * 100).toFixed(2) : "0.00"}%
                </td>
              </tr>
            ))}
            <tr className="mlc-total">
              <td>Total</td>
              <td className="right">{fmtBRL(total)}</td>
              <td className="right">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
