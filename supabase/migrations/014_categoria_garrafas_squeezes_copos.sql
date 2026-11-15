-- Adiciona a categoria de produtos "Garrafas, squeezes, copos"
INSERT INTO public.categoria_produto (id, nome, ordem)
VALUES ('c0000000-0000-0000-0000-000000000006', 'Garrafas, squeezes, copos', 6)
ON CONFLICT (id) DO UPDATE
SET nome = EXCLUDED.nome,
    ordem = EXCLUDED.ordem;
