# API do Pixabay — o que a skill precisa saber

Fonte: https://pixabay.com/api/docs/ e https://pixabay.com/service/license-summary/ (lidas em 2026-11-10).

## Requisição

`GET https://pixabay.com/api/?key=<KEY>&q=<termo>&image_type=photo&safesearch=true&orientation=horizontal&min_width=800&min_height=600&per_page=200`

- A chave exige conta no Pixabay; vai só como parâmetro `key`.
- Limite: 100 requisições por 60 s (cabeçalhos `X-RateLimit-*`; 429 ao estourar).
- **Cache obrigatório de 24 h** para respostas de busca. Downloads em massa sistemáticos são proibidos.

## Campos usados

| Campo | Uso |
|---|---|
| `id` | identidade da foto (sem repetição) |
| `pageURL` | crédito: página da foto |
| `user`, `user_id` | crédito: autor; perfil em `https://pixabay.com/users/<user>-<user_id>/` |
| `tags` | filtro de direito de imagem (separadas por vírgula) |
| `largeImageURL` | download (até 1280 px) |
| `imageWidth`, `imageHeight` | descartar o que não chega a 800×600 |

`webformatURL` (640 px) é pequena demais; `fullHDURL`/`imageURL` exigem acesso aprovado.

## Regras de uso

- **Hotlink permanente proibido**: as fotos precisam ser baixadas e servidas do nosso Storage.
- Licença: Pixabay Content License. Atribuição não é obrigatória, mas a API pede mostrar a origem —
  o catálogo mostra "Fotos: Pixabay".
- Proibido: uso com pessoas reconhecíveis de forma imprópria, marcas/logos reconhecíveis em
  contexto comercial, revenda "standalone". Por isso pessoa, marca e texto são descartados.
