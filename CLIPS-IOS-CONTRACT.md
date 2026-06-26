# Clipes de Partidas - Contrato iOS

O app iOS deve gravar em buffer circular local e salvar apenas os trechos escolhidos pelo usuário.

## Fluxo

1. Buscar a partida ao vivo em `matches` com `status = 'live'`.
2. Gravar a mesa no app usando buffer circular.
3. Quando o usuário salvar um lance, exportar um arquivo `.mp4` ou `.mov`.
4. Fazer upload do arquivo no Supabase Storage bucket `match-clips`.
5. Inserir um registro em `match_clips` com o `match_id` da partida.

## Storage

Bucket: `match-clips`

Path recomendado:

```text
{match_id}/{clip_id}.mp4
```

Exemplo:

```text
6d9...e2a/3b1...91c.mp4
```

## Tabela

Campos principais de `match_clips`:

```text
match_id          uuid
storage_path      text
duration_seconds  int
label             text opcional
file_name         text opcional
mime_type         text, default video/mp4
created_by        uuid opcional
```

## Exemplo de insert

```json
{
  "match_id": "uuid-da-partida",
  "storage_path": "uuid-da-partida/uuid-do-clipe.mp4",
  "duration_seconds": 30,
  "label": "Últimos 30s",
  "file_name": "lance-30s.mp4",
  "mime_type": "video/mp4",
  "created_by": "uuid-do-admin"
}
```

O web app lista esses registros no detalhe da partida e usa `storage_path` para gerar o link público de download.
