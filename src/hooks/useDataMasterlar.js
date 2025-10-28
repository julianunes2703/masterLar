import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

/* ========= CONFIG ========= */
const SHEET = "Página1";
const RANGE = "A1:Z100000";
const CSV_URL =
  "https://script.google.com/macros/s/AKfycbzX_frr5T74rZcqJiya0F-wTk6yoho7hY7l-Rr7MprXe5xs-KO9xW_xViTapU4rRRMObA/exec" +
  `?sheet=${encodeURIComponent(SHEET)}&range=${encodeURIComponent(RANGE)}`;

const YEAR_FILTER = 2025; // ou null para não filtrar por ano
/* ========================= */

/** Converte "R$ 1.234,56" | "1,234.56" | "99,00-" | "(99,00)" | "R$ 99,00" (NBSP) -> number */
const moneyToNumber = (v) => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  let s = String(v)
    .replace(/[\u00A0\u202F]/g, " ") // NBSP / thin space
    .replace(/\s+/g, " ")
    .trim();

  const neg =
    /^\(.*\)$/.test(s) || /^[\s]*[-−]/.test(s) || /[-−]\s*$/.test(s);

  s = s.replace(/R\$\s*/i, "").replace(/[^0-9.,]/g, "");
  if (!s) return 0;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastDot > -1 && lastDot > lastComma) {
    // estilo en-US
    s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // estilo pt-BR
    s = s.replace(/\./g, "").replace(/,/g, ".");
  }

  let n = Number(s);
  if (!Number.isFinite(n)) n = 0;
  return neg ? -Math.abs(n) : n;
};

const safeIntMonth = (v) => {
  const n = moneyToNumber(v);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? Math.trunc(n) : null;
};

const extractYear = (s) => {
  if (!s) return null;
  const str = String(s);
  const br = str.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (br) return Number(br[3]);
  const iso = str.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (iso) return Number(iso[1]);
  const any = str.match(/(20\d{2})/);
  if (any) return Number(any[1]);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.getFullYear();
};

export default function useDataMasterLar() {
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ totais exatamente como a planilha (rodapé E/F)
  const [totaisPlanilha, setTotaisPlanilha] = useState({
    totalE: 0,
    totalF: 0,
    qtd: 0,
  });

  // ✅ blocos-resumo montados no fim da planilha
  const [resumoPlanilha, setResumoPlanilha] = useState({
    totaisPorMes: { valorTotal: {}, rateado: {} },
    gastoPorFilial: {}, // { 6: [{filial, valor}], 7: [...], 8: [...] }
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(CSV_URL, { cache: "no-store" });
        const text = await res.text();

        const parsed = Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          worker: false,
        });

        const matrix = parsed.data || [];
        if (!matrix.length) {
          if (!cancelled) {
            setLinhas([]);
            setTotaisPlanilha({ totalE: 0, totalF: 0, qtd: 0 });
            setResumoPlanilha({
              totaisPorMes: { valorTotal: {}, rateado: {} },
              gastoPorFilial: {},
            });
          }
          return;
        }

        const allRows = matrix.slice(1); // sem cabeçalho

        // --------- helpers (ids únicos) ----------
        const _isEmpty = (x) => String(x ?? "").trim() === "";
        const _isMoneyLike = (x) => {
          const s = String(x ?? "").trim();
          return !!s && /^(\(?[-−]?\s*R\$\s*)?[-−(]?\d[\d.,]*\)?$/.test(s);
        };
        // A,B,C,D,G,H vazias; E e/ou F com número; cauda vazia
        const _isFooterRow = (r) => {
          const [a,b,c,d,e,f,g,h] = [r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7]];
          const headsEmpty = _isEmpty(a)&&_isEmpty(b)&&_isEmpty(c)&&_isEmpty(d)&&_isEmpty(g)&&_isEmpty(h);
          const hasMoneyEF = _isMoneyLike(e) || _isMoneyLike(f);
          const tailEmpty = r.slice(8).every(_isEmpty);
          return headsEmpty && hasMoneyEF && tailEmpty;
        };

        // --------- localizar rodapé e definir totais da planilha ----------
        let footerE = null, footerF = null;
        for (let i = allRows.length - 1; i >= 0; i--) {
          const r = allRows[i];
          if (_isFooterRow(r)) {
            footerE = moneyToNumber(r[4]);
            footerF = moneyToNumber(r[5]);
            break;
          }
        }

        let totalE = 0, totalF = 0;
        if (footerE !== null || footerF !== null) {
          totalE = footerE ?? 0;
          totalF = footerF ?? 0;
        } else {
          for (const r of allRows) {
            totalE += moneyToNumber(r[4]); // E: Valor Total
            totalF += moneyToNumber(r[5]); // F: Valor Rateado
          }
        }
        if (!cancelled) setTotaisPlanilha({ totalE, totalF, qtd: allRows.length });

        // ====== SCAN DOS RESUMOS NO FIM DA PLANILHA ======
        const scanResumoPlanilha = (rows) => {
          const out = {
            totaisPorMes: { valorTotal: {}, rateado: {} },
            gastoPorFilial: {},
          };

          const reTotal   = /^valor\s*total\s*do\s*m[eê]s\s*(\d+)/i;
          const reRateado = /^valor\s*rateado\s*do\s*m[eê]s\s*(\d+)/i;
          const reGasto   = /^gasto\s*por\s*filial\s*m[eê]s\s*(\d+)/i;

          // primeiro número à direita da coluna j
          const rightNumber = (row, j) => {
            for (let k = j + 1; k < row.length; k++) {
              const raw = row[k];
              if (raw == null || String(raw).trim() === "") continue;
              const n = moneyToNumber(raw);
              if (Number.isFinite(n)) return n;
            }
            return null;
          };

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            for (let j = 0; j < row.length; j++) {
              const cell = String(row[j] ?? "").trim();
              if (!cell) continue;

              let m;

              // "Valor Total do mês X"
              if ((m = cell.match(reTotal))) {
                const mes = parseInt(m[1], 10);
                const v = rightNumber(row, j);
                if (v != null) out.totaisPorMes.valorTotal[mes] = v;
                continue;
              }

              // "Valor Rateado do mês X"
              if ((m = cell.match(reRateado))) {
                const mes = parseInt(m[1], 10);
                const v = rightNumber(row, j);
                if (v != null) out.totaisPorMes.rateado[mes] = v;
                continue;
              }

              // "Gasto por filial mês X"
              if ((m = cell.match(reGasto))) {
                const mes = parseInt(m[1], 10);

                // achar linha do cabeçalho "Nome Filial" até 3 linhas abaixo
                let startRow = null;
                let colNome = j;
                for (let look = 1; look <= 3 && i + look < rows.length; look++) {
                  const r = rows[i + look];
                  if (String(r[colNome] ?? "").toLowerCase().includes("nome filial")) {
                    startRow = i + look + 1;
                    break;
                  }
                }
                if (startRow == null) startRow = i + 1;

                const lista = [];
                const rightVal = (r) => {
                  for (let k = colNome + 1; k < rows[r].length; k++) {
                    const raw = rows[r][k];
                    if (raw == null || String(raw).trim() === "") continue;
                    const n = moneyToNumber(raw);
                    if (Number.isFinite(n)) return n;
                  }
                  return null;
                };

                for (let r = startRow; r < rows.length; r++) {
                  const nome = String(rows[r][colNome] ?? "").trim();
                  const v = rightVal(r);
                  // fim da tabela quando nome vazio e/ou linha vazia
                  if (!nome && (v == null || String(rows[r].join("")).trim() === "")) break;
                  if (!nome) break;
                  if (v == null) break;
                  lista.push({ filial: nome, valor: moneyToNumber(v) });
                }

                if (lista.length) out.gastoPorFilial[mes] = lista;
                continue;
              }
            }
          }
          return out;
        };

        const resumo = scanResumoPlanilha(allRows);
        if (!cancelled) setResumoPlanilha(resumo);

        // ======= normalização para o dashboard =======
        const normalizadas = allRows.map((r) => {
          const dataRaw = (r[0] ?? "").toString();
          const mesCol = safeIntMonth(r[1]);
          const ano = extractYear(r[0]);

          return {
            dataRaw,
            mes:
              mesCol != null
                ? mesCol
                : (() => {
                    const d = new Date(dataRaw);
                    return isNaN(d.getTime()) ? null : d.getMonth() + 1;
                  })(),
            clienteFornecedor: (r[2] ?? "").toString().trim(),
            centroCusto: (r[3] ?? "").toString().trim(),
            valorTotal: moneyToNumber(r[4]),
            valorRateado: moneyToNumber(r[5]),
            codFilial: (r[6] ?? "").toString().trim(),
            nomeFilial: (r[7] ?? "").toString().trim(),
            ano,
          };
        });

        const limpas = normalizadas.filter((l) => {
          const mesOK = l.mes && l.mes >= 1 && l.mes <= 12;
          const filialOK = !!l.nomeFilial;
          const temValor = l.valorTotal !== 0 || l.valorRateado !== 0;
          return mesOK && filialOK && temValor;
        });

        const base =
          YEAR_FILTER == null ? limpas : limpas.filter((l) => l.ano === YEAR_FILTER);

        if (!cancelled) setLinhas(base);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Falha ao ler CSV");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => {
    if (!linhas.length) {
      return {
        linhas: [],
        meses: [],
        filiais: [],
        totalValorTotal: 0,
        totalRateado: 0,
        totalPorMesValorTotal: {},
        totalPorMesRateado: {},
        porFilialRateado: [],
        porCentroDeCustoRateado: [],
        porFilialMes: {},
        porFilialTotal: [],
      };
    }

    const mesesSet = new Set();
    const filiaisSet = new Set();
    const totalPorMesValorTotal = {};
    const totalPorMesRateado = {};
    const rateadoPorFilial = new Map();
    const rateadoPorCentro = new Map();
    const porFilialMes = {};

    let somaTotal = 0;
    let somaRateado = 0;

    for (const l of linhas) {
      if (l.mes && l.mes >= 1 && l.mes <= 12) {
        mesesSet.add(l.mes);
        totalPorMesValorTotal[l.mes] =
          (totalPorMesValorTotal[l.mes] || 0) + l.valorTotal;
        totalPorMesRateado[l.mes] =
          (totalPorMesRateado[l.mes] || 0) + l.valorRateado;

        if (!porFilialMes[l.mes]) porFilialMes[l.mes] = [];
        porFilialMes[l.mes].push({ filial: l.nomeFilial, valor: l.valorRateado });
      }

      if (l.nomeFilial) {
        filiaisSet.add(l.nomeFilial);
        rateadoPorFilial.set(
          l.nomeFilial,
          (rateadoPorFilial.get(l.nomeFilial) || 0) + l.valorRateado
        );
      }
      if (l.centroCusto) {
        rateadoPorCentro.set(
          l.centroCusto,
          (rateadoPorCentro.get(l.centroCusto) || 0) + l.valorRateado
        );
      }

      somaTotal += l.valorTotal;
      somaRateado += l.valorRateado;
    }

    // agrega por mês/filial
    Object.keys(porFilialMes).forEach((m) => {
      const acc = {};
      porFilialMes[m].forEach(({ filial, valor }) => {
        acc[filial] = (acc[filial] || 0) + valor;
      });
      porFilialMes[m] = Object.entries(acc)
        .map(([filial, valor]) => ({ mes: Number(m), filial, valor }))
        .sort((a, b) => b.valor - a.valor);
    });

    const porFilialRateado = Array.from(rateadoPorFilial.entries())
      .map(([filial, valor]) => ({ filial, valor }))
      .sort((a, b) => b.valor - a.valor);

    const porCentroDeCustoRateado = Array.from(rateadoPorCentro.entries())
      .map(([centro, valor]) => ({ centro, valor }))
      .sort((a, b) => b.valor - a.valor);

    const porFilialTotal = porFilialRateado.map(({ filial, valor }) => ({
      filial,
      valor,
      percentual: somaTotal ? (valor / somaTotal) * 100 : 0,
    }));

    return {
      linhas,
      meses: Array.from(mesesSet).sort((a, b) => a - b),
      filiais: Array.from(filiaisSet).sort((a, b) => a.localeCompare(b)),
      totalValorTotal: somaTotal,
      totalRateado: somaRateado,
      totalPorMesValorTotal,
      totalPorMesRateado,
      porFilialRateado,
      porCentroDeCustoRateado,
      porFilialMes,
      porFilialTotal,
    };
  }, [linhas]);

  // devolve também os resumos do final da planilha
  return { data, loading, error, totaisPlanilha, resumoPlanilha };
}
