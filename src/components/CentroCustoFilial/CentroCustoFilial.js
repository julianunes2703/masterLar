// src/components/CentroCustoFilial/CentroCustoFilial.js
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import "./CentroCustoFilial.css";

// ⚠️ Deixe o CSV com esse nome na MESMA pasta do componente
import csvUrl from "./analise-rateio.csv";

// Helpers
const fmtBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

const uniq = (arr) => Array.from(new Set(arr));

const onlyNumsBR = (s = "") =>
  Number(String(s).replace(/[^0-9,-]/g, "").replace(/\./g, "").replace(",", ".") || 0);

/**
 * Faz o parse do CSV no exato layout enviado:
 *  - Linha A: lixo de vírgulas
 *  - Linha B: "... , SUM de Valor ..., Nome Filial, Mês, , , , , ..."
 *  - Linha C: "...,  Total, ALENCAR, , , ALENCAR Total, ALTANEIRA, , , ALTANEIRA Total, ..."
 *  - Linha D: ", Centro de Custo, , , 6,7,8, , 6,7,8, , ..."
 *  - Linhas seguintes: cada centro com valores "R$ ...".
 *
 * Saída: [{ filial, centro, mes, valor }]
 */
function csvPivotToMock(text) {
  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.filter((l) => l.trim() !== "");

  // Achar linha "Nome Filial" (base) e daí derivar:
  const baseIdx = lines.findIndex((l) => /Nome\s*Filial/i.test(l));
  if (baseIdx === -1 || baseIdx + 2 >= lines.length) return [];

  const groupNamesLine = lines[baseIdx + 1];
  const monthsLine = lines[baseIdx + 2];

  const split = (l) => l.split(",").map((c) => c.replace(/^"|"$/g, "").trim());

  const groupNames = split(groupNamesLine);
  const months = split(monthsLine);

  // Mapeia cada coluna útil -> { filial, mes, col }
  // Observação: o nome da filial aparece só na 1ª coluna do trio (6/7/8).
  const groupCols = [];
  let currentGroup = null;
  for (let col = 0; col < months.length; col++) {
    const gRaw = groupNames[col] || "";
    if (gRaw && !/total/i.test(gRaw) && !/geral/i.test(gRaw)) {
      currentGroup = gRaw;
    }
    const m = months[col];
    if ((m === "6" || m === "7" || m === "8") && currentGroup) {
      groupCols.push({ filial: currentGroup, mes: Number(m), col });
    }
  }
  if (!groupCols.length) return [];

  // A partir da linha após "Centro de Custo..."
  const start = baseIdx + 3;

  const out = [];
  for (let i = start; i < lines.length; i++) {
    const row = split(lines[i]);
    if (!row.length) continue;

    // Parar quando bater na linha "Total geral"
    if (/^Total\s*geral$/i.test((row[0] || "").replace(/"/g, "").trim())) break;

    // O nome do centro está na coluna 1 (porque a primeira é vazia)
    const centro = (row[1] || "").trim();
    if (!centro) continue;

    // Para cada (filial, mes, col) pega o valor da célula
    for (const g of groupCols) {
      const cell = row[g.col] ?? "";
      const valor = onlyNumsBR(cell);
      if (!Number.isFinite(valor) || valor === 0) continue;
      out.push({ filial: g.filial, centro, mes: g.mes, valor });
    }
  }

  return out;
}

export default function CentroCustoFilial({
  titulo = "Centro de Custo por Filial",
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrega e parseia o CSV (mesma pasta)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(csvUrl);
        const txt = await res.text();
        if (!cancel) setRows(csvPivotToMock(txt));
      } catch (e) {
        console.error("Falha ao ler CSV:", e);
        if (!cancel) setRows([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => (cancel = true);
  }, []);

  const meses = useMemo(() => uniq(rows.map((r) => r.mes)).sort((a, b) => a - b), [rows]);
  const centros = useMemo(
    () => uniq(rows.map((r) => r.centro)).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [rows]
  );

  const [mesSel, setMesSel] = useState(6);
  const [centroSel, setCentroSel] = useState("");

  // Mantém seleções válidas quando os dados chegam
  useEffect(() => {
    if (!loading && rows.length) {
      setMesSel((m) => (meses.includes(m) ? m : meses[0]));
      setCentroSel((c) => (centros.includes(c) ? c : centros[0] || ""));
    }
  }, [loading, rows, meses, centros]);

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

  return (
    <div className="mlc-container">
      <div className="mlc-header">
        <h2>{titulo}</h2>
        <p>Compare o valor rateado por filial para um centro de custo e mês específicos.</p>
      </div>

      <div className="mlc-filters">
        <div className="mlc-field">
          <label>Mês</label>
          <select value={mesSel} onChange={(e) => setMesSel(Number(e.target.value))} disabled={loading}>
            {meses.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>

        <div className="mlc-field">
          <label>Centro de Custo</label>
          <select value={centroSel} onChange={(e) => setCentroSel(e.target.value)} disabled={loading}>
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
            Comparação entre Filiais — {centroSel || "—"} (mês {String(mesSel).padStart(2, "0")})
          </h3>
          <span className="mlc-note">Barra = valor | Tooltip mostra % do total</span>
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
                <td className="right">{total ? ((r.valor / total) * 100).toFixed(2) : "0.00"}%</td>
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
