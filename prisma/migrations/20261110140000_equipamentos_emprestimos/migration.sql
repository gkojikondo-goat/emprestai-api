-- Spec 004 · T1 e T10. Gerado com `prisma migrate diff` + SQL bruto (CHECK, unique parcial, RLS).

-- CreateTable
CREATE TABLE "equipamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "patrimonio" TEXT,
    "situacao" TEXT NOT NULL,
    "observacao" TEXT,
    "imagem_path" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emprestimos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "equipamento_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "retirada_em" DATE NOT NULL,
    "devolver_ate" DATE NOT NULL,
    "devolvido_em" DATE,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipamentos_tenant_id_criado_em_id_idx" ON "equipamentos"("tenant_id", "criado_em" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "equipamentos_tenant_id_patrimonio_key" ON "equipamentos"("tenant_id", "patrimonio");

-- CreateIndex
CREATE INDEX "emprestimos_tenant_id_user_id_idx" ON "emprestimos"("tenant_id", "user_id");

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- SQL bruto: o Prisma não modela CHECK, índice parcial nem RLS.
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_categoria_check"
  CHECK ("categoria" IN ('notebook', 'monitor', 'cabo', 'camera', 'acessorio'));
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_situacao_check"
  CHECK ("situacao" IN ('disponivel', 'manutencao'));

-- Um equipamento tem no máximo um empréstimo em aberto (rede de segurança da spec 006 CA-07).
CREATE UNIQUE INDEX "emprestimos_um_aberto_por_equipamento"
  ON "emprestimos"("equipamento_id") WHERE "devolvido_em" IS NULL;
CREATE INDEX "emprestimos_abertos_por_pessoa"
  ON "emprestimos"("tenant_id", "user_id") WHERE "devolvido_em" IS NULL;

-- RLS ligado e sem policy = deny by default (ADR-001).
ALTER TABLE "equipamentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emprestimos" ENABLE ROW LEVEL SECURITY;
