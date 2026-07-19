-- Mantém o catálogo oficial disponível em todos os ambientes, inclusive
-- nos deploys que executam apenas `prisma migrate deploy`.
WITH defaults ("id", "name", "icon", "kind") AS (
    VALUES
        ('sys_exp_alimentacao', 'Alimentação', '🍔', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_mercado', 'Mercado', '🛒', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_transporte', 'Transporte', '🚗', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_moradia', 'Moradia', '🏠', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_contas_servicos', 'Contas e serviços', '💡', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_saude', 'Saúde', '❤️', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_educacao', 'Educação', '📚', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_lazer', 'Lazer', '🎮', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_roupas', 'Roupas', '👕', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_assinaturas', 'Assinaturas', '📱', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_viagem', 'Viagem', '✈️', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_pets', 'Pets', '🐾', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_beleza', 'Beleza', '💅', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_impostos_taxas', 'Impostos e taxas', '🧾', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_dividas_emprestimos', 'Dívidas e empréstimos', '🏦', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_manutencao', 'Manutenção', '🔧', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_presentes_doacoes', 'Presentes e doações', '🎁', 'EXPENSE'::"TransactionKind"),
        ('sys_exp_outros', 'Outros', '📦', 'EXPENSE'::"TransactionKind"),
        ('sys_inc_salario', 'Salário', '💼', 'INCOME'::"TransactionKind"),
        ('sys_inc_freelance', 'Freelance', '💻', 'INCOME'::"TransactionKind"),
        ('sys_inc_vendas', 'Vendas', '🏷️', 'INCOME'::"TransactionKind"),
        ('sys_inc_investimentos', 'Investimentos', '📈', 'INCOME'::"TransactionKind"),
        ('sys_inc_alugueis', 'Aluguéis', '🔑', 'INCOME'::"TransactionKind"),
        ('sys_inc_beneficios', 'Benefícios', '🎫', 'INCOME'::"TransactionKind"),
        ('sys_inc_reembolsos', 'Reembolsos', '↩️', 'INCOME'::"TransactionKind"),
        ('sys_inc_premios_bonus', 'Prêmios e bônus', '🏆', 'INCOME'::"TransactionKind"),
        ('sys_inc_transferencia', 'Transferência', '🔄', 'INCOME'::"TransactionKind"),
        ('sys_inc_outros', 'Outros (Receita)', '💰', 'INCOME'::"TransactionKind")
),
updated AS (
    UPDATE "categories" AS category
    SET
        "icon" = defaults."icon",
        "kind" = defaults."kind",
        "updatedAt" = CURRENT_TIMESTAMP
    FROM defaults
    WHERE
        category."userId" IS NULL
        AND LOWER(category."name") = LOWER(defaults."name")
    RETURNING category."id"
)
INSERT INTO "categories" (
    "id",
    "userId",
    "name",
    "icon",
    "kind",
    "createdAt",
    "updatedAt"
)
SELECT
    defaults."id",
    NULL,
    defaults."name",
    defaults."icon",
    defaults."kind",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM defaults
WHERE NOT EXISTS (
    SELECT 1
    FROM "categories" AS category
    WHERE
        category."userId" IS NULL
        AND LOWER(category."name") = LOWER(defaults."name")
);
