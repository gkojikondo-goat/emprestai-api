# ADR-008 — `sharp` para padronizar as fotos dos equipamentos em 800×600

**Status:** aceito — proposto pelo agente e aprovado por Gabriel Kondo em 2026-11-10
(escolheu `sharp` entre as alternativas abaixo; `jimp` foi a outra opção apresentada).
**Complementa:** ADR-001 (não prevê processamento de imagem).

## Contexto

A skill `imagens-equipamentos` precisa **garantir** (não só pedir) que toda foto
chegue ao sistema com 800×600. O Pixabay não devolve esse tamanho: `webformatURL`
vai até 640 px e `largeImageURL` até 1280 px, cada foto com a sua proporção. É
preciso recortar para 4:3 e redimensionar. O briefing de dados iniciais pede
"instale a biblioteca sharp", mas `rules/restrictions.md` só admite biblioteca
fora do ADR-001 com aprovação — por isso este ADR.

## Decisão proposta

| Item | Escolha |
|---|---|
| Biblioteca | `sharp` (libvips), como **devDependency** do emprestai-api |
| Onde roda | Só no script da skill, na máquina de quem prepara as fotos. Nunca no código da API nem no bundle da Vercel |
| Operação | `resize(800, 600, { fit: 'cover', position: 'attention' })` + JPEG qualidade 82, sem metadados |
| Garantia | O script relê cada arquivo gerado e confere 800×600; o envio ao Storage recusa qualquer arquivo fora desse tamanho |

## Alternativas

- **`jimp`** (JavaScript puro): sem binário nativo, mas bem mais lento e com JPEG
  de qualidade inferior; recorte "inteligente" (`attention`) não existe.
- **Só os tamanhos do Pixabay**: nenhum é 800×600; esticar no navegador com CSS não
  "garante" o tamanho do arquivo, que é o que o contrato pede.
- **ImageMagick pela linha de comando**: instalação fora do `npm`, diferente em cada
  máquina; o processo deixa de ser reproduzível.
- **Redimensionar no navegador (canvas)**: exigiria uma tela de upload que a v1 não tem.

## Consequências

- Binário nativo baixado no `npm install` (há builds prontos para Windows e Linux).
- Como é devDependency, não aumenta a função da Vercel nem o tempo de cold start.
- Trocar de biblioteca depois afeta só o script da skill.
