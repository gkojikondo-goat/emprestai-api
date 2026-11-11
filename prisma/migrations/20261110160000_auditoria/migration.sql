-- Spec 006 (emenda da prática): tabela de auditoria append-only.

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ator_id" UUID NOT NULL,
    "acao" TEXT NOT NULL,
    "recurso_tipo" TEXT NOT NULL,
    "recurso_id" UUID NOT NULL,
    "dados" JSONB,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_tenant_id_criado_em_idx" ON "auditoria"("tenant_id", "criado_em" DESC);

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- SQL bruto: append-only (ADR-001). UPDATE e DELETE são recusados pelo banco.
CREATE FUNCTION auditoria_somente_insercao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'auditoria é append-only: % não é permitido', TG_OP;
END;
$$;
CREATE TRIGGER auditoria_append_only
  BEFORE UPDATE OR DELETE ON "auditoria"
  FOR EACH ROW EXECUTE FUNCTION auditoria_somente_insercao();

ALTER TABLE "auditoria" ENABLE ROW LEVEL SECURITY;
