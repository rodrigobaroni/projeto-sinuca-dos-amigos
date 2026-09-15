import { useState } from "react";

// O índice único de pool_tables (lower(btrim(name))) barra nome duplicado no
// banco - aqui só traduzimos o erro do Postgres (23505) pra mensagem amigável,
// como updatePlayer faz para jogador duplicado.
function isDuplicateTableNameError(error) {
  return error?.code === "23505" || /duplicate key|unique constraint/i.test(error?.message || "");
}

function tableNameErrorMessage(error) {
  return isDuplicateTableNameError(error) ? "Já existe uma mesa com esse nome" : `Erro: ${error.message}`;
}

// CRUD de mesas da noite, reaproveitando a interação do PlayerAdmin (input +
// adicionar, edição inline com Enter/Escape) mais o interruptor de ativa e o
// "Remover" via requestConfirm. Presença não é auditada aqui (é a fila que já
// mostra isso na tela); mesa é fato da noite e entra no log como o resto do
// cadastro.
export function TablesAdmin({ tables, addTable, updateTable, deleteTable, adminUser, auditLog, showToast, requestConfirm }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState("");

  const submit = async () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    try {
      const table = await addTable(cleanName);
      setName("");
      await auditLog?.({
        action: "table_created",
        entityType: "pool_table",
        entityId: table.id,
        message: `${adminUser?.email || "admin"} criou a mesa ${table.name}`,
        metadata: { table },
      });
      showToast(`${table.name} criada`);
    } catch (error) {
      showToast(tableNameErrorMessage(error));
    }
  };

  const startEditing = (table) => {
    setEditingId(table.id);
    setEditingName(table.name);
  };
  const cancelEditing = () => {
    setEditingId("");
    setEditingName("");
  };
  const saveEditing = async (table) => {
    const cleanName = editingName.trim();
    if (!cleanName) return;
    try {
      setSavingId(table.id);
      const updated = await updateTable(table.id, { name: cleanName });
      cancelEditing();
      await auditLog?.({
        action: "table_updated",
        entityType: "pool_table",
        entityId: updated.id,
        message: `${adminUser?.email || "admin"} renomeou a mesa ${table.name} para ${updated.name}`,
        metadata: { table: updated, previousName: table.name },
      });
      showToast(`${updated.name} atualizada`);
    } catch (error) {
      showToast(tableNameErrorMessage(error));
    } finally {
      setSavingId("");
    }
  };

  const toggleActive = async (table) => {
    try {
      const updated = await updateTable(table.id, { active: !table.active });
      await auditLog?.({
        action: "table_updated",
        entityType: "pool_table",
        entityId: updated.id,
        message: `${adminUser?.email || "admin"} ${updated.active ? "ativou" : "desativou"} a mesa ${updated.name}`,
        metadata: { table: updated },
      });
      showToast(updated.active ? `${updated.name} ativada` : `${updated.name} desativada`);
    } catch (error) {
      showToast(`Erro: ${error.message}`);
    }
  };

  const removeTable = async (table) => {
    const confirmed = await requestConfirm?.({
      title: "Remover mesa?",
      message: "As partidas jogadas nessa mesa ficam sem mesa registrada.",
      confirmLabel: "Remover mesa",
    });
    if (!confirmed) return;
    try {
      await deleteTable(table.id);
      await auditLog?.({
        action: "table_deleted",
        entityType: "pool_table",
        entityId: table.id,
        message: `${adminUser?.email || "admin"} removeu a mesa ${table.name}`,
        metadata: { table },
      });
      showToast("Mesa removida");
    } catch (error) {
      showToast(`Erro: ${error.message}`);
    }
  };

  return (
    <div className="card">
      <div className="row2 admin-add-row">
        <input
          className="search no-margin"
          placeholder="nome da mesa"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
        />
        <button className="btn chalk small auto-btn" onClick={submit}>Adicionar</button>
      </div>
      {tables.length ? (
        <div className="player-list">
          {tables.map((table) => {
            const editing = editingId === table.id;
            return (
              <div className={`player-admin-row table-admin-row ${editing ? "editing" : ""}`} key={table.id}>
                {editing ? (
                  <>
                    <input
                      className="search no-margin player-edit-input"
                      value={editingName}
                      autoFocus
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") saveEditing(table);
                        if (event.key === "Escape") cancelEditing();
                      }}
                    />
                    <button className="btn chalk small player-row-action" disabled={savingId === table.id} onClick={() => saveEditing(table)}>{savingId === table.id ? "Salvando..." : "Salvar"}</button>
                    <button className="btn ghost small player-row-action" onClick={cancelEditing}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <div className="player-admin-main">
                      <strong>{table.name}</strong>
                      <span>{table.active ? "mesa ativa" : "mesa inativa"}</span>
                    </div>
                    <button
                      className={`switch ${table.active ? "on" : ""}`}
                      type="button"
                      role="switch"
                      aria-checked={table.active}
                      onClick={() => toggleActive(table)}
                    >
                      <span />
                    </button>
                    <button className="btn ghost small player-row-action" onClick={() => startEditing(table)}>Editar</button>
                    <button className="btn ghost small player-row-action" onClick={() => removeTable(table)}>Remover</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : <div className="muted-text">Cadastre as mesas da noite aqui.</div>}
    </div>
  );
}
