-- D61 (13/11/2026): fii_monthly_reports.dividend_yield_month guarda o Percentual_Dividend_Yield_Mes do informe mensal
-- de FII como a CVM publica, inclusive negativo. O campo é a rentabilidade efetiva menos a patrimonial do mês, não
-- proventos ÷ preço: fica negativo com rentabilidade efetiva negativa ou estorno (540 linhas de 143 fundos em 2026).
-- Escrita à mão: o Prisma não expressa CHECK; o schema.prisma não muda (db:drift continua sem diferenças).
ALTER TABLE "fii_monthly_reports" DROP CONSTRAINT "fii_monthly_reports_values_check";
ALTER TABLE "fii_monthly_reports" ADD CONSTRAINT "fii_monthly_reports_values_check" CHECK ("shares_outstanding" > 0 AND "shareholders_count" >= 0);
