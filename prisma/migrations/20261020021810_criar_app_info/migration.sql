-- CreateTable
CREATE TABLE "app_info" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_info_pkey" PRIMARY KEY ("key")
);

-- Row Level Security: SQL bruto, o Prisma nao modela. Sem policy = deny by default
-- para as roles do Supabase (ADR-001). O Prisma conecta como dono e ignora o RLS.
ALTER TABLE "app_info" ENABLE ROW LEVEL SECURITY;
